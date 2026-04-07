import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';

@Module({
  imports: [SupabaseModule],
  controllers: [VoiceController],
  providers: [VoiceService],
})
export class VoiceModule {}