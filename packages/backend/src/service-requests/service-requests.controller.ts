import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ServiceRequestsService } from './service-requests.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { Role } from '../common/enums/role.enum';
import { SupabaseService } from '../supabase/supabase.service';

@ApiTags('Service Requests')
@ApiBearerAuth()
@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceRequestsController {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * Get elderly profile ID from user
   */
  private async getElderlyProfileId(userId: string): Promise<string> {
    const { data: profile, error } = await this.supabase.db
      .from('elderlyprofile')
      .select('id')
      .eq('userId', userId)
      .single();

    if (error || !profile) {
      throw new NotFoundException('Elderly profile not found for this user');
    }

    return profile.id;
  }

  @Post('request')
  @Roles(Role.elderly)
  @ApiOperation({ summary: 'Create a service request' })
  @ApiResponse({
    status: 201,
    description: 'Service request created successfully or conflicts returned',
  })
  @ApiResponse({ status: 400, description: 'Bad request or inactive offering' })
  @ApiResponse({ status: 404, description: 'Offering not found' })
  async create(
    @User() user: { userId: string },
    @Body() dto: CreateServiceRequestDto,
  ) {
    const elderlyProfileId = await this.getElderlyProfileId(user.userId);
    return this.serviceRequestsService.create(elderlyProfileId, dto);
  }

  @Get('my-requests')
  @Roles(Role.elderly)
  @ApiOperation({ summary: 'List my service requests' })
  @ApiResponse({ status: 200, description: 'List of service requests' })
  async findMyRequests(@User() user: { userId: string }) {
    const elderlyProfileId = await this.getElderlyProfileId(user.userId);
    return this.serviceRequestsService.findByElderly(elderlyProfileId);
  }

  @Patch('requests/:id/cancel')
  @Roles(Role.elderly)
  @ApiOperation({ summary: 'Cancel a service request' })
  @ApiResponse({ status: 200, description: 'Service request cancelled' })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel non-pending request',
  })
  @ApiResponse({
    status: 403,
    description: 'Cannot cancel other users requests',
  })
  @ApiResponse({ status: 404, description: 'Service request not found' })
  async cancel(@User() user: { userId: string }, @Param('id') id: string) {
    const elderlyProfileId = await this.getElderlyProfileId(user.userId);
    return this.serviceRequestsService.cancel(id, elderlyProfileId);
  }
}
