import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogInteractionDto } from './dto/log-interaction.dto';
import { Role } from '@prisma/client';

@Injectable()
export class InteractionsService {
  private readonly logger = new Logger(InteractionsService.name);

  constructor(private prisma: PrismaService) {}

  async logInteraction(userId: string, logDto: LogInteractionDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { elderlyProfile: true },
    });

    if (!user || user.role !== Role.elderly || !user.elderlyProfile) {
      throw new ForbiddenException('Only elderly users can log interactions');
    }

    const elderlyProfileId = user.elderlyProfile.id;

    // Create interaction log
    await this.prisma.interactionlog.create({
      data: {
        elderlyProfileId,
        type: logDto.type,
      },
    });

    // Update last interaction timestamp
    await this.prisma.elderlyprofile.update({
      where: { id: elderlyProfileId },
      data: { lastInteractionAt: new Date() },
    });

    this.logger.log(
      `Interaction logged for elderly profile ${elderlyProfileId}: ${logDto.type}`,
    );

    return { success: true };
  }
}
