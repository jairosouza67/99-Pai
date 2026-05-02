import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, jsonResponse } from '../_shared/cors.ts'
import { validatePushToken } from '../_shared/validation.ts'
import { resolveLegacyId } from '../_shared/identity.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

// ── Helpers ────────────────────────────────────────────────────────────────

// ── Action handlers ───────────────────────────────────────────────────────

async function handleRegisterToken(
  req: Request,
  adminClient: ReturnType<typeof createClient>,
  legacyId: string,
  body: any,
): Promise<Response> {
  const { pushToken, platform } = body

  const tokenValidation = validatePushToken(pushToken)
  if (tokenValidation) {
    return jsonResponse(req, { error: tokenValidation.message }, 400)
  }

  if (!platform) {
    return jsonResponse(req, { error: 'pushToken and platform are required' }, 400)
  }

  // Validate platform enum value
  const validPlatforms = ['ios', 'android', 'web']
  if (!validPlatforms.includes(platform)) {
    return jsonResponse(
      req,
      { error: `Invalid platform: ${platform}. Valid values: ${validPlatforms.join(', ')}` },
      400,
    )
  }

  // Upsert: check if token already exists for this user
  const { data: existing, error: findError } = await adminClient
    .from('pushtoken')
    .select('id')
    .eq('userId', legacyId)
    .eq('token', pushToken)
    .maybeSingle()

  if (findError) {
    console.error(`Failed to query pushtoken: ${findError.message}`)
    return jsonResponse(req, { error: 'Failed to check existing token' }, 500)
  }

  if (existing) {
    // Update platform if changed
    const { error: updateError } = await adminClient
      .from('pushtoken')
      .update({ platform })
      .eq('id', existing.id)

    if (updateError) {
      console.error(`Failed to update pushtoken: ${updateError.message}`)
      return jsonResponse(req, { error: 'Failed to update token' }, 500)
    }
  } else {
    // Insert new token
    const { error: insertError } = await adminClient
      .from('pushtoken')
      .insert({
        userId: legacyId,
        token: pushToken,
        platform,
      })

    if (insertError) {
      console.error(`Failed to insert pushtoken: ${insertError.message}`)
      return jsonResponse(req, { error: 'Failed to register token' }, 500)
    }
  }

  return jsonResponse(req, { success: true })
}

async function handleUnregisterToken(
  req: Request,
  adminClient: ReturnType<typeof createClient>,
  legacyId: string,
  body: any,
): Promise<Response> {
  const { pushToken } = body

  const tokenValidation = validatePushToken(pushToken)
  if (tokenValidation) {
    return jsonResponse(req, { error: tokenValidation.message }, 400)
  }

  // Delete the pushtoken record
  const { error: deleteError } = await adminClient
    .from('pushtoken')
    .delete()
    .eq('userId', legacyId)
    .eq('token', pushToken)

  if (deleteError) {
    console.error(`Failed to delete pushtoken: ${deleteError.message}`)
    return jsonResponse(req, { error: 'Failed to unregister token' }, 500)
  }

  return jsonResponse(req, { success: true })
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  // Auth check
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    },
  )
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) {
    return jsonResponse(req, { error: 'Unauthorized' }, 401)
  }

  // Admin client for bypassing RLS
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // Resolve legacy ID for public table queries
  const legacyId = await resolveLegacyId(supabaseAdmin, user.id)
  if (!legacyId) {
    return jsonResponse(req, { error: 'User identity mapping not found' }, 404)
  }

  // Rate limiting: 10 requests per minute per user
  const rateLimit = await checkRateLimit(supabaseAdmin, `notification-register:${legacyId}`, 10, 60)
  if (!rateLimit.allowed) {
    return jsonResponse(req, { error: 'Rate limit exceeded. Try again later.' }, 429)
  }

  // Parse body
  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonResponse(req, { error: 'Invalid JSON body' }, 400)
  }

  const { action } = body
  if (!action) {
    return jsonResponse(req, { error: 'action is required' }, 400)
  }

  // Route by action
  switch (action) {
    case 'register-token':
      return await handleRegisterToken(req, supabaseAdmin, legacyId, body)

    case 'unregister-token':
      return await handleUnregisterToken(req, supabaseAdmin, legacyId, body)

    default:
      return jsonResponse(req, { error: `Unknown action: ${action}` }, 400)
  }
})