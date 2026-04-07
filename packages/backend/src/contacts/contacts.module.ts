import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { CaregiverModule } from '../caregiver/caregiver.module';

@Module({
  imports: [SupabaseModule, CaregiverModule],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
