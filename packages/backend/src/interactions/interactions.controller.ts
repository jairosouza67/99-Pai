import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InteractionsService } from './interactions.service';
import { LogInteractionDto } from './dto/log-interaction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { Role } from '../common/enums/role.enum';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Interactions')
@Controller('interactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InteractionsController {
  constructor(private readonly interactionsService: InteractionsService) {}

  @Post('log')
  @Roles(Role.elderly)
  @ApiOperation({ summary: 'Log interaction (voice or button)' })
  @ApiResponse({ status: 201, description: 'Interaction logged' })
  async logInteraction(@User() user: RequestUser, @Body() logDto: LogInteractionDto) {
    return this.interactionsService.logInteraction(user.userId, logDto);
  }
}
