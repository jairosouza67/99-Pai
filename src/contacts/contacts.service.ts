import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CaregiverService } from '../caregiver/caregiver.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { Role } from '@prisma/client';
import { differenceInDays } from 'date-fns';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private prisma: PrismaService,
    private caregiverService: CaregiverService,
  ) {}

  async getContacts(userId: string, elderlyProfileId: string) {
    const hasAccess = await this.caregiverService.verifyAccess(
      userId,
      elderlyProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const contacts = await this.prisma.contact.findMany({
      where: { elderlyProfileId },
      orderBy: { name: 'asc' },
    });

    return { items: contacts };
  }

  async createContact(
    userId: string,
    elderlyProfileId: string,
    createDto: CreateContactDto,
  ) {
    const hasAccess = await this.caregiverService.verifyAccess(
      userId,
      elderlyProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const contact = await this.prisma.contact.create({
      data: {
        elderlyProfileId,
        ...createDto,
      },
    });

    this.logger.log(
      `Contact created for elderly profile ${elderlyProfileId}: ${contact.name}`,
    );

    return contact;
  }

  async updateContact(
    userId: string,
    elderlyProfileId: string,
    contactId: string,
    updateDto: UpdateContactDto,
  ) {
    const hasAccess = await this.caregiverService.verifyAccess(
      userId,
      elderlyProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, elderlyProfileId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const updated = await this.prisma.contact.update({
      where: { id: contactId },
      data: updateDto,
    });

    this.logger.log(`Contact updated: ${contactId}`);

    return updated;
  }

  async deleteContact(
    userId: string,
    elderlyProfileId: string,
    contactId: string,
  ) {
    const hasAccess = await this.caregiverService.verifyAccess(
      userId,
      elderlyProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, elderlyProfileId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    await this.prisma.contact.delete({ where: { id: contactId } });

    this.logger.log(`Contact deleted: ${contactId}`);

    return { success: true };
  }

  async getContactsForElderly(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { elderlyProfile: true },
    });

    if (!user || user.role !== Role.elderly || !user.elderlyProfile) {
      throw new ForbiddenException(
        'Only elderly users can access this endpoint',
      );
    }

    const contacts = await this.prisma.contact.findMany({
      where: { elderlyProfileId: user.elderlyProfile.id },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    const items = contacts.map((contact: (typeof contacts)[number]) => {
      const daysOverdue = contact.lastCallAt
        ? differenceInDays(now, contact.lastCallAt) - contact.thresholdDays
        : 999;

      return {
        ...contact,
        daysOverdue: Math.max(0, daysOverdue),
        isOverdue: daysOverdue > 0,
      };
    });

    return { items };
  }

  async markCalled(userId: string, contactId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { elderlyProfile: true },
    });

    if (!user || user.role !== Role.elderly || !user.elderlyProfile) {
      throw new ForbiddenException(
        'Only elderly users can access this endpoint',
      );
    }

    const elderlyProfileId = user.elderlyProfile.id;

    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, elderlyProfileId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const now = new Date();
    const updated = await this.prisma.contact.update({
      where: { id: contactId },
      data: { lastCallAt: now },
    });

    // Log call history
    await this.prisma.callhistory.create({
      data: {
        elderlyProfileId,
        contactId,
        calledAt: now,
      },
    });

    this.logger.log(`Call logged for contact: ${contactId}`);

    return {
      id: updated.id,
      lastCallAt: updated.lastCallAt,
    };
  }

  async getCallHistory(
    userId: string,
    elderlyProfileId: string,
    page = 1,
    limit = 50,
  ) {
    const hasAccess = await this.caregiverService.verifyAccess(
      userId,
      elderlyProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.callhistory.findMany({
        where: { elderlyProfileId },
        include: { contact: true },
        orderBy: { calledAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.callhistory.count({ where: { elderlyProfileId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map((h: (typeof items)[number]) => ({
        id: h.id,
        contactId: h.contactId,
        contactName: h.contact.name,
        calledAt: h.calledAt,
      })),
      total,
      page,
      totalPages,
    };
  }
}
