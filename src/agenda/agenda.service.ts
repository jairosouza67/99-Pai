import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CaregiverService } from '../caregiver/caregiver.service';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import { Role } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class AgendaService {
  private readonly logger = new Logger(AgendaService.name);

  constructor(
    private prisma: PrismaService,
    private caregiverService: CaregiverService,
  ) {}

  async getAgenda(
    userId: string,
    elderlyProfileId: string,
    from?: string,
    to?: string,
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
      where.dateTime = {};
      if (from) where.dateTime.gte = new Date(from);
      if (to) where.dateTime.lte = new Date(to);
    }

    const items = await this.prisma.agendaevent.findMany({
      where,
      orderBy: { dateTime: 'asc' },
    });

    return { items };
  }

  async createAgenda(
    userId: string,
    elderlyProfileId: string,
    createDto: CreateAgendaDto,
  ) {
    const hasAccess = await this.caregiverService.verifyAccess(
      userId,
      elderlyProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const agenda = await this.prisma.agendaevent.create({
      data: {
        elderlyProfileId,
        description: createDto.description,
        dateTime: new Date(createDto.dateTime),
        reminder: createDto.reminder ?? true,
      },
    });

    this.logger.log(
      `Agenda event created for elderly profile ${elderlyProfileId}: ${agenda.description}`,
    );

    return agenda;
  }

  async updateAgenda(
    userId: string,
    elderlyProfileId: string,
    agendaId: string,
    updateDto: UpdateAgendaDto,
  ) {
    const hasAccess = await this.caregiverService.verifyAccess(
      userId,
      elderlyProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const agenda = await this.prisma.agendaevent.findFirst({
      where: { id: agendaId, elderlyProfileId },
    });

    if (!agenda) {
      throw new NotFoundException('Agenda event not found');
    }

    const data: any = {};
    if (updateDto.description !== undefined)
      data.description = updateDto.description;
    if (updateDto.dateTime !== undefined)
      data.dateTime = new Date(updateDto.dateTime);
    if (updateDto.reminder !== undefined) data.reminder = updateDto.reminder;

    const updated = await this.prisma.agendaevent.update({
      where: { id: agendaId },
      data,
    });

    this.logger.log(`Agenda event updated: ${agendaId}`);

    return updated;
  }

  async deleteAgenda(
    userId: string,
    elderlyProfileId: string,
    agendaId: string,
  ) {
    const hasAccess = await this.caregiverService.verifyAccess(
      userId,
      elderlyProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const agenda = await this.prisma.agendaevent.findFirst({
      where: { id: agendaId, elderlyProfileId },
    });

    if (!agenda) {
      throw new NotFoundException('Agenda event not found');
    }

    await this.prisma.agendaevent.delete({ where: { id: agendaId } });

    this.logger.log(`Agenda event deleted: ${agendaId}`);

    return { success: true };
  }

  async getTodayAgenda(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { elderlyProfile: true },
    });

    if (!user || user.role !== Role.elderly || !user.elderlyProfile) {
      throw new ForbiddenException(
        'Only elderly users can access this endpoint',
      );
    }

    const today = new Date();
    const items = await this.prisma.agendaevent.findMany({
      where: {
        elderlyProfileId: user.elderlyProfile.id,
        dateTime: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
      },
      orderBy: { dateTime: 'asc' },
    });

    return { items };
  }
}
