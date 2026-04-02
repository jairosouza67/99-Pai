import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { ServiceRequestStatus } from '@prisma/client';

export interface ConflictValidationResult {
  valid: boolean;
  conflicts: string[];
}

export interface ServiceRequestCreateResult {
  success: boolean;
  data?: any;
  conflicts?: string[];
}

@Injectable()
export class ServiceRequestsService {
  private readonly logger = new Logger(ServiceRequestsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parse "HH:mm" time string to total minutes since midnight
   */
  private parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Check if two times are within the given threshold in minutes
   */
  private isTimeConflict(
    time1: string,
    time2: string,
    thresholdMinutes: number,
  ): boolean {
    const minutes1 = this.parseTimeToMinutes(time1);
    const minutes2 = this.parseTimeToMinutes(time2);
    const diff = Math.abs(minutes1 - minutes2);
    return diff <= thresholdMinutes;
  }

  /**
   * Format DateTime to "HH:mm" string
   */
  private formatTimeFromDate(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Validate conflicts with medications and agenda events
   */
  async validateConflicts(
    elderlyProfileId: string,
    requestedDateTime: Date,
  ): Promise<ConflictValidationResult> {
    const conflicts: string[] = [];
    const requestedTime = this.formatTimeFromDate(requestedDateTime);

    // 1. Check medication schedule conflicts (30-min window)
    const activeMedications = await this.prisma.medication.findMany({
      where: {
        elderlyProfileId,
        active: true,
      },
    });

    for (const med of activeMedications) {
      if (this.isTimeConflict(requestedTime, med.time, 30)) {
        conflicts.push(
          `Conflito com medicamento "${med.name}" \u00e0s ${med.time}`,
        );
      }
    }

    // 2. Check agenda event conflicts (1-hour window = 60 minutes)
    const oneHourMs = 60 * 60 * 1000;
    const windowStart = new Date(requestedDateTime.getTime() - oneHourMs);
    const windowEnd = new Date(requestedDateTime.getTime() + oneHourMs);

    const agendaEvents = await this.prisma.agendaevent.findMany({
      where: {
        elderlyProfileId,
        dateTime: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
    });

    for (const event of agendaEvents) {
      const eventTime = this.formatTimeFromDate(event.dateTime);
      conflicts.push(
        `Conflito com evento "${event.description}" \u00e0s ${eventTime}`,
      );
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
    };
  }

  /**
   * Create a new service request
   */
  async create(
    elderlyProfileId: string,
    dto: CreateServiceRequestDto,
  ): Promise<ServiceRequestCreateResult> {
    this.logger.log(
      `Creating service request for elderly profile: ${elderlyProfileId}`,
    );

    // If requestedDateTime is provided, validate for conflicts
    if (dto.requestedDateTime) {
      const requestedDate = new Date(dto.requestedDateTime);
      const validation = await this.validateConflicts(
        elderlyProfileId,
        requestedDate,
      );

      if (!validation.valid) {
        this.logger.warn(
          `Conflicts found for service request: ${validation.conflicts.join(', ')}`,
        );
        return {
          success: false,
          conflicts: validation.conflicts,
        };
      }
    }

    // Verify offering exists and is active
    const offering = await this.prisma.offering.findUnique({
      where: { id: dto.offeringId },
    });

    if (!offering) {
      throw new NotFoundException(
        `Offering with id ${dto.offeringId} not found`,
      );
    }

    if (!offering.active) {
      throw new BadRequestException('Cannot request an inactive offering');
    }

    // Create the service request
    const serviceRequest = await this.prisma.servicerequest.create({
      data: {
        elderlyProfileId,
        offeringId: dto.offeringId,
        requestedDateTime: dto.requestedDateTime
          ? new Date(dto.requestedDateTime)
          : null,
        notes: dto.notes || null,
        status: ServiceRequestStatus.pending,
      },
    });

    this.logger.log(`Service request created: ${serviceRequest.id}`);

    return {
      success: true,
      data: serviceRequest,
    };
  }

  /**
   * Find all service requests for an elderly profile
   */
  async findByElderly(elderlyProfileId: string) {
    this.logger.log(
      `Fetching service requests for elderly profile: ${elderlyProfileId}`,
    );

    const serviceRequests = await this.prisma.servicerequest.findMany({
      where: { elderlyProfileId },
      orderBy: { createdAt: 'desc' },
    });

    return { items: serviceRequests };
  }

  /**
   * Cancel a service request
   */
  async cancel(id: string, elderlyProfileId: string) {
    this.logger.log(`Cancelling service request: ${id}`);

    const serviceRequest = await this.prisma.servicerequest.findUnique({
      where: { id },
    });

    if (!serviceRequest) {
      throw new NotFoundException(`Service request with id ${id} not found`);
    }

    if (serviceRequest.elderlyProfileId !== elderlyProfileId) {
      throw new ForbiddenException(
        'You can only cancel your own service requests',
      );
    }

    if (serviceRequest.status !== ServiceRequestStatus.pending) {
      throw new BadRequestException(
        'Only pending service requests can be cancelled',
      );
    }

    const updated = await this.prisma.servicerequest.update({
      where: { id },
      data: { status: ServiceRequestStatus.cancelled },
    });

    this.logger.log(`Service request cancelled: ${id}`);

    return updated;
  }
}
