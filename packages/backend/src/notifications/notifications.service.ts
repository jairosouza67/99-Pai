import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterTokenDto } from './dto/register-token.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private supabase: SupabaseService) {}

  async registerToken(userId: string, registerDto: RegisterTokenDto) {
    // Check if token already exists for this user
    const { data: existing, error: findError } = await this.supabase.db
      .from('pushtoken')
      .select('id')
      .eq('userId', userId)
      .eq('token', registerDto.pushToken)
      .maybeSingle();

    if (existing) {
      // Update platform if changed
      const { error: updateError } = await this.supabase.db
        .from('pushtoken')
        .update({ platform: registerDto.platform })
        .eq('id', existing.id);

      if (updateError) throw new Error(updateError.message);

      this.logger.log(`Push token updated for user ${userId}`);
    } else {
      // Create new token
      const { error: insertError } = await this.supabase.db
        .from('pushtoken')
        .insert({
          userId,
          token: registerDto.pushToken,
          platform: registerDto.platform,
        });

      if (insertError) throw new Error(insertError.message);

      this.logger.log(`Push token registered for user ${userId}`);
    }

    return { success: true };
  }

  async sendNotification(userId: string, title: string, body: string) {
    // Get all push tokens for this user
    const { data: tokens, error } = await this.supabase.db
      .from('pushtoken')
      .select('*')
      .eq('userId', userId);

    if (error) throw new Error(error.message);

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
