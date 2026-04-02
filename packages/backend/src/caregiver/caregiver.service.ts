import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LinkDto } from './dto/link.dto';
import { Role } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class CaregiverService {
  private readonly logger = new Logger(CaregiverService.name);

  constructor(private prisma: PrismaService) {}

  async linkElderly(userId: string, linkDto: LinkDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role !== Role.caregiver) {
      throw new ForbiddenException('Only caregivers can link to elderly users');
    }

    const elderlyProfile = await this.prisma.elderlyprofile.findUnique({
      where: { linkCode: linkDto.linkCode },
    });

    if (!elderlyProfile) {
      throw new NotFoundException('Invalid link code');
    }

    // Check if already linked
    const existingLink = await this.prisma.caregiverlink.findUnique({
      where: {
        caregiverUserId_elderlyProfileId: {
          caregiverUserId: userId,
          elderlyProfileId: elderlyProfile.id,
        },
      },
    });

    if (existingLink) {
      throw new ConflictException('Already linked to this elderly user');
    }

    await this.prisma.caregiverlink.create({
      data: {
        caregiverUserId: userId,
        elderlyProfileId: elderlyProfile.id,
      },
    });

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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role !== Role.caregiver) {
      throw new ForbiddenException('Only caregivers can access this endpoint');
    }

    const links = await this.prisma.caregiverlink.findMany({
      where: { caregiverUserId: userId },
      include: {
        elderlyProfile: {
          include: {
            medications: {
              where: { active: true },
            },
            medicationHistory: {
              where: {
                scheduledDate: {
                  gte: startOfDay(new Date()),
                  lte: endOfDay(new Date()),
                },
              },
            },
          },
        },
      },
    });

    const items = links.map((link: (typeof links)[number]) => {
      const profile = link.elderlyProfile;
      const totalToday = profile.medications.length;
      const confirmed = profile.medicationHistory.filter(
        (h: (typeof profile.medicationHistory)[number]) => h.confirmed,
      ).length;
      const missed = profile.medicationHistory.filter(
        (h: (typeof profile.medicationHistory)[number]) =>
          !h.confirmed && h.respondedAt,
      ).length;

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
    });

    return { items };
  }

  async getElderlyDetails(userId: string, elderlyProfileId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role !== Role.caregiver) {
      throw new ForbiddenException('Only caregivers can access this endpoint');
    }

    // Verify caregiver is linked to this elderly
    const link = await this.prisma.caregiverlink.findUnique({
      where: {
        caregiverUserId_elderlyProfileId: {
          caregiverUserId: userId,
          elderlyProfileId,
        },
      },
    });

    if (!link) {
      throw new ForbiddenException('Not linked to this elderly user');
    }

    const profile = await this.prisma.elderlyprofile.findUnique({
      where: { id: elderlyProfileId },
      include: {
        medications: {
          where: { active: true },
        },
        medicationHistory: {
          where: {
            scheduledDate: {
              gte: startOfDay(new Date()),
              lte: endOfDay(new Date()),
            },
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Elderly profile not found');
    }

    const totalToday = profile.medications.length;
    const confirmed = profile.medicationHistory.filter(
      (h: (typeof profile.medicationHistory)[number]) => h.confirmed,
    ).length;
    const missed = profile.medicationHistory.filter(
      (h: (typeof profile.medicationHistory)[number]) =>
        !h.confirmed && h.respondedAt,
    ).length;

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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return false;
    }

    if (user.role === Role.elderly) {
      // Elderly can only access their own profile
      const elderlyProfile = await this.prisma.elderlyprofile.findUnique({
        where: { userId },
      });
      return elderlyProfile?.id === elderlyProfileId;
    }

    if (user.role === Role.caregiver) {
      // Caregiver can access linked elderly
      const link = await this.prisma.caregiverlink.findUnique({
        where: {
          caregiverUserId_elderlyProfileId: {
            caregiverUserId: userId,
            elderlyProfileId,
          },
        },
      });
      return !!link;
    }

    return false;
  }
}
