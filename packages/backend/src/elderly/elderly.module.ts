import { Module } from '@nestjs/common';
import { ElderlyService } from './elderly.service';
import { ElderlyController } from './elderly.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [ElderlyController],
  providers: [ElderlyService],
  exports: [ElderlyService],
})
export class ElderlyModule {}
