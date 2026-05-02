// =============================================================
// Shared rate-limiting module for 99-Pai Edge Functions
// Context: Ralph Loop — Etapa 04
// =============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check and increment rate limit for a given key.
 *
 * @param adminClient Supabase admin client (service role)
 * @param key Unique rate limit key (e.g. "voice-tts:user-id")
 * @param maxRequests Maximum allowed requests in the window
 * @param windowSeconds Time window in seconds
 */
export async function checkRateLimit(
  adminClient: ReturnType<typeof createClient>,
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowSeconds * 1000)

  // Try to get existing rate limit record
  const { data: existing } = await adminClient
    .from('rate_limits')
    .select('count, window_start')
    .eq('key', key)
    .single()

  if (!existing || new Date(existing.window_start) < windowStart) {
    // Create or reset the record
    const { error: upsertError } = await adminClient
      .from('rate_limits')
      .upsert({
        key,
        count: 1,
        window_start: now.toISOString(),
      })

    if (upsertError) {
      console.error(`Rate limit upsert failed: ${upsertError.message}`)
    }

    const resetAt = new Date(now.getTime() + windowSeconds * 1000)
    return { allowed: true, remaining: maxRequests - 1, resetAt }
  }

  const newCount = existing.count + 1

  if (newCount > maxRequests) {
    const resetAt = new Date(new Date(existing.window_start).getTime() + windowSeconds * 1000)
    return { allowed: false, remaining: 0, resetAt }
  }

  // Increment count
  const { error: updateError } = await adminClient
    .from('rate_limits')
    .update({ count: newCount })
    .eq('key', key)

  if (updateError) {
    console.error(`Rate limit update failed: ${updateError.message}`)
  }

  const resetAt = new Date(new Date(existing.window_start).getTime() + windowSeconds * 1000)
  return { allowed: true, remaining: maxRequests - newCount, resetAt }
}
