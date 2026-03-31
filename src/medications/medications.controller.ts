import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MedicationsService } from './medications.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { ConfirmMedicationDto } from './dto/confirm-medication.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Medications')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Get('elderly/:elderlyProfileId/medications')
  @ApiOperation({ summary: 'Get all medications for an elderly user' })
  @ApiResponse({ status: 200, description: 'List of medications' })
  async getMedications(
    @User() user: any,
    @Param('elderlyProfileId') elderlyProfileId: string,
  ) {
    return this.medicationsService.getMedications(
      user.userId,
      elderlyProfileId,
    );
  }

  @Post('elderly/:elderlyProfileId/medications')
  @ApiOperation({ summary: 'Create a new medication (caregiver only)' })
  @ApiResponse({ status: 201, description: 'Medication created' })
  async createMedication(
    @User() user: any,
    @Param('elderlyProfileId') elderlyProfileId: string,
    @Body() createDto: CreateMedicationDto,
  ) {
    return this.medicationsService.createMedication(
      user.userId,
      elderlyProfileId,
      createDto,
    );
  }

  @Patch('elderly/:elderlyProfileId/medications/:id')
  @ApiOperation({ summary: 'Update a medication' })
  @ApiResponse({ status: 200, description: 'Medication updated' })
  async updateMedication(
    @User() user: any,
    @Param('elderlyProfileId') elderlyProfileId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateMedicationDto,
  ) {
    return this.medicationsService.updateMedication(
      user.userId,
      elderlyProfileId,
      id,
      updateDto,
    );
  }

  @Delete('elderly/:elderlyProfileId/medications/:id')
  @ApiOperation({ summary: 'Delete a medication' })
  @ApiResponse({ status: 200, description: 'Medication deleted' })
  async deleteMedication(
    @User() user: any,
    @Param('elderlyProfileId') elderlyProfileId: string,
    @Param('id') id: string,
  ) {
    return this.medicationsService.deleteMedication(
      user.userId,
      elderlyProfileId,
      id,
    );
  }

  @Get('medications/today')
  @Roles(Role.elderly)
  @ApiOperation({ summary: "Get today's medications for elderly user" })
  @ApiResponse({ status: 200, description: "Today's medications" })
  async getTodayMedications(@User() user: any) {
    return this.medicationsService.getTodayMedications(user.userId);
  }

  @Post('medications/:id/confirm')
  @Roles(Role.elderly)
  @ApiOperation({ summary: 'Confirm or mark medication as missed' })
  @ApiResponse({ status: 201, description: 'Medication confirmation recorded' })
  async confirmMedication(
    @User() user: any,
    @Param('id') id: string,
    @Body() confirmDto: ConfirmMedicationDto,
  ) {
    return this.medicationsService.confirmMedication(
      user.userId,
      id,
      confirmDto,
    );
  }

  @Get('elderly/:elderlyProfileId/medication-history')
  @ApiOperation({ summary: 'Get medication history for an elderly user' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Medication history' })
  async getMedicationHistory(
    @User() user: any,
    @Param('elderlyProfileId') elderlyProfileId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.medicationsService.getMedicationHistory(
      user.userId,
      elderlyProfileId,
      from,
      to,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }
}
