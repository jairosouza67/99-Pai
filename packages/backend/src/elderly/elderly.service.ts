import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateElderlyProfileDto } from './dto/update-profile.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class ElderlyService {
  private readonly logger = new Logger(ElderlyService.name);
  private readonly linkCodeTtlHours = Number(
    process.env.LINK_CODE_TTL_HOURS ?? 24,
  );

  constructor(private supabase: SupabaseService) {}

  async getProfile(userId: string) {
    const { data: user } = await this.supabase.db
      .from('user')
      .select('id, role, elderlyprofile(*)')
      .eq('id', userId)
      .single();

    if (!user || user.role !== Role.elderly) {
      throw new ForbiddenException(
        'Only elderly users can access this endpoint',
      );
    }

    const elderlyProfile = Array.isArray(user.elderlyprofile)
      ? user.elderlyprofile[0]
      : user.elderlyprofile;

    if (!elderlyProfile) {
      throw new NotFoundException('Elderly profile not found');
    }

    const currentProfile = await this.ensureFreshLinkCode(elderlyProfile);

    return {
      id: currentProfile.id,
      userId: currentProfile.userId,
      preferredName: currentProfile.preferredName,
      autonomyScore: currentProfile.autonomyScore,
      interactionTimes: currentProfile.interactionTimes,
      location: currentProfile.location,
      onboardingComplete: currentProfile.onboardingComplete,
      linkCode: currentProfile.linkCode,
    };
  }

  async updateProfile(userId: string, updateDto: UpdateElderlyProfileDto) {
    const { data: user } = await this.supabase.db
      .from('user')
      .select('id, role, elderlyprofile(id)')
      .eq('id', userId)
      .single();

    if (!user || user.role !== Role.elderly) {
      throw new ForbiddenException(
        'Only elderly users can access this endpoint',
      );
    }

    const elderlyProfile = Array.isArray(user.elderlyprofile)
      ? user.elderlyprofile[0]
      : user.elderlyprofile;

    if (!elderlyProfile) {
      throw new NotFoundException('Elderly profile not found');
    }

    const { data: updated, error } = await this.supabase.db
      .from('elderlyprofile')
      .update(updateDto)
      .eq('id', elderlyProfile.id)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);

    this.logger.log(`Elderly profile updated: ${user.id}`);

    const currentProfile = await this.ensureFreshLinkCode(updated);

    return {
      id: currentProfile.id,
      preferredName: currentProfile.preferredName,
      autonomyScore: currentProfile.autonomyScore,
      interactionTimes: currentProfile.interactionTimes,
      location: currentProfile.location,
      onboardingComplete: currentProfile.onboardingComplete,
      linkCode: currentProfile.linkCode,
    };
  }

  private isCodeExpired(createdAt: string | null | undefined): boolean {
    if (!createdAt) {
      return false;
    }

    const createdAtMs = new Date(createdAt).getTime();
    if (Number.isNaN(createdAtMs)) {
      return false;
    }

    const ttlMs = this.linkCodeTtlHours * 60 * 60 * 1000;
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

  private async ensureFreshLinkCode(profile: any) {
    if (!this.isCodeExpired(profile.linkCodeCreatedAt)) {
      return profile;
    }

    const nextCode = this.generateLinkCode();
    const { data: updated, error } = await this.supabase.db
      .from('elderlyprofile')
      .update({
        linkCode: nextCode,
        linkCodeCreatedAt: new Date().toISOString(),
        linkCodeFailedAttempts: 0,
        linkCodeLockedUntil: null,
      })
      .eq('id', profile.id)
      .select('*')
      .single();

    if (error) throw new InternalServerErrorException(error.message);

    return updated;
  }
}
