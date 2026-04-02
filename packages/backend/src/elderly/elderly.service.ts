import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateElderlyProfileDto } from './dto/update-profile.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class ElderlyService {
  private readonly logger = new Logger(ElderlyService.name);

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

    return {
      id: elderlyProfile.id,
      userId: elderlyProfile.userId,
      preferredName: elderlyProfile.preferredName,
      autonomyScore: elderlyProfile.autonomyScore,
      interactionTimes: elderlyProfile.interactionTimes,
      location: elderlyProfile.location,
      onboardingComplete: elderlyProfile.onboardingComplete,
      linkCode: elderlyProfile.linkCode,
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

    return {
      id: updated.id,
      preferredName: updated.preferredName,
      autonomyScore: updated.autonomyScore,
      interactionTimes: updated.interactionTimes,
      location: updated.location,
      onboardingComplete: updated.onboardingComplete,
      linkCode: updated.linkCode,
    };
  }
}
