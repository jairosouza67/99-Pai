import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterTokenDto } from './dto/register-token.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async registerToken(userId: string, registerDto: RegisterTokenDto) {
    // Check if token already exists for this user
    const existing = await this.prisma.pushtoken.findUnique({
      where: {
        userId_token: {
          userId,
          token: registerDto.pushToken,
        },
      },
    });

    if (existing) {
      // Update platform if changed
      await this.prisma.pushtoken.update({
        where: { id: existing.id },
        data: { platform: registerDto.platform },
      });

      this.logger.log(`Push token updated for user ${userId}`);
    } else {
      // Create new token
      await this.prisma.pushtoken.create({
        data: {
          userId,
          token: registerDto.pushToken,
          platform: registerDto.platform,
        },
      });

      this.logger.log(`Push token registered for user ${userId}`);
    }

    return { success: true };
  }

  async sendNotification(userId: string, title: string, body: string) {
    // Get all push tokens for this user
    const tokens = await this.prisma.pushtoken.findMany({
      where: { userId },
    });

    if (tokens.length === 0) {
      this.logger.warn(`No push tokens found for user ${userId}`);
      return { success: false, message: 'No push tokens found' };
    }

    // In a real implementation, you would send push notifications here
    // For now, just log the notification
    this.logger.log(
      `Notification sent to ${tokens.length} devices: ${title} - ${body}`,
    );

    return { success: true, sent: tokens.length };
  }
}
