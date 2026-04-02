import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ElderlyService } from './elderly.service';
import { UpdateElderlyProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Elderly Profile')
@Controller('elderly')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ElderlyController {
  constructor(private readonly elderlyService: ElderlyService) {}

  @Get('profile')
  @Roles(Role.elderly)
  @ApiOperation({ summary: 'Get elderly user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@User() user: any) {
    return this.elderlyService.getProfile(user.userId);
  }

  @Patch('profile')
  @Roles(Role.elderly)
  @ApiOperation({ summary: 'Update elderly user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @User() user: any,
    @Body() updateDto: UpdateElderlyProfileDto,
  ) {
    return this.elderlyService.updateProfile(user.userId, updateDto);
  }
}
