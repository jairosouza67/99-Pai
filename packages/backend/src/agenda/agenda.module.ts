import { Module } from '@nestjs/common';
import { AgendaService } from './agenda.service';
import { AgendaController } from './agenda.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CaregiverModule } from '../caregiver/caregiver.module';

@Module({
  imports: [PrismaModule, CaregiverModule],
  controllers: [AgendaController],
  providers: [AgendaService],
})
export class AgendaModule {}
