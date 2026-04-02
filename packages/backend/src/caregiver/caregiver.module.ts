import { Module } from '@nestjs/common';
import { CaregiverService } from './caregiver.service';
import { CaregiverController } from './caregiver.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CaregiverController],
  providers: [CaregiverService],
  exports: [CaregiverService],
})
export class CaregiverModule {}
