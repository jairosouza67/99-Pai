import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CaregiverService } from './caregiver.service';
import { LinkDto } from './dto/link.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Caregiver')
@Controller('caregiver')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CaregiverController {
  constructor(private readonly caregiverService: CaregiverService) {}

  @Post('link')
  @Roles(Role.caregiver)
  @ApiOperation({ summary: 'Link caregiver to elderly user using link code' })
  @ApiResponse({ status: 201, description: 'Successfully linked' })
  async linkElderly(@User() user: any, @Body() linkDto: LinkDto) {
    return this.caregiverService.linkElderly(user.userId, linkDto);
  }

  @Get('elderly')
  @Roles(Role.caregiver)
  @ApiOperation({ summary: 'Get all elderly users linked to caregiver' })
  @ApiResponse({ status: 200, description: 'List of linked elderly users' })
  async getLinkedElderly(@User() user: any) {
    return this.caregiverService.getLinkedElderly(user.userId);
  }

  @Get('elderly/:elderlyProfileId')
  @Roles(Role.caregiver)
  @ApiOperation({ summary: 'Get detailed info about a linked elderly user' })
  @ApiResponse({ status: 200, description: 'Elderly user details' })
  async getElderlyDetails(
    @User() user: any,
    @Param('elderlyProfileId') elderlyProfileId: string,
  ) {
    return this.caregiverService.getElderlyDetails(
      user.userId,
      elderlyProfileId,
    );
  }
}
