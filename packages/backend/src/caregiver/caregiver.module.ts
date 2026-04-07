import { Module } from '@nestjs/common';
import { CaregiverService } from './caregiver.service';
import { CaregiverController } from './caregiver.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [CaregiverController],
  providers: [CaregiverService],
  exports: [CaregiverService],
})
export class CaregiverModule {}
