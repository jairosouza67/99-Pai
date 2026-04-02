import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register push notification token' })
  @ApiResponse({ status: 201, description: 'Token registered successfully' })
  async registerToken(
    @User() user: any,
    @Body() registerDto: RegisterTokenDto,
  ) {
    return this.notificationsService.registerToken(user.userId, registerDto);
  }
}
