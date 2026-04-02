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
import { AgendaService } from './agenda.service';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Agenda')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get('elderly/:elderlyProfileId/agenda')
  @ApiOperation({ summary: 'Get agenda for an elderly user' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of agenda events' })
  async getAgenda(
    @User() user: any,
    @Param('elderlyProfileId') elderlyProfileId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.agendaService.getAgenda(
      user.userId,
      elderlyProfileId,
      from,
      to,
    );
  }

  @Post('elderly/:elderlyProfileId/agenda')
  @ApiOperation({ summary: 'Create a new agenda event (caregiver only)' })
  @ApiResponse({ status: 201, description: 'Agenda event created' })
  async createAgenda(
    @User() user: any,
    @Param('elderlyProfileId') elderlyProfileId: string,
    @Body() createDto: CreateAgendaDto,
  ) {
    return this.agendaService.createAgenda(
      user.userId,
      elderlyProfileId,
      createDto,
    );
  }

  @Patch('elderly/:elderlyProfileId/agenda/:id')
  @ApiOperation({ summary: 'Update an agenda event' })
  @ApiResponse({ status: 200, description: 'Agenda event updated' })
  async updateAgenda(
    @User() user: any,
    @Param('elderlyProfileId') elderlyProfileId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateAgendaDto,
  ) {
    return this.agendaService.updateAgenda(
      user.userId,
      elderlyProfileId,
      id,
      updateDto,
    );
  }

  @Delete('elderly/:elderlyProfileId/agenda/:id')
  @ApiOperation({ summary: 'Delete an agenda event' })
  @ApiResponse({ status: 200, description: 'Agenda event deleted' })
  async deleteAgenda(
    @User() user: any,
    @Param('elderlyProfileId') elderlyProfileId: string,
    @Param('id') id: string,
  ) {
    return this.agendaService.deleteAgenda(user.userId, elderlyProfileId, id);
  }

  @Get('agenda/today')
  @Roles(Role.elderly)
  @ApiOperation({ summary: "Get today's agenda for elderly user" })
  @ApiResponse({ status: 200, description: "Today's agenda events" })
  async getTodayAgenda(@User() user: any) {
    return this.agendaService.getTodayAgenda(user.userId);
  }
}
