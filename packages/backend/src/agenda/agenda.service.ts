import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CaregiverService } from '../caregiver/caregiver.service';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import { Role } from '../common/enums/role.enum';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class AgendaService {
  private readonly logger = new Logger(AgendaService.name);

  constructor(
    private supabase: SupabaseService,
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

    let query = this.supabase.db
      .from('agendaevent')
      .select('*')
      .eq('elderlyProfileId', elderlyProfileId);

    if (from) query = query.gte('dateTime', new Date(from).toISOString());
    if (to) query = query.lte('dateTime', new Date(to).toISOString());

    const { data: items, error } = await query.order('dateTime', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);

    return { items: items || [] };
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

    const { data: agenda, error } = await this.supabase.db
      .from('agendaevent')
      .insert({
        elderlyProfileId,
        description: createDto.description,
        dateTime: new Date(createDto.dateTime).toISOString(),
        reminder: createDto.reminder ?? true,
      })
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);

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

    const { data: agenda } = await this.supabase.db
      .from('agendaevent')
      .select('id')
      .eq('id', agendaId)
      .eq('elderlyProfileId', elderlyProfileId)
      .single();

    if (!agenda) {
      throw new NotFoundException('Agenda event not found');
    }

    const data: Record<string, any> = {};
    if (updateDto.description !== undefined)
      data.description = updateDto.description;
    if (updateDto.dateTime !== undefined)
      data.dateTime = new Date(updateDto.dateTime).toISOString();
    if (updateDto.reminder !== undefined) data.reminder = updateDto.reminder;

    const { data: updated, error } = await this.supabase.db
      .from('agendaevent')
      .update(data)
      .eq('id', agendaId)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);

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

    const { data: agenda } = await this.supabase.db
      .from('agendaevent')
      .select('id')
      .eq('id', agendaId)
      .eq('elderlyProfileId', elderlyProfileId)
      .single();

    if (!agenda) {
      throw new NotFoundException('Agenda event not found');
    }

    const { error } = await this.supabase.db
      .from('agendaevent')
      .delete()
      .eq('id', agendaId);

    if (error) throw new InternalServerErrorException(error.message);

    this.logger.log(`Agenda event deleted: ${agendaId}`);

    return { success: true };
  }

  async getTodayAgenda(userId: string) {
    const { data: user } = await this.supabase.db
      .from('user')
      .select('id, role, elderlyprofile!inner(id)')
      .eq('id', userId)
      .single();

    if (!user || user.role !== Role.elderly || !user.elderlyprofile) {
      throw new ForbiddenException(
        'Only elderly users can access this endpoint',
      );
    }

    const elderlyProfileId = Array.isArray(user.elderlyprofile)
      ? user.elderlyprofile[0].id
      : (user.elderlyprofile as any).id;

    const today = new Date();
    const { data: items, error } = await this.supabase.db
      .from('agendaevent')
      .select('*')
      .eq('elderlyProfileId', elderlyProfileId)
      .gte('dateTime', startOfDay(today).toISOString())
      .lte('dateTime', endOfDay(today).toISOString())
      .order('dateTime', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);

    return { items: items || [] };
  }
}
