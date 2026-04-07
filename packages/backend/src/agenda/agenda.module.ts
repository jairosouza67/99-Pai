import { Module } from '@nestjs/common';
import { AgendaService } from './agenda.service';
import { AgendaController } from './agenda.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { CaregiverModule } from '../caregiver/caregiver.module';

@Module({
  imports: [SupabaseModule, CaregiverModule],
  controllers: [AgendaController],
  providers: [AgendaService],
})
export class AgendaModule {}
