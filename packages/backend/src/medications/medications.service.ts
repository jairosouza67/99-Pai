import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CaregiverService } from '../caregiver/caregiver.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { ConfirmMedicationDto } from './dto/confirm-medication.dto';
import { Role } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class MedicationsService {
  private readonly logger = new Logger(MedicationsService.name);

  constructor(
    private prisma: PrismaService,
    private caregiverService: CaregiverService,
  ) {}

  async getMedications(userId: string, elderlyProfileId: string) {
    const hasAccess = await this.caregiverService.verifyAccess(
      userId,
      elderlyProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const medications = await this.prisma.medication.findMany({
      where: { elderlyProfileId },
      orderBy: { time: 'asc' },
    });

    return { items: medications };
  }

  async createMedication(
    userId: string,
    elderlyProfileId: string,
    createDto: CreateMedicationDto,
  ) {
    const hasAccess = await this.caregiverService.verifyAccess(
      userId,
      elderlyProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const medication = await this.prisma.medication.create({
      data: {
        elderlyProfileId,
        ...createDto,
      },
    });

    this.logger.log(
      `Medication created for elderly profile ${elderlyProfileId}: ${medication.name}`,
    );

    return medication;
  }

  async updateMedication(
    userId: string,
    elderlyProfileId: string,
    medicationId: string,
    updateDto: UpdateMedicationDto,
  ) {
    const hasAccess = await this.caregiverService.verifyAccess(
      userId,
      elderlyProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const medication = await this.prisma.medication.findFirst({
      where: { id: medicationId, elderlyProfileId },
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    const updated = await this.prisma.medication.update({
      where: { id: medicationId },
      data: updateDto,
    });

    this.logger.log(`Medication updated: ${medicationId}`);

    return updated;
  }

  async deleteMedication(
    userId: string,
    elderlyProfileId: string,
    medicationId: string,
  ) {
    const hasAccess = await this.caregiverService.verifyAccess(
      userId,
      elderlyProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const medication = await this.prisma.medication.findFirst({
      where: { id: medicationId, elderlyProfileId },
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    await this.prisma.medication.delete({ where: { id: medicationId } });

    this.logger.log(`Medication deleted: ${medicationId}`);

    return { success: true };
  }

  async getTodayMedications(userId: string) {
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

    const medications = await this.prisma.medication.findMany({
      where: { elderlyProfileId, active: true },
      orderBy: { time: 'asc' },
    });

    const today = new Date();
    const histories = await this.prisma.medicationhistory.findMany({
      where: {
        elderlyProfileId,
        scheduledDate: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
      },
    });

    const items = medications.map((med: (typeof medications)[number]) => {
      const history = histories.find(
        (h: (typeof histories)[number]) => h.medicationId === med.id,
      );
      let status: 'pending' | 'confirmed' | 'missed' = 'pending';

      if (history) {
        status = history.confirmed ? 'confirmed' : 'missed';
      }

      return {
        id: med.id,
        name: med.name,
        time: med.time,
        dosage: med.dosage,
        status,
        historyId: history?.id || null,
      };
    });

    return { items };
  }

  async confirmMedication(
    userId: string,
    medicationId: string,
    confirmDto: ConfirmMedicationDto,
  ) {
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

    const medication = await this.prisma.medication.findFirst({
      where: { id: medicationId, elderlyProfileId },
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    const now = new Date();
    const scheduledDate = startOfDay(now);

    // Check if already confirmed today
    const existing = await this.prisma.medicationhistory.findFirst({
      where: {
        elderlyProfileId,
        medicationId,
        scheduledDate: {
          gte: startOfDay(now),
          lte: endOfDay(now),
        },
      },
    });

    let history;
    if (existing) {
      history = await this.prisma.medicationhistory.update({
        where: { id: existing.id },
        data: {
          confirmed: confirmDto.confirmed,
          respondedAt: now,
        },
      });
    } else {
      history = await this.prisma.medicationhistory.create({
        data: {
          elderlyProfileId,
          medicationId,
          confirmed: confirmDto.confirmed,
          scheduledDate,
          respondedAt: now,
        },
      });
    }

    this.logger.log(
      `Medication ${confirmDto.confirmed ? 'confirmed' : 'marked as missed'}: ${medicationId}`,
    );

    return {
      id: history.id,
      medicationId: history.medicationId,
      confirmed: history.confirmed,
      timestamp: history.respondedAt,
    };
  }

  async getMedicationHistory(
    userId: string,
    elderlyProfileId: string,
    from?: string,
    to?: string,
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

    const where: any = { elderlyProfileId };

    if (from || to) {
      where.scheduledDate = {};
      if (from) where.scheduledDate.gte = new Date(from);
      if (to) where.scheduledDate.lte = new Date(to);
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.medicationhistory.findMany({
        where,
        include: {
          medication: true,
        },
        orderBy: { scheduledDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.medicationhistory.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map((h: (typeof items)[number]) => ({
        id: h.id,
        medicationId: h.medicationId,
        medicationName: h.medication.name,
        confirmed: h.confirmed,
        timestamp: h.respondedAt || h.createdAt,
      })),
      total,
      page,
      totalPages,
    };
  }
}
