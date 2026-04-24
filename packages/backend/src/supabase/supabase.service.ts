// SECURITY NOTE: This service uses SERVICE_ROLE_KEY (admin privileges).
// All endpoints using this service MUST be protected with @UseGuards(JwtAuthGuard).
// Backend is the trust boundary — never expose SERVICE_ROLE_KEY to client.
import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient<Database>;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
    }

    this.client = createClient<Database>(url, key, {
      auth: { persistSession: false },
    });
  }

  get db(): SupabaseClient<Database> {
    return this.client;
  }
}
