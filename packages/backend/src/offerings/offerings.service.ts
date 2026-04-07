import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';

export interface OfferingUser {
  id: string;
  email: string;
  name: string;
  nickname: string | null;
}

export interface OfferingCategory {
  id: string;
  name: string;
}

export interface OfferingWithRelations {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  price: number;
  active: boolean;
  userId: string;
  categoryId: string;
  subcategoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: OfferingUser;
  category: OfferingCategory;
  subcategory: OfferingCategory | null;
}

export interface FormattedOffering {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  price: number;
  active: boolean;
  userId: string;
  categoryId: string;
  subcategoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: OfferingUser;
  category: OfferingCategory;
  subcategory: OfferingCategory | null;
}

@Injectable()
export class OfferingsService {
  private readonly logger = new Logger(OfferingsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Create a new offering
   */
  async create(
    userId: string,
    dto: CreateOfferingDto,
  ): Promise<FormattedOffering> {
    this.logger.log(`Creating offering for user: ${userId}`);

    // Verify category exists
    const { data: categoryRecord } = await this.supabase.db
      .from('category')
      .select('id, parentId')
      .eq('id', dto.categoryId)
      .single();

    if (!categoryRecord) {
      throw new NotFoundException(
        `Category with id ${dto.categoryId} not found`,
      );
    }

    // If subcategoryId is provided, verify it exists and is a child of the category
    if (dto.subcategoryId) {
      const { data: subcategory } = await this.supabase.db
        .from('category')
        .select('id, parentId')
        .eq('id', dto.subcategoryId)
        .single();

      if (!subcategory) {
        throw new NotFoundException(
          `Subcategory with id ${dto.subcategoryId} not found`,
        );
      }

      if (subcategory.parentId !== dto.categoryId) {
        throw new BadRequestException(
          `Subcategory ${dto.subcategoryId} is not a child of category ${dto.categoryId}`,
        );
      }
    }

    const { data: offering, error } = await this.supabase.db
      .from('offering')
      .insert({
        title: dto.title,
        description: dto.description,
        imageUrl: dto.imageUrl || null,
        price: dto.price,
        userId,
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId || null,
        active: true,
      })
      .select('*, user:userId(id, email, name, nickname), category:categoryId(id, name), subcategory:subcategoryId(id, name)')
      .single();

    if (error) throw new InternalServerErrorException(error.message);

    return this.formatOfferingResponse(offering as any);
  }

  /**
   * Find all active offerings
   */
  async findAll(): Promise<FormattedOffering[]> {
    this.logger.log('Fetching all active offerings');

    const { data: offerings, error } = await this.supabase.db
      .from('offering')
      .select('*, user:userId(id, email, name, nickname), category:categoryId(id, name), subcategory:subcategoryId(id, name)')
      .eq('active', true)
      .order('createdAt', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);

    return (offerings || []).map((o: any) =>
      this.formatOfferingResponse(o as any),
    );
  }

  /**
   * Find offering by ID
   */
  async findOne(id: string): Promise<FormattedOffering> {
    this.logger.log(`Fetching offering with id: ${id}`);

    const { data: offering, error } = await this.supabase.db
      .from('offering')
      .select('*, user:userId(id, email, name, nickname), category:categoryId(id, name), subcategory:subcategoryId(id, name)')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw new InternalServerErrorException(error.message);

    if (!offering) {
      throw new NotFoundException(`Offering with id ${id} not found`);
    }

    return this.formatOfferingResponse(offering as any);
  }

  /**
   * Update an offering (verify ownership)
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateOfferingDto,
  ): Promise<FormattedOffering> {
    this.logger.log(`Updating offering ${id} by user ${userId}`);

    const { data: offering } = await this.supabase.db
      .from('offering')
      .select('*')
      .eq('id', id)
      .single();

    if (!offering) {
      throw new NotFoundException(`Offering with id ${id} not found`);
    }

    if (offering.userId !== userId) {
      throw new ForbiddenException('You can only update your own offerings');
    }

    // Validate category if provided
    if (dto.categoryId) {
      const { data: categoryRecord } = await this.supabase.db
        .from('category')
        .select('id')
        .eq('id', dto.categoryId)
        .single();
      if (!categoryRecord) {
        throw new NotFoundException(
          `Category with id ${dto.categoryId} not found`,
        );
      }
    }

    // Validate subcategory if provided
    if (dto.subcategoryId) {
      const { data: subcategory } = await this.supabase.db
        .from('category')
        .select('id, parentId')
        .eq('id', dto.subcategoryId)
        .single();
      if (!subcategory) {
        throw new NotFoundException(
          `Subcategory with id ${dto.subcategoryId} not found`,
        );
      }
      const parentCategoryId = dto.categoryId || offering.categoryId;
      if (subcategory.parentId !== parentCategoryId) {
        throw new BadRequestException(
          `Subcategory ${dto.subcategoryId} is not a child of category ${parentCategoryId}`,
        );
      }
    }

    const { data: updated, error } = await this.supabase.db
      .from('offering')
      .update({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.subcategoryId !== undefined && {
          subcategoryId: dto.subcategoryId,
        }),
      })
      .eq('id', id)
      .select('*, user:userId(id, email, name, nickname), category:categoryId(id, name), subcategory:subcategoryId(id, name)')
      .single();
      
    if (error) throw new InternalServerErrorException(error.message);

    return this.formatOfferingResponse(updated as any);
  }

  /**
   * Soft delete (deactivate) an offering
   */
  async deactivate(id: string, userId: string): Promise<{ message: string }> {
    this.logger.log(`Deactivating offering ${id} by user ${userId}`);

    const { data: offering } = await this.supabase.db
      .from('offering')
      .select('id, userId, active')
      .eq('id', id)
      .single();

    if (!offering) {
      throw new NotFoundException(`Offering with id ${id} not found`);
    }

    if (offering.userId !== userId) {
      throw new ForbiddenException(
        'You can only deactivate your own offerings',
      );
    }

    if (!offering.active) {
      throw new BadRequestException('Offering is already deactivated');
    }

    const { error } = await this.supabase.db
      .from('offering')
      .update({ active: false })
      .eq('id', id);
      
    if (error) throw new InternalServerErrorException(error.message);

    return { message: 'Offering deactivated successfully' };
  }

  /**
   * Find offerings by category
   */
  async findByCategory(categoryId: string): Promise<FormattedOffering[]> {
    this.logger.log(`Fetching offerings for category: ${categoryId}`);

    const { data: offerings, error } = await this.supabase.db
      .from('offering')
      .select('*, user:userId(id, email, name, nickname), category:categoryId(id, name), subcategory:subcategoryId(id, name)')
      .eq('categoryId', categoryId)
      .eq('active', true)
      .order('createdAt', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);

    return (offerings || []).map((o: any) =>
      this.formatOfferingResponse(o as any),
    );
  }

  /**
   * Find offerings by subcategory
   */
  async findBySubcategory(subcategoryId: string): Promise<FormattedOffering[]> {
    this.logger.log(`Fetching offerings for subcategory: ${subcategoryId}`);

    const { data: offerings, error } = await this.supabase.db
      .from('offering')
      .select('*, user:userId(id, email, name, nickname), category:categoryId(id, name), subcategory:subcategoryId(id, name)')
      .eq('subcategoryId', subcategoryId)
      .eq('active', true)
      .order('createdAt', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);

    return (offerings || []).map((o: any) =>
      this.formatOfferingResponse(o as any),
    );
  }

  /**
   * Request contact information for an offering
   */
  async requestContact(offeringId: string, requesterId: string) {
    this.logger.log(
      `User ${requesterId} requesting contact for offering ${offeringId}`,
    );

    const { data: offering, error } = await this.supabase.db
      .from('offering')
      .select('*, user:userId(id, email, name, nickname, cellphone)')
      .eq('id', offeringId)
      .single();

    if (error && error.code !== 'PGRST116') throw new InternalServerErrorException(error.message);

    if (!offering) {
      throw new NotFoundException(`Offering with id ${offeringId} not found`);
    }

    if (!offering.active) {
      throw new BadRequestException(
        'Cannot request contact for inactive offering',
      );
    }

    if (offering.userId === requesterId) {
      throw new BadRequestException(
        'You cannot request contact for your own offering',
      );
    }

    // Check if contact already exists
    const { data: existingContact } = await this.supabase.db
      .from('offeringcontact')
      .select('*')
      .eq('offeringId', offeringId)
      .eq('requesterId', requesterId)
      .maybeSingle();

    let contactRecord;
    if (existingContact) {
      contactRecord = existingContact;
    } else {
      // Create new contact request
      const { data: newContact, error: insertError } = await this.supabase.db
        .from('offeringcontact')
        .insert({
          offeringId,
          requesterId,
        })
        .select()
        .single();
        
      if (insertError) throw new InternalServerErrorException(insertError.message);
      contactRecord = newContact;
    }

    return {
      id: contactRecord.id,
      offering: {
        id: offering.id,
        title: offering.title,
        description: offering.description,
        price: Number(offering.price),
      },
      provider: {
        id: (offering.user as any).id,
        email: (offering.user as any).email,
        name: (offering.user as any).name,
        nickname: (offering.user as any).nickname,
        cellphone: (offering.user as any).cellphone,
      },
      requestedAt: contactRecord.createdAt,
    };
  }

  /**
   * Format offering response to convert Decimal to number
   */
  private formatOfferingResponse(
    offering: OfferingWithRelations,
  ): FormattedOffering {
    return {
      ...offering,
      price: Number(offering.price),
    };
  }
}
