import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, jsonResponse } from '../_shared/cors.ts'
import { validateServiceNotes } from '../_shared/validation.ts'
import { resolveLegacyId } from '../_shared/identity.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parse "HH:mm" time string to total minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Check if two "HH:mm" times are within the given threshold in minutes
 */
function isTimeConflict(
  time1: string,
  time2: string,
  thresholdMinutes: number,
): boolean {
  const minutes1 = parseTimeToMinutes(time1)
  const minutes2 = parseTimeToMinutes(time2)
  const diff = Math.abs(minutes1 - minutes2)
  return diff <= thresholdMinutes
}

/**
 * Format an ISO date string or Date to "HH:mm"
 */
function formatTimeFromDate(dateStr: string): string {
  const date = new Date(dateStr)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Validate status transitions for service requests
 * Valid: pending → accepted → completed, any → cancelled
 */
function isValidStatusTransition(
  currentStatus: string,
  newStatus: string,
): boolean {
  if (newStatus === 'cancelled') return true // any → cancelled
  if (currentStatus === 'pending' && newStatus === 'accepted') return true
  if (currentStatus === 'accepted' && newStatus === 'completed') return true
  if (currentStatus === 'pending' && newStatus === 'rejected') return true
  return false
}

// ── Action handlers ───────────────────────────────────────────────────────

async function handleCreate(
  req: Request,
  adminClient: ReturnType<typeof createClient>,
  legacyId: string,
  body: any,
): Promise<Response> {
  const { elderlyProfileId, offeringId, requestedDateTime, notes } = body

  if (!elderlyProfileId || !offeringId) {
    return jsonResponse(req, { error: 'elderlyProfileId and offeringId are required' }, 400)
  }

  const notesValidation = validateServiceNotes(notes)
  if (notesValidation) {
    return jsonResponse(req, { error: notesValidation.message }, 400)
  }

  // Verify caller has access to the elderly profile (is owner or linked caregiver)
  const { data: elderlyProfile, error: epError } = await adminClient
    .from('elderlyprofile')
    .select('id, userId')
    .eq('id', elderlyProfileId)
    .single()

  if (epError || !elderlyProfile) {
    return jsonResponse(req, { error: `Elderly profile with id ${elderlyProfileId} not found` }, 404)
  }

  const isOwner = elderlyProfile.userId === legacyId
  let isLinkedCaregiver = false
  if (!isOwner) {
    const { data: link } = await adminClient
      .from('caregiverlink')
      .select('id')
      .eq('caregiverUserId', legacyId)
      .eq('elderlyProfileId', elderlyProfileId)
      .maybeSingle()
    isLinkedCaregiver = !!link
  }

  if (!isOwner && !isLinkedCaregiver) {
    return jsonResponse(req, { error: 'You do not have permission to create requests for this elderly profile' }, 403)
  }

  // Verify offering exists and is active
  const { data: offering, error: offeringError } = await adminClient
    .from('offering')
    .select('id, active')
    .eq('id', offeringId)
    .single()

  if (offeringError || !offering) {
    return jsonResponse(req, { error: `Offering with id ${offeringId} not found` }, 404)
  }

  if (!offering.active) {
    return jsonResponse(req, { error: 'Cannot request an inactive offering' }, 400)
  }

  // Conflict validation (only if requestedDateTime provided)
  const conflicts: string[] = []

  if (requestedDateTime) {
    const requestedDate = new Date(requestedDateTime)
    const requestedTime = formatTimeFromDate(requestedDateTime)

    // 1. Check medication schedule conflicts (30-min window)
    const { data: activeMedications, error: medError } = await adminClient
      .from('medication')
      .select('name, time')
      .eq('elderlyProfileId', elderlyProfileId)
      .eq('active', true)

    if (medError) {
      console.error(`Failed to fetch medications: ${medError.message}`)
      return jsonResponse(req, { error: 'Failed to validate conflicts' }, 500)
    }

    for (const med of activeMedications || []) {
      if (isTimeConflict(requestedTime, med.time, 30)) {
        conflicts.push(`Conflito com medicamento "${med.name}" às ${med.time}`)
      }
    }

    // 2. Check agenda event conflicts (60-min window)
    const oneHourMs = 60 * 60 * 1000
    const windowStart = new Date(requestedDate.getTime() - oneHourMs).toISOString()
    const windowEnd = new Date(requestedDate.getTime() + oneHourMs).toISOString()

    const { data: agendaEvents, error: agendaError } = await adminClient
      .from('agendaevent')
      .select('description, dateTime')
      .eq('elderlyProfileId', elderlyProfileId)
      .gte('dateTime', windowStart)
      .lte('dateTime', windowEnd)

    if (agendaError) {
      console.error(`Failed to fetch agenda events: ${agendaError.message}`)
      return jsonResponse(req, { error: 'Failed to validate conflicts' }, 500)
    }

    for (const event of agendaEvents || []) {
      const eventTime = formatTimeFromDate(event.dateTime)
      conflicts.push(`Conflito com evento "${event.description}" às ${eventTime}`)
    }

    // Return conflicts if any found
    if (conflicts.length > 0) {
      return jsonResponse(req, { success: false, conflicts }, 409)
    }
  }

  // Create the service request
  const { data: serviceRequest, error: insertError } = await adminClient
    .from('servicerequest')
    .insert({
      elderlyProfileId,
      offeringId,
      requestedDateTime: requestedDateTime
        ? new Date(requestedDateTime).toISOString()
        : null,
      notes: notes || null,
      status: 'pending',
    })
    .select()
    .single()

  if (insertError) {
    console.error(`Failed to create service request: ${insertError.message}`)
    return jsonResponse(req, { error: 'Failed to create service request' }, 500)
  }

  return jsonResponse(req, { success: true, data: serviceRequest })
}

async function handleUpdateStatus(
  req: Request,
  adminClient: ReturnType<typeof createClient>,
  legacyId: string,
  body: any,
): Promise<Response> {
  const { serviceRequestId, status } = body

  if (!serviceRequestId || !status) {
    return jsonResponse(req, { error: 'serviceRequestId and status are required' }, 400)
  }

  // Validate status value
  const validStatuses = ['pending', 'accepted', 'rejected', 'completed', 'cancelled']
  if (!validStatuses.includes(status)) {
    return jsonResponse(req, { error: `Invalid status: ${status}` }, 400)
  }

  // Fetch current service request
  const { data: currentRequest, error: fetchError } = await adminClient
    .from('servicerequest')
    .select('id, elderlyProfileId, status, offeringId')
    .eq('id', serviceRequestId)
    .single()

  if (fetchError || !currentRequest) {
    return jsonResponse(req, { error: `Service request with id ${serviceRequestId} not found` }, 404)
  }

  // Verify user is involved party
  // The user must be either the elderly profile owner or the offering provider
  const { data: elderlyProfile } = await adminClient
    .from('elderlyprofile')
    .select('userId')
    .eq('id', currentRequest.elderlyProfileId)
    .single()

  const { data: offering } = await adminClient
    .from('offering')
    .select('userId')
    .eq('id', currentRequest.offeringId)
    .single()

  const isInvolved =
    (elderlyProfile && elderlyProfile.userId === legacyId) ||
    (offering && offering.userId === legacyId)

  if (!isInvolved) {
    return jsonResponse(req, { error: 'Only involved parties can update the status' }, 403)
  }

  // Validate status transition
  if (!isValidStatusTransition(currentRequest.status, status)) {
    return jsonResponse(
      req,
      { error: `Invalid transition: ${currentRequest.status} → ${status}` },
      400,
    )
  }

  // Update the record
  const { data: updated, error: updateError } = await adminClient
    .from('servicerequest')
    .update({ status })
    .eq('id', serviceRequestId)
    .select()
    .single()

  if (updateError) {
    console.error(`Failed to update service request status: ${updateError.message}`)
    return jsonResponse(req, { error: 'Failed to update status' }, 500)
  }

  return jsonResponse(req, { success: true, data: updated })
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

  // Rate limiting: 20 requests per minute per user
  const rateLimit = await checkRateLimit(supabaseAdmin, `service-request:${legacyId}`, 20, 60)
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
    case 'create':
      return await handleCreate(req, supabaseAdmin, legacyId, body)

    case 'update-status':
      return await handleUpdateStatus(req, supabaseAdmin, legacyId, body)

    default:
      return jsonResponse(req, { error: `Unknown action: ${action}` }, 400)
  }
})