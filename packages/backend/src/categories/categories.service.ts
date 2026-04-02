import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all root categories (where parentId is null) with subcategories included
   */
  async findAll() {
    this.logger.log('Fetching all root categories');
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        subcategories: {
          include: {
            subcategories: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find a category by ID with subcategories included
   */
  async findOne(id: string) {
    this.logger.log(`Fetching category with id: ${id}`);
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        subcategories: {
          include: {
            subcategories: true,
          },
        },
        parent: true,
      },
    });

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
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent category with id ${dto.parentId} not found`,
        );
      }
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        parentId: dto.parentId || null,
      },
      include: {
        subcategories: true,
        parent: true,
      },
    });
  }

  /**
   * Update a category's name or parent
   */
  async update(id: string, dto: UpdateCategoryDto) {
    this.logger.log(`Updating category with id: ${id}`);

    // Verify category exists
    const existing = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    // If updating parentId, verify the new parent exists and prevent circular reference
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }

      if (dto.parentId !== null) {
        const parent = await this.prisma.category.findUnique({
          where: { id: dto.parentId },
        });
        if (!parent) {
          throw new NotFoundException(
            `Parent category with id ${dto.parentId} not found`,
          );
        }
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
      include: {
        subcategories: true,
        parent: true,
      },
    });
  }

  /**
   * Delete a category (ensure no child categories or offerings reference it)
   */
  async remove(id: string) {
    this.logger.log(`Deleting category with id: ${id}`);

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        subcategories: true,
        offerings: true,
        subOfferings: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    // Check for child categories
    if (category.subcategories.length > 0) {
      throw new BadRequestException(
        `Cannot delete category: it has ${category.subcategories.length} subcategories`,
      );
    }

    // Check for offerings referencing this category
    if (category.offerings.length > 0 || category.subOfferings.length > 0) {
      const totalOfferings =
        category.offerings.length + category.subOfferings.length;
      throw new BadRequestException(
        `Cannot delete category: it is referenced by ${totalOfferings} offerings`,
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return { message: 'Category deleted successfully' };
  }
}
