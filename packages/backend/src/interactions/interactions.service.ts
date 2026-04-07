import { ForbiddenException, Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LogInteractionDto } from './dto/log-interaction.dto';

@Injectable()
export class InteractionsService {
  private readonly logger = new Logger(InteractionsService.name);

  constructor(private supabase: SupabaseService) {}

  async logInteraction(userId: string, logDto: LogInteractionDto) {
    const { data: user, error: userError } = await this.supabase.db
      .from('user')
      .select('role, elderlyprofile!inner(id)')
      .eq('id', userId)
      .single();

    if (userError) throw new InternalServerErrorException(userError.message);

    if (!user || user.role !== 'elderly' || !user.elderlyprofile || user.elderlyprofile.length === 0) {
      throw new ForbiddenException('Only elderly users can log interactions');
    }

    const elderlyProfileId = Array.isArray(user.elderlyprofile) ? user.elderlyprofile[0].id : (user.elderlyprofile as any).id;

    // Create interaction log
    const { error: logError } = await this.supabase.db
      .from('interactionlog')
      .insert({
        elderlyProfileId,
        type: logDto.type,
      });

    if (logError) throw new InternalServerErrorException(logError.message);

    // Update last interaction timestamp
    const { error: updateError } = await this.supabase.db
      .from('elderlyprofile')
      .update({ lastInteractionAt: new Date().toISOString() })
      .eq('id', elderlyProfileId);
      
    if (updateError) throw new InternalServerErrorException(updateError.message);

    this.logger.log(
      `Interaction logged for elderly profile ${elderlyProfileId}: ${logDto.type}`,
    );

    return { success: true };
  }
}
