import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SupabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly supabase: SupabaseService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Just check if we can query the offering table or use a simple query like fetching the schema
      // Since supabase JS client does not have a simple ping, we can just do a very light query.
      const { error } = await this.supabase.db.from('offering').select('id').limit(1);
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      return this.getStatus(key, true);
    } catch (error: any) {
      const message = error?.message || 'Unknown database error';

      throw new HealthCheckError(
        'Supabase health check failed',
        this.getStatus(key, false, { message }),
      );
    }
  }
}
