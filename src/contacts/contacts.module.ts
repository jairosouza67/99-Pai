import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CaregiverModule } from '../caregiver/caregiver.module';

@Module({
  imports: [PrismaModule, CaregiverModule],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
