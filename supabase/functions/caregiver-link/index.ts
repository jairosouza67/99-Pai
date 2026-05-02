import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, jsonResponse } from '../_shared/cors.ts'
import { validateLinkCode } from '../_shared/validation.ts'
import { resolveLegacyId } from '../_shared/identity.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

// ── Helpers ────────────────────────────────────────────────────────────────

function generateLinkCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = new Uint8Array(6)
  // crypto.getRandomValues is available in Deno
  crypto.getRandomValues(bytes)
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(bytes[i] % chars.length)
  }
  return code
}

function isCodeExpired(createdAt: string | null): boolean {
  if (!createdAt) return false
  const ttlMs = 24 * 60 * 60 * 1000 // 24 hours
  const createdAtMs = new Date(createdAt).getTime()
  if (Number.isNaN(createdAtMs)) return false
  return Date.now() - createdAtMs > ttlMs
}

// ── Action handlers ───────────────────────────────────────────────────────

async function handleGenerateLinkCode(
  req: Request,
  adminClient: ReturnType<typeof createClient>,
  legacyId: string,
): Promise<Response> {
  // Verify user is elderly
  const { data: dbUser, error: userError } = await adminClient
    .from('user')
    .select('id, role')
    .eq('id', legacyId)
    .single()

  if (userError || !dbUser) {
    return jsonResponse(req, { error: 'User not found' }, 404)
  }

  if (dbUser.role !== 'elderly') {
    return jsonResponse(req, { error: 'Only elderly users can generate link codes' }, 403)
  }

  // Find elderly profile
  const { data: elderlyProfile, error: profileError } = await adminClient
    .from('elderlyprofile')
    .select('id')
    .eq('userId', legacyId)
    .single()

  if (profileError || !elderlyProfile) {
    return jsonResponse(req, { error: 'Elderly profile not found' }, 404)
  }

  // Generate and set new link code
  const linkCode = generateLinkCode()
  const { error: updateError } = await adminClient
    .from('elderlyprofile')
    .update({
      linkCode,
      linkCodeCreatedAt: new Date().toISOString(),
      linkCodeFailedAttempts: 0,
      linkCodeLockedUntil: null,
    })
    .eq('id', elderlyProfile.id)

  if (updateError) {
    console.error(`Failed to update linkCode: ${updateError.message}`)
    return jsonResponse(req, { error: 'Failed to generate link code' }, 500)
  }

  return jsonResponse(req, { linkCode })
}

async function handleLinkCaregiver(
  req: Request,
  adminClient: ReturnType<typeof createClient>,
  legacyId: string,
  body: any,
): Promise<Response> {
  const { linkCode } = body
  const validationError = validateLinkCode(linkCode)
  if (validationError) {
    return jsonResponse(req, { error: validationError.message }, 400)
  }

  // Verify user is caregiver
  const { data: dbUser, error: userError } = await adminClient
    .from('user')
    .select('id, role')
    .eq('id', legacyId)
    .single()

  if (userError || !dbUser) {
    return jsonResponse(req, { error: 'User not found' }, 404)
  }

  if (dbUser.role !== 'caregiver') {
    return jsonResponse(req, { error: 'Only caregivers can link to elderly users' }, 403)
  }

  const normalizedLinkCode = linkCode.trim().toUpperCase()

  // Find elderly profile by linkCode
  const { data: elderlyProfile, error: profileError } = await adminClient
    .from('elderlyprofile')
    .select('id, linkCode, linkCodeCreatedAt, linkCodeLockedUntil, linkCodeFailedAttempts')
    .eq('linkCode', normalizedLinkCode)
    .single()

  if (profileError || !elderlyProfile) {
    // Increment failed attempts on the elderly profile that was tried
    // Since we can't find the profile, we can't increment on it.
    // The original NestJS code tracked attempts per caregiver in-memory.
    // In Edge Functions (stateless), we use DB columns for rate-limiting.
    // If code not found, we can't track by caregiver — just return 404.
    return jsonResponse(req, { error: 'Invalid link code' }, 404)
  }

  // Check if locked
  if (elderlyProfile.linkCodeLockedUntil) {
    const lockedUntil = new Date(elderlyProfile.linkCodeLockedUntil).getTime()
    if (lockedUntil > Date.now()) {
      return jsonResponse(
        req,
        { error: 'This link code is temporarily locked due to multiple invalid attempts' },
        429,
      )
    }
  }

  // Check if expired (24h TTL)
  if (isCodeExpired(elderlyProfile.linkCodeCreatedAt)) {
    // Increment failed attempts
    const newAttempts = elderlyProfile.linkCodeFailedAttempts + 1
    const lockUntil = newAttempts >= 5
      ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
      : null

    await adminClient
      .from('elderlyprofile')
      .update({
        linkCodeFailedAttempts: newAttempts,
        linkCodeLockedUntil: lockUntil,
      })
      .eq('id', elderlyProfile.id)

    return jsonResponse(
      req,
      { error: 'Link code expired. Ask the elderly user to refresh their profile code.' },
      403,
    )
  }

  // Check if already linked
  const { data: existingLink } = await adminClient
    .from('caregiverlink')
    .select('id')
    .eq('caregiverUserId', legacyId)
    .eq('elderlyProfileId', elderlyProfile.id)
    .single()

  if (existingLink) {
    return jsonResponse(req, { error: 'Already linked to this elderly user' }, 409)
  }

  // Insert caregiverlink
  const { data: newLink, error: insertError } = await adminClient
    .from('caregiverlink')
    .insert({
      caregiverUserId: legacyId,
      elderlyProfileId: elderlyProfile.id,
    })
    .select()
    .single()

  if (insertError) {
    console.error(`Failed to insert caregiverlink: ${insertError.message}`)
    return jsonResponse(req, { error: 'Failed to create link' }, 500)
  }

  // Rotate link code (generate new one for security)
  const newCode = generateLinkCode()
  await adminClient
    .from('elderlyprofile')
    .update({
      linkCode: newCode,
      linkCodeCreatedAt: new Date().toISOString(),
      linkCodeFailedAttempts: 0,
      linkCodeLockedUntil: null,
    })
    .eq('id', elderlyProfile.id)

  // Fetch elderly profile details for response
  const { data: profileDetails } = await adminClient
    .from('elderlyprofile')
    .select('id, preferredName, autonomyScore')
    .eq('id', elderlyProfile.id)
    .single()

  return jsonResponse(req, {
    success: true,
    elderlyProfileId: elderlyProfile.id,
    preferredName: profileDetails?.preferredName,
    autonomyScore: profileDetails?.autonomyScore,
  })
}

async function handleUnlinkCaregiver(
  req: Request,
  adminClient: ReturnType<typeof createClient>,
  legacyId: string,
  body: any,
): Promise<Response> {
  const { elderlyProfileId, caregiverUserId } = body
  if (!elderlyProfileId) {
    return jsonResponse(req, { error: 'elderlyProfileId is required' }, 400)
  }

  // If caregiverUserId provided, that user is being unlinked (must be admin or the elderly)
  // If not provided, the current user (caregiver) is unlinking themselves
  const targetCaregiverId = caregiverUserId || legacyId

  // If unlinking someone else, verify current user has authority
  if (caregiverUserId && caregiverUserId !== legacyId) {
    const { data: dbUser } = await adminClient
      .from('user')
      .select('role')
      .eq('id', legacyId)
      .single()

    // Only elderly (owner of profile) or admin can unlink a specific caregiver
    if (!dbUser || (dbUser.role !== 'elderly' && dbUser.role !== 'admin')) {
      return jsonResponse(req, { error: 'Only the elderly user or admin can unlink a specific caregiver' }, 403)
    }
  }

  const { error: deleteError } = await adminClient
    .from('caregiverlink')
    .delete()
    .eq('caregiverUserId', targetCaregiverId)
    .eq('elderlyProfileId', elderlyProfileId)

  if (deleteError) {
    console.error(`Failed to delete caregiverlink: ${deleteError.message}`)
    return jsonResponse(req, { error: 'Failed to unlink' }, 500)
  }

  return jsonResponse(req, { success: true })
}

async function handleVerifyAccess(
  req: Request,
  adminClient: ReturnType<typeof createClient>,
  legacyId: string,
  body: any,
): Promise<Response> {
  const { elderlyProfileId } = body
  if (!elderlyProfileId) {
    return jsonResponse(req, { error: 'elderlyProfileId is required' }, 400)
  }

  const { data: dbUser } = await adminClient
    .from('user')
    .select('id, role')
    .eq('id', legacyId)
    .single()

  if (!dbUser) {
    return jsonResponse(req, { hasAccess: false }, 200)
  }

  // Elderly users can access their own profile
  if (dbUser.role === 'elderly') {
    const { data: elderlyProfile } = await adminClient
      .from('elderlyprofile')
      .select('id')
      .eq('userId', legacyId)
      .single()

    return jsonResponse(req, { hasAccess: elderlyProfile?.id === elderlyProfileId })
  }

  // Caregivers can access linked elderly profiles
  if (dbUser.role === 'caregiver') {
    const { data: link } = await adminClient
      .from('caregiverlink')
      .select('id')
      .eq('caregiverUserId', legacyId)
      .eq('elderlyProfileId', elderlyProfileId)
      .single()

    return jsonResponse(req, { hasAccess: !!link })
  }

  // Admins have access to everything
  if (dbUser.role === 'admin') {
    return jsonResponse(req, { hasAccess: true })
  }

  return jsonResponse(req, { hasAccess: false })
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

  // Rate limiting: generate-link-code
  if (action === 'generate-link-code') {
    const rateLimit = await checkRateLimit(supabaseAdmin, `generate-link:${legacyId}`, 5, 60)
    if (!rateLimit.allowed) {
      return jsonResponse(req, { error: 'Rate limit exceeded. Try again later.' }, 429)
    }
  }

  // Route by action
  switch (action) {
    case 'generate-link-code':
      return await handleGenerateLinkCode(req, supabaseAdmin, legacyId)

    case 'link-caregiver':
      return await handleLinkCaregiver(req, supabaseAdmin, legacyId, body)

    case 'unlink-caregiver':
      return await handleUnlinkCaregiver(req, supabaseAdmin, legacyId, body)

    case 'verify-access':
      return await handleVerifyAccess(req, supabaseAdmin, legacyId, body)

    default:
      return jsonResponse(req, { error: `Unknown action: ${action}` }, 400)
  }
})