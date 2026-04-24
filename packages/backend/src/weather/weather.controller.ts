import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Weather')
@Controller('weather')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  @ApiOperation({ summary: 'Get weather forecast with clothing advice' })
  @ApiQuery({ name: 'location', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Weather data retrieved' })
  async getWeather(@User() user: RequestUser, @Query('location') location?: string) {
    return this.weatherService.getWeather(user.userId, location);
  }
}
