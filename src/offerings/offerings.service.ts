import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { Prisma } from '@prisma/client';
type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

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
  price: Decimal;
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

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new offering
   */
  async create(
    userId: string,
    dto: CreateOfferingDto,
  ): Promise<FormattedOffering> {
    this.logger.log(`Creating offering for user: ${userId}`);

    // Verify category exists
    const categoryRecord = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!categoryRecord) {
      throw new NotFoundException(
        `Category with id ${dto.categoryId} not found`,
      );
    }

    // If subcategoryId is provided, verify it exists and is a child of the category
    if (dto.subcategoryId) {
      const subcategory = await this.prisma.category.findUnique({
        where: { id: dto.subcategoryId },
      });

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

    const offering = await this.prisma.offering.create({
      data: {
        title: dto.title,
        description: dto.description,
        imageUrl: dto.imageUrl || null,
        price: new Decimal(dto.price),
        userId,
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId || null,
        active: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            nickname: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.formatOfferingResponse(offering as OfferingWithRelations);
  }

  /**
   * Find all active offerings
   */
  async findAll(): Promise<FormattedOffering[]> {
    this.logger.log('Fetching all active offerings');

    const offerings = await this.prisma.offering.findMany({
      where: { active: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            nickname: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return (offerings as OfferingWithRelations[]).map((o) =>
      this.formatOfferingResponse(o),
    );
  }

  /**
   * Find offering by ID
   */
  async findOne(id: string): Promise<FormattedOffering> {
    this.logger.log(`Fetching offering with id: ${id}`);

    const offering = await this.prisma.offering.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            nickname: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!offering) {
      throw new NotFoundException(`Offering with id ${id} not found`);
    }

    return this.formatOfferingResponse(offering as OfferingWithRelations);
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

    const offering = await this.prisma.offering.findUnique({
      where: { id },
    });

    if (!offering) {
      throw new NotFoundException(`Offering with id ${id} not found`);
    }

    if (offering.userId !== userId) {
      throw new ForbiddenException('You can only update your own offerings');
    }

    // Validate category if provided
    if (dto.categoryId) {
      const categoryRecord = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!categoryRecord) {
        throw new NotFoundException(
          `Category with id ${dto.categoryId} not found`,
        );
      }
    }

    // Validate subcategory if provided
    if (dto.subcategoryId) {
      const subcategory = await this.prisma.category.findUnique({
        where: { id: dto.subcategoryId },
      });
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

    const updated = await this.prisma.offering.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.price !== undefined && { price: new Decimal(dto.price) }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.subcategoryId !== undefined && {
          subcategoryId: dto.subcategoryId,
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            nickname: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.formatOfferingResponse(updated as OfferingWithRelations);
  }

  /**
   * Soft delete (deactivate) an offering
   */
  async deactivate(id: string, userId: string): Promise<{ message: string }> {
    this.logger.log(`Deactivating offering ${id} by user ${userId}`);

    const offering = await this.prisma.offering.findUnique({
      where: { id },
    });

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

    await this.prisma.offering.update({
      where: { id },
      data: { active: false },
    });

    return { message: 'Offering deactivated successfully' };
  }

  /**
   * Find offerings by category
   */
  async findByCategory(categoryId: string): Promise<FormattedOffering[]> {
    this.logger.log(`Fetching offerings for category: ${categoryId}`);

    const offerings = await this.prisma.offering.findMany({
      where: {
        categoryId,
        active: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            nickname: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return (offerings as OfferingWithRelations[]).map((o) =>
      this.formatOfferingResponse(o),
    );
  }

  /**
   * Find offerings by subcategory
   */
  async findBySubcategory(subcategoryId: string): Promise<FormattedOffering[]> {
    this.logger.log(`Fetching offerings for subcategory: ${subcategoryId}`);

    const offerings = await this.prisma.offering.findMany({
      where: {
        subcategoryId,
        active: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            nickname: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return (offerings as OfferingWithRelations[]).map((o) =>
      this.formatOfferingResponse(o),
    );
  }

  /**
   * Request contact information for an offering
   */
  async requestContact(offeringId: string, requesterId: string) {
    this.logger.log(
      `User ${requesterId} requesting contact for offering ${offeringId}`,
    );

    const offering = await this.prisma.offering.findUnique({
      where: { id: offeringId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            nickname: true,
            cellphone: true,
          },
        },
      },
    });

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
    const existingContact = await this.prisma.offeringcontact.findFirst({
      where: {
        offeringId,
        requesterId,
      },
    });

    let contactRecord;
    if (existingContact) {
      contactRecord = existingContact;
    } else {
      // Create new contact request
      contactRecord = await this.prisma.offeringcontact.create({
        data: {
          offeringId,
          requesterId,
        },
      });
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
        id: offering.user.id,
        email: offering.user.email,
        name: offering.user.name,
        nickname: offering.user.nickname,
        cellphone: offering.user.cellphone,
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
