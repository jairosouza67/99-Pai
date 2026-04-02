import { Module } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { MedicationsController } from './medications.controller';
import { CaregiverModule } from '../caregiver/caregiver.module';

@Module({
  imports: [CaregiverModule],
  controllers: [MedicationsController],
  providers: [MedicationsService],
})
export class MedicationsModule {}
