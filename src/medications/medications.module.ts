import { Module } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { MedicationsController } from './medications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CaregiverModule } from '../caregiver/caregiver.module';

@Module({
  imports: [PrismaModule, CaregiverModule],
  controllers: [MedicationsController],
  providers: [MedicationsService],
})
export class MedicationsModule {}
