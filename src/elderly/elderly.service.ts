import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateElderlyProfileDto } from './dto/update-profile.dto';
import { Role } from '@prisma/client';

@Injectable()
export class ElderlyService {
  private readonly logger = new Logger(ElderlyService.name);

  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { elderlyProfile: true },
    });

    if (!user || user.role !== Role.elderly) {
      throw new ForbiddenException(
        'Only elderly users can access this endpoint',
      );
    }

    if (!user.elderlyProfile) {
      throw new NotFoundException('Elderly profile not found');
    }

    return {
      id: user.elderlyProfile.id,
      userId: user.elderlyProfile.userId,
      preferredName: user.elderlyProfile.preferredName,
      autonomyScore: user.elderlyProfile.autonomyScore,
      interactionTimes: user.elderlyProfile.interactionTimes,
      location: user.elderlyProfile.location,
      onboardingComplete: user.elderlyProfile.onboardingComplete,
      linkCode: user.elderlyProfile.linkCode,
    };
  }

  async updateProfile(userId: string, updateDto: UpdateElderlyProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { elderlyProfile: true },
    });

    if (!user || user.role !== Role.elderly) {
      throw new ForbiddenException(
        'Only elderly users can access this endpoint',
      );
    }

    if (!user.elderlyProfile) {
      throw new NotFoundException('Elderly profile not found');
    }

    const updated = await this.prisma.elderlyprofile.update({
      where: { id: user.elderlyProfile.id },
      data: updateDto,
    });

    this.logger.log(`Elderly profile updated: ${user.email}`);

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
