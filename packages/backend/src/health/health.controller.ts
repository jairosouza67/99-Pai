import { Controller, Get, UseGuards } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { SupabaseHealthIndicator } from './supabase.health';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly supabaseHealthIndicator: SupabaseHealthIndicator,
  ) {}

  /**
   * Public ping endpoint — no DB details, no internal info.
   * Used by Vercel Cron and load balancers.
   */
  @Get()
  @Get('ping')
  ping() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Protected status endpoint — returns detailed health info including DB status.
   * Requires authentication via JWT.
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  @HealthCheck()
  check() {
    return this.health.check([
      async () => this.supabaseHealthIndicator.isHealthy('database'),
    ]);
  }
}
