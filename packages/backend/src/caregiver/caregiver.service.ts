import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LinkDto } from './dto/link.dto';
import { Role } from '../common/enums/role.enum';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class CaregiverService {
  private readonly logger = new Logger(CaregiverService.name);

  constructor(private supabase: SupabaseService) {}

  async linkElderly(userId: string, linkDto: LinkDto) {
    const { data: user } = await this.supabase.db
      .from('user')
      .select('id, email, role')
      .eq('id', userId)
      .single();

    if (!user || user.role !== Role.caregiver) {
      throw new ForbiddenException('Only caregivers can link to elderly users');
    }

    const { data: elderlyProfile } = await this.supabase.db
      .from('elderlyprofile')
      .select('id, preferredName, autonomyScore')
      .eq('linkCode', linkDto.linkCode)
      .single();

    if (!elderlyProfile) {
      throw new NotFoundException('Invalid link code');
    }

    // Check if already linked
    const { data: existingLink } = await this.supabase.db
      .from('caregiverlink')
      .select('id')
      .eq('caregiverUserId', userId)
      .eq('elderlyProfileId', elderlyProfile.id)
      .single();

    if (existingLink) {
      throw new ConflictException('Already linked to this elderly user');
    }

    const { error } = await this.supabase.db
      .from('caregiverlink')
      .insert({
        caregiverUserId: userId,
        elderlyProfileId: elderlyProfile.id,
      });

    if (error) throw new InternalServerErrorException(error.message);

    this.logger.log(
      `Caregiver ${user.email} linked to elderly profile ${elderlyProfile.id}`,
    );

    return {
      elderlyProfileId: elderlyProfile.id,
      preferredName: elderlyProfile.preferredName,
      autonomyScore: elderlyProfile.autonomyScore,
    };
  }

  async getLinkedElderly(userId: string) {
    const { data: user } = await this.supabase.db
      .from('user')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (!user || user.role !== Role.caregiver) {
      throw new ForbiddenException('Only caregivers can access this endpoint');
    }

    const { data: links, error } = await this.supabase.db
      .from('caregiverlink')
      .select('elderlyProfileId, elderlyprofile:elderlyprofile!inner(id, preferredName, autonomyScore, lastInteractionAt)')
      .eq('caregiverUserId', userId);

    if (error) throw new InternalServerErrorException(error.message);

    const today = new Date();
    const startObj = startOfDay(today).toISOString();
    const endObj = endOfDay(today).toISOString();

    const items = await Promise.all(
      (links || []).map(async (link: any) => {
        const profile = Array.isArray(link.elderlyprofile) ? link.elderlyprofile[0] : link.elderlyprofile;

        const { data: medications } = await this.supabase.db
          .from('medication')
          .select('id')
          .eq('elderlyProfileId', profile.id)
          .eq('active', true);

        const { data: histories } = await this.supabase.db
          .from('medicationhistory')
          .select('confirmed, respondedAt')
          .eq('elderlyProfileId', profile.id)
          .gte('scheduledDate', startObj)
          .lte('scheduledDate', endObj);

        const totalToday = medications?.length || 0;
        const confirmed = (histories || []).filter((h: any) => h.confirmed).length;
        const missed = (histories || []).filter((h: any) => !h.confirmed && h.respondedAt).length;

        return {
          id: profile.id,
          preferredName: profile.preferredName,
          autonomyScore: profile.autonomyScore,
          todayMedicationStats: {
            total: totalToday,
            confirmed,
            missed,
          },
          lastInteraction: profile.lastInteractionAt,
          hasAlert: missed >= 2,
        };
      }),
    );

    return { items };
  }

  async getElderlyDetails(userId: string, elderlyProfileId: string) {
    const { data: user } = await this.supabase.db
      .from('user')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (!user || user.role !== Role.caregiver) {
      throw new ForbiddenException('Only caregivers can access this endpoint');
    }

    // Verify caregiver is linked to this elderly
    const { data: link } = await this.supabase.db
      .from('caregiverlink')
      .select('id')
      .eq('caregiverUserId', userId)
      .eq('elderlyProfileId', elderlyProfileId)
      .single();

    if (!link) {
      throw new ForbiddenException('Not linked to this elderly user');
    }

    const { data: profile } = await this.supabase.db
      .from('elderlyprofile')
      .select('*')
      .eq('id', elderlyProfileId)
      .single();

    if (!profile) {
      throw new NotFoundException('Elderly profile not found');
    }

    const today = new Date();
    const startObj = startOfDay(today).toISOString();
    const endObj = endOfDay(today).toISOString();

    const { data: medications } = await this.supabase.db
      .from('medication')
      .select('id')
      .eq('elderlyProfileId', elderlyProfileId)
      .eq('active', true);

    const { data: histories } = await this.supabase.db
      .from('medicationhistory')
      .select('confirmed, respondedAt')
      .eq('elderlyProfileId', elderlyProfileId)
      .gte('scheduledDate', startObj)
      .lte('scheduledDate', endObj);

    const totalToday = medications?.length || 0;
    const confirmed = (histories || []).filter((h: any) => h.confirmed).length;
    const missed = (histories || []).filter((h: any) => !h.confirmed && h.respondedAt).length;

    return {
      id: profile.id,
      preferredName: profile.preferredName,
      autonomyScore: profile.autonomyScore,
      interactionTimes: profile.interactionTimes,
      location: profile.location,
      todayMedicationStats: {
        total: totalToday,
        confirmed,
        missed,
      },
      lastInteraction: profile.lastInteractionAt,
    };
  }

  async verifyAccess(
    userId: string,
    elderlyProfileId: string,
  ): Promise<boolean> {
    const { data: user } = await this.supabase.db
      .from('user')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (!user) {
      return false;
    }

    if (user.role === Role.elderly) {
      // Elderly can only access their own profile
      const { data: elderlyProfile } = await this.supabase.db
        .from('elderlyprofile')
        .select('id')
        .eq('userId', userId)
        .single();

      return elderlyProfile?.id === elderlyProfileId;
    }

    if (user.role === Role.caregiver) {
      // Caregiver can access linked elderly
      const { data: link } = await this.supabase.db
        .from('caregiverlink')
        .select('id')
        .eq('caregiverUserId', userId)
        .eq('elderlyProfileId', elderlyProfileId)
        .single();

      return !!link;
    }

    return false;
  }
}
