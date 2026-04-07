import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LinkDto } from './dto/link.dto';
import { Role } from '../common/enums/role.enum';
import { startOfDay, endOfDay } from 'date-fns';
import { randomBytes } from 'crypto';

interface LinkAttemptState {
  count: number;
  windowStart: number;
  lockedUntil?: number;
}

@Injectable()
export class CaregiverService {
  private readonly logger = new Logger(CaregiverService.name);
  private readonly linkAttemptsByCaregiver = new Map<string, LinkAttemptState>();

  constructor(private supabase: SupabaseService) {}

  private readonly linkCodeTtlHours = Number(
    process.env.LINK_CODE_TTL_HOURS ?? 24,
  );

  private readonly maxInvalidAttempts = Number(
    process.env.LINK_CODE_MAX_ATTEMPTS ?? 5,
  );

  private readonly attemptWindowMinutes = Number(
    process.env.LINK_CODE_ATTEMPT_WINDOW_MINUTES ?? 15,
  );

  private readonly lockMinutes = Number(process.env.LINK_CODE_LOCK_MINUTES ?? 15);

  async linkElderly(userId: string, linkDto: LinkDto) {
    const { data: user } = await this.supabase.db
      .from('user')
      .select('id, email, role')
      .eq('id', userId)
      .single();

    if (!user || user.role !== Role.caregiver) {
      throw new ForbiddenException('Only caregivers can link to elderly users');
    }

    this.ensureAttemptAllowed(userId);

    const normalizedLinkCode = linkDto.linkCode.trim().toUpperCase();

    const { data: elderlyProfile } = await this.supabase.db
      .from('elderlyprofile')
      .select('*')
      .eq('linkCode', normalizedLinkCode)
      .single();

    if (!elderlyProfile) {
      this.registerFailedAttempt(userId, normalizedLinkCode, 'invalid-code');
      throw new NotFoundException('Invalid link code');
    }

    if (this.isCodeExpired(elderlyProfile.linkCodeCreatedAt)) {
      this.registerFailedAttempt(userId, normalizedLinkCode, 'expired-code');
      throw new ForbiddenException(
        'Link code expired. Ask the elderly user to refresh their profile code.',
      );
    }

    if (elderlyProfile.linkCodeLockedUntil) {
      const lockedUntil = new Date(elderlyProfile.linkCodeLockedUntil).getTime();
      if (lockedUntil > Date.now()) {
        throw new HttpException(
          'This link code is temporarily locked due to multiple invalid attempts',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
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

    await this.rotateLinkCode(elderlyProfile.id);
    this.clearAttempts(userId);

    this.logger.log(
      `Caregiver ${user.email} linked to elderly profile ${elderlyProfile.id}`,
    );

    return {
      elderlyProfileId: elderlyProfile.id,
      preferredName: elderlyProfile.preferredName,
      autonomyScore: elderlyProfile.autonomyScore,
    };
  }

  private ensureAttemptAllowed(userId: string) {
    const state = this.linkAttemptsByCaregiver.get(userId);
    if (!state?.lockedUntil) {
      return;
    }

    if (state.lockedUntil > Date.now()) {
      throw new HttpException(
        'Too many invalid attempts. Try again in a few minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.linkAttemptsByCaregiver.delete(userId);
  }

  private registerFailedAttempt(userId: string, linkCode: string, reason: string) {
    const now = Date.now();
    const windowMs = this.attemptWindowMinutes * 60 * 1000;
    const lockMs = this.lockMinutes * 60 * 1000;

    const current = this.linkAttemptsByCaregiver.get(userId);
    let next: LinkAttemptState;

    if (!current || now - current.windowStart > windowMs) {
      next = { count: 1, windowStart: now };
    } else {
      next = { ...current, count: current.count + 1 };
    }

    if (next.count >= this.maxInvalidAttempts) {
      next.lockedUntil = now + lockMs;
      this.logger.warn(
        `Caregiver ${userId} locked for invalid linkCode attempts (code=${linkCode}, reason=${reason})`,
      );
    } else {
      this.logger.warn(
        `Invalid linkCode attempt by caregiver ${userId} (code=${linkCode}, reason=${reason}, count=${next.count})`,
      );
    }

    this.linkAttemptsByCaregiver.set(userId, next);
  }

  private clearAttempts(userId: string) {
    this.linkAttemptsByCaregiver.delete(userId);
  }

  private isCodeExpired(createdAt: string | null | undefined): boolean {
    if (!createdAt) {
      return false;
    }

    const ttlMs = this.linkCodeTtlHours * 60 * 60 * 1000;
    const createdAtMs = new Date(createdAt).getTime();
    if (Number.isNaN(createdAtMs)) {
      return false;
    }

    return Date.now() - createdAtMs > ttlMs;
  }

  private generateLinkCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = randomBytes(6);
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(bytes[i] % chars.length);
    }
    return code;
  }

  private async rotateLinkCode(elderlyProfileId: string) {
    const linkCode = this.generateLinkCode();

    const { error } = await this.supabase.db
      .from('elderlyprofile')
      .update({
        linkCode,
        linkCodeCreatedAt: new Date().toISOString(),
        linkCodeFailedAttempts: 0,
        linkCodeLockedUntil: null,
      })
      .eq('id', elderlyProfileId);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
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
