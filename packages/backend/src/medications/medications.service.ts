import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CaregiverService } from '../caregiver/caregiver.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { ConfirmMedicationDto } from './dto/confirm-medication.dto';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class MedicationsService {
  private readonly logger = new Logger(MedicationsService.name);

  constructor(
    private supabase: SupabaseService,
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

    const { data: medications, error } = await this.supabase.db
      .from('medication')
      .select('*')
      .eq('elderlyProfileId', elderlyProfileId)
      .order('time', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);

    return { items: medications || [] };
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

    const { data: medication, error } = await this.supabase.db
      .from('medication')
      .insert({
        elderlyProfileId,
        active: true, // Defaulting if not in createDto
        ...createDto,
      })
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);

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

    const { data: medication } = await this.supabase.db
      .from('medication')
      .select('id')
      .eq('id', medicationId)
      .eq('elderlyProfileId', elderlyProfileId)
      .single();

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    const { data: updated, error } = await this.supabase.db
      .from('medication')
      .update(updateDto)
      .eq('id', medicationId)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);

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

    const { data: medication } = await this.supabase.db
      .from('medication')
      .select('id')
      .eq('id', medicationId)
      .eq('elderlyProfileId', elderlyProfileId)
      .single();

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    const { error } = await this.supabase.db
      .from('medication')
      .delete()
      .eq('id', medicationId);

    if (error) throw new InternalServerErrorException(error.message);

    this.logger.log(`Medication deleted: ${medicationId}`);

    return { success: true };
  }

  async getTodayMedications(userId: string) {
    const { data: user, error: userError } = await this.supabase.db
      .from('user')
      .select('role, elderlyprofile!inner(id)')
      .eq('id', userId)
      .single();

    if (userError) throw new InternalServerErrorException(userError.message);

    if (!user || user.role !== 'elderly' || !user.elderlyprofile || user.elderlyprofile.length === 0) {
      throw new ForbiddenException(
        'Only elderly users can access this endpoint',
      );
    }

    const elderlyProfileId = Array.isArray(user.elderlyprofile) ? user.elderlyprofile[0].id : (user.elderlyprofile as any).id;

    const { data: medications, error: medError } = await this.supabase.db
      .from('medication')
      .select('*')
      .eq('elderlyProfileId', elderlyProfileId)
      .eq('active', true)
      .order('time', { ascending: true });

    if (medError) throw new InternalServerErrorException(medError.message);

    const today = new Date();
    const startObj = startOfDay(today).toISOString();
    const endObj = endOfDay(today).toISOString();

    const { data: histories, error: histError } = await this.supabase.db
      .from('medicationhistory')
      .select('*')
      .eq('elderlyProfileId', elderlyProfileId)
      .gte('scheduledDate', startObj)
      .lte('scheduledDate', endObj);

    if (histError) throw new InternalServerErrorException(histError.message);

    if (!medications) return { items: [] };

    const items = medications.map((med: any) => {
      const history = (histories || []).find(
        (h: any) => h.medicationId === med.id,
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
    const { data: user, error: userError } = await this.supabase.db
      .from('user')
      .select('role, elderlyprofile!inner(id)')
      .eq('id', userId)
      .single();

    if (userError) throw new InternalServerErrorException(userError.message);

    if (!user || user.role !== 'elderly' || !user.elderlyprofile || user.elderlyprofile.length === 0) {
      throw new ForbiddenException(
        'Only elderly users can access this endpoint',
      );
    }

    const elderlyProfileId = Array.isArray(user.elderlyprofile) ? user.elderlyprofile[0].id : (user.elderlyprofile as any).id;

    const { data: medication } = await this.supabase.db
      .from('medication')
      .select('id')
      .eq('id', medicationId)
      .eq('elderlyProfileId', elderlyProfileId)
      .single();

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    const now = new Date();
    const scheduledDate = startOfDay(now).toISOString();
    const nowIso = now.toISOString();
    const endObj = endOfDay(now).toISOString();

    // Check if already confirmed today
    const { data: existing } = await this.supabase.db
      .from('medicationhistory')
      .select('*')
      .eq('elderlyProfileId', elderlyProfileId)
      .eq('medicationId', medicationId)
      .gte('scheduledDate', scheduledDate)
      .lte('scheduledDate', endObj)
      .single();

    let history;
    let histError;
    if (existing) {
      const res = await this.supabase.db
        .from('medicationhistory')
        .update({
          confirmed: confirmDto.confirmed,
          respondedAt: nowIso,
        })
        .eq('id', existing.id)
        .select()
        .single();
      history = res.data;
      histError = res.error;
    } else {
      const res = await this.supabase.db
        .from('medicationhistory')
        .insert({
          elderlyProfileId,
          medicationId,
          confirmed: confirmDto.confirmed,
          scheduledDate,
          respondedAt: nowIso,
        })
        .select()
        .single();
      history = res.data;
      histError = res.error;
    }
    
    if (histError) throw new InternalServerErrorException(histError.message);
    if (!history) throw new InternalServerErrorException('Failed to save medication history');

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

    let query = this.supabase.db
      .from('medicationhistory')
      .select('*, medication(*)', { count: 'exact' })
      .eq('elderlyProfileId', elderlyProfileId);

    if (from || to) {
      if (from) query = query.gte('scheduledDate', new Date(from).toISOString());
      if (to) query = query.lte('scheduledDate', new Date(to).toISOString());
    }

    const skip = (page - 1) * limit;

    const { data: items, count: total, error } = await query
      .order('scheduledDate', { ascending: false })
      .range(skip, skip + limit - 1);

    if (error) throw new InternalServerErrorException(error.message);

    const totalCount = total ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      items: (items || []).map((h: any) => ({
        id: h.id,
        medicationId: h.medicationId,
        medicationName: h.medication?.name || 'Unknown',
        confirmed: h.confirmed,
        timestamp: h.respondedAt || h.createdAt,
      })),
      total: total || 0,
      page,
      totalPages,
    };
  }
}
