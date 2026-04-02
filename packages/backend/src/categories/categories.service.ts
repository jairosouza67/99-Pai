import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Find all root categories (where parentId is null) with subcategories included
   */
  async findAll() {
    this.logger.log('Fetching all root categories');
    const { data, error } = await this.supabase.db
      .from('category')
      .select('*, subcategories:category(*, subcategories:category(*))')
      .is('parentId', null)
      .order('name', { ascending: true });
      
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /**
   * Find a category by ID with subcategories included
   */
  async findOne(id: string) {
    this.logger.log(`Fetching category with id: ${id}`);
    const { data: category, error } = await this.supabase.db
      .from('category')
      .select('*, parent:category(*), subcategories:category(*, subcategories:category(*))')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new BadRequestException(error.message);
    }

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    return category;
  }

  /**
   * Create a new category
   */
  async create(dto: CreateCategoryDto) {
    this.logger.log(`Creating category: ${dto.name}`);

    // If parentId is provided, verify the parent exists
    if (dto.parentId) {
      const { data: parent } = await this.supabase.db
        .from('category')
        .select('id')
        .eq('id', dto.parentId)
        .single();
        
      if (!parent) {
        throw new NotFoundException(
          `Parent category with id ${dto.parentId} not found`,
        );
      }
    }

    const { data, error } = await this.supabase.db
      .from('category')
      .insert({
        name: dto.name,
        parentId: dto.parentId || null,
      })
      .select('*, parent:category(*), subcategories:category(*)')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /**
   * Update a category's name or parent
   */
  async update(id: string, dto: UpdateCategoryDto) {
    this.logger.log(`Updating category with id: ${id}`);

    // Verify category exists
    const { data: existing } = await this.supabase.db
      .from('category')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    // If updating parentId, verify the new parent exists and prevent circular reference
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }

      if (dto.parentId !== null) {
        const { data: parent } = await this.supabase.db
          .from('category')
          .select('id')
          .eq('id', dto.parentId)
          .single();
          
        if (!parent) {
          throw new NotFoundException(
            `Parent category with id ${dto.parentId} not found`,
          );
        }
      }
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.parentId !== undefined) updateData.parentId = dto.parentId;

    const { data, error } = await this.supabase.db
      .from('category')
      .update(updateData)
      .eq('id', id)
      .select('*, parent:category(*), subcategories:category(*)')
      .single();
      
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  /**
   * Delete a category (ensure no child categories or offerings reference it)
   */
  async remove(id: string) {
    this.logger.log(`Deleting category with id: ${id}`);

    // Verify category exists
    const { data: category } = await this.supabase.db
      .from('category')
      .select(`
        id,
        subcategories:category(id),
        offerings:offering!categoryId(id),
        subofferings:offering!subCategoryId(id)
      `)
      .eq('id', id)
      .single();

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    const subcategoriesCount = category.subcategories ? (Array.isArray(category.subcategories) ? category.subcategories.length : 1) : 0;
    // Check for child categories
    if (subcategoriesCount > 0) {
      throw new BadRequestException(
        `Cannot delete category: it has ${subcategoriesCount} subcategories`,
      );
    }

    const offeringsCount = category.offerings ? (Array.isArray(category.offerings) ? category.offerings.length : 1) : 0;
    const subOfferingsCount = category.subofferings ? (Array.isArray(category.subofferings) ? category.subofferings.length : 1) : 0;
    const totalOfferings = offeringsCount + subOfferingsCount;

    // Check for offerings referencing this category
    if (totalOfferings > 0) {
      throw new BadRequestException(
        `Cannot delete category: it is referenced by ${totalOfferings} offerings`,
      );
    }

    const { error } = await this.supabase.db
      .from('category')
      .delete()
      .eq('id', id);
      
    if (error) throw new BadRequestException(error.message);

    return { message: 'Category deleted successfully' };
  }
}
