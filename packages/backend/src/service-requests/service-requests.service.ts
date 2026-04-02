import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';

export enum ServiceRequestStatus {
  pending = 'pending',
  confirmed = 'confirmed',
  completed = 'completed',
  cancelled = 'cancelled',
}

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

  constructor(private readonly supabase: SupabaseService) {}

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
    const { data: activeMedications, error: medError } = await this.supabase.db
      .from('medication')
      .select('name, time')
      .eq('elderlyProfileId', elderlyProfileId)
      .eq('active', true);
      
    if (medError) throw new InternalServerErrorException(medError.message);

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

    const { data: agendaEvents, error: agendaError } = await this.supabase.db
      .from('agendaevent')
      .select('description, dateTime')
      .eq('elderlyProfileId', elderlyProfileId)
      .gte('dateTime', windowStart.toISOString())
      .lte('dateTime', windowEnd.toISOString());

    if (agendaError) throw new InternalServerErrorException(agendaError.message);

    for (const event of agendaEvents || []) {
      const eventTime = this.formatTimeFromDate(new Date(event.dateTime));
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
    const { data: offering, error: offeringError } = await this.supabase.db
      .from('offering')
      .select('id, active')
      .eq('id', dto.offeringId)
      .single();

    if (offeringError && offeringError.code !== 'PGRST116') {
      throw new InternalServerErrorException(offeringError.message);
    }

    if (!offering) {
      throw new NotFoundException(
        `Offering with id ${dto.offeringId} not found`,
      );
    }

    if (!offering.active) {
      throw new BadRequestException('Cannot request an inactive offering');
    }

    // Create the service request
    const { data: serviceRequest, error: insertError } = await this.supabase.db
      .from('servicerequest')
      .insert({
        elderlyProfileId,
        offeringId: dto.offeringId,
        requestedDateTime: dto.requestedDateTime
          ? new Date(dto.requestedDateTime).toISOString()
          : null,
        notes: dto.notes || null,
        status: ServiceRequestStatus.pending,
      })
      .select()
      .single();

    if (insertError) throw new InternalServerErrorException(insertError.message);

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

    const { data: serviceRequests, error } = await this.supabase.db
      .from('servicerequest')
      .select('*')
      .eq('elderlyProfileId', elderlyProfileId)
      .order('createdAt', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);

    return { items: serviceRequests };
  }

  /**
   * Cancel a service request
   */
  async cancel(id: string, elderlyProfileId: string) {
    this.logger.log(`Cancelling service request: ${id}`);

    const { data: serviceRequest, error } = await this.supabase.db
      .from('servicerequest')
      .select('id, elderlyProfileId, status')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw new InternalServerErrorException(error.message);

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

    const { data: updated, error: updateError } = await this.supabase.db
      .from('servicerequest')
      .update({ status: ServiceRequestStatus.cancelled })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw new InternalServerErrorException(updateError.message);

    this.logger.log(`Service request cancelled: ${id}`);

    return updated;
  }
}
