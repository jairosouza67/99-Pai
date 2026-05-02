// =============================================================
// Shared identity resolution module for 99-Pai Edge Functions
// Context: Ralph Loop — Etapa 04
// =============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Resolve the legacy user ID from an auth user ID.
 */
export async function resolveLegacyId(
  adminClient: ReturnType<typeof createClient>,
  authId: string,
): Promise<string | null> {
  const { data } = await adminClient
    .from('user_id_mapping')
    .select('legacy_id')
    .eq('auth_id', authId)
    .single()
  return data?.legacy_id ?? null
}
