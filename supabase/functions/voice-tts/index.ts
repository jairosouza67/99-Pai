import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, jsonResponse } from '../_shared/cors.ts'
import { validateTtsText } from '../_shared/validation.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

// ── Helpers ────────────────────────────────────────────────────────────────

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function base64urlEncode(obj: object): string {
  const json = JSON.stringify(obj)
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ── TTS Provider: OpenRouter / OpenAI shared ──────────────────────────────

async function callTtsEndpoint(params: {
  endpoint: string
  apiKey: string
  model: string
  voice: string
  speed: number
  text: string
}): Promise<Uint8Array> {
  const { endpoint, apiKey, model, voice, speed, text } = params

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice,
      speed,
      input: text,
      response_format: 'mp3',
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `TTS retornou ${response.status}: ${body.slice(0, 300) || 'sem detalhes'}`,
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

// ── TTS Provider: Google Cloud TTS via REST API (no SDK) ──────────────────

async function getGoogleAccessToken(credentials: {
  client_email: string
  private_key: string
}): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const headerB64 = base64urlEncode(header)
  const payloadB64 = base64urlEncode(payload)
  const signInput = `${headerB64}.${payloadB64}`

  // Import PKCS8 private key using Web Crypto API
  const pem = credentials.private_key
  const pemBody = pem
    .replace(/-----BEGIN.*?-----/g, '')
    .replace(/-----END.*?-----/g, '')
    .replace(/\s/g, '')
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0))

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  // Sign the input
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signInput),
  )

  const sigBytes = new Uint8Array(signature)
  const sigB64 = btoa(String.fromCharCode(...sigBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const jwt = `${signInput}.${sigB64}`

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text()
    throw new Error(
      `Google token exchange falhou: ${body.slice(0, 300)}`,
    )
  }

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

async function generateWithGoogle(text: string): Promise<Uint8Array> {
  const credentialsJson = Deno.env.get('GOOGLE_TTS_CREDENTIALS_JSON')
  if (!credentialsJson) {
    throw new Error('GOOGLE_TTS_CREDENTIALS_JSON não configurado')
  }

  const credentials = JSON.parse(credentialsJson)
  const accessToken = await getGoogleAccessToken(credentials)

  const languageCode = Deno.env.get('GOOGLE_TTS_LANGUAGE_CODE') || 'pt-BR'
  const voiceName =
    Deno.env.get('GOOGLE_TTS_VOICE_NAME') || 'pt-BR-Chirp3-HD-Leda'
  const speakingRate = Number(Deno.env.get('GOOGLE_TTS_SPEAKING_RATE') || '0.92')
  const pitch = Number(Deno.env.get('GOOGLE_TTS_PITCH') || '0')

  const response = await fetch(
    'https://texttospeech.googleapis.com/v1/text:synthesize',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode, name: voiceName },
        audioConfig: { audioEncoding: 'MP3', speakingRate, pitch },
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Google TTS retornou ${response.status}: ${body.slice(0, 300)}`,
    )
  }

  const data = await response.json()
  if (!data.audioContent) {
    throw new Error('Google TTS retornou audio vazio')
  }

  // Decode base64 to Uint8Array
  const binaryString = atob(data.audioContent)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

// ── Cache helpers ──────────────────────────────────────────────────────────

const BUCKET_NAME = 'tts-cache'

async function getCachedPublicUrl(
  adminClient: ReturnType<typeof createClient>,
  filePath: string,
): Promise<string | null> {
  const fileName = filePath.includes('/')
    ? filePath.slice(filePath.lastIndexOf('/') + 1)
    : filePath
  const folder = filePath.includes('/')
    ? filePath.slice(0, filePath.lastIndexOf('/'))
    : ''

  const { data, error } = await adminClient.storage
    .from(BUCKET_NAME)
    .list(folder, { limit: 100, search: fileName })

  if (error) {
    console.warn(`Falha ao consultar cache TTS: ${error.message}`)
    return null
  }

  const hasFile = data?.some((item: { name: string }) => item.name === fileName)
  if (!hasFile) return null

  const { data: urlData } = adminClient.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return urlData.publicUrl
}

async function uploadToCache(
  adminClient: ReturnType<typeof createClient>,
  filePath: string,
  audioBuffer: Uint8Array,
): Promise<void> {
  const { error } = await adminClient.storage
    .from(BUCKET_NAME)
    .upload(filePath, audioBuffer, {
      contentType: 'audio/mpeg',
      cacheControl: '31536000',
      upsert: true,
    })

  if (error) {
    throw new Error(`Falha no upload TTS para o Supabase: ${error.message}`)
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  // Auth check
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    },
  )
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser()
  if (authError || !user) {
    return jsonResponse(req, { error: 'Unauthorized' }, 401)
  }

  // Rate limiting: 10 requests per minute per user (financial protection)
  const rateLimit = await checkRateLimit(adminClient, `voice-tts:${user.id}`, 10, 60)
  if (!rateLimit.allowed) {
    return jsonResponse(req, { error: 'Rate limit exceeded. Try again later.' }, 429)
  }

  // Parse body
  let text: string
  try {
    const body = await req.json()
    text = body.text
  } catch {
    return jsonResponse(req, { error: 'Invalid JSON body' }, 400)
  }

  const textValidation = validateTtsText(text)
  if (textValidation) {
    return jsonResponse(req, { error: textValidation.message }, 400)
  }

  // Normalize text
  const normalized = text.trim().replace(/\s+/g, ' ')

  // Generate SHA-256 hash for cache key
  const hash = await sha256Hex(normalized)
  const filePath = `${hash}.mp3`

  // Admin client for storage operations (bypasses RLS)
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Check cache
  const cachedUrl = await getCachedPublicUrl(adminClient, filePath)
  if (cachedUrl) {
    return jsonResponse(req, { url: cachedUrl })
  }

  // ── Fallback chain ────────────────────────────────────────────────────
  let audioBuffer: Uint8Array | null = null
  let usedProvider = ''

  // Layer 1: OpenRouter (primary)
  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
  if (!audioBuffer && openRouterKey) {
    try {
      audioBuffer = await callTtsEndpoint({
        endpoint: 'https://openrouter.ai/api/v1/audio/speech',
        apiKey: openRouterKey,
        model:
          Deno.env.get('OPENROUTER_TTS_MODEL') ||
          'openai/gpt-4o-mini-tts-2025-12-15',
        voice: Deno.env.get('OPENROUTER_TTS_VOICE') || 'coral',
        speed: Number(Deno.env.get('OPENROUTER_TTS_SPEED') || '0.95'),
        text: normalized,
      })
      usedProvider = 'openrouter'
    } catch (error) {
      console.warn(
        `OpenRouter indisponivel, tentando OpenAI direto: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  // Layer 2: OpenAI Direct (secondary fallback)
  const openAiKey = Deno.env.get('OPENAI_API_KEY')
  if (!audioBuffer && openAiKey) {
    try {
      audioBuffer = await callTtsEndpoint({
        endpoint: 'https://api.openai.com/v1/audio/speech',
        apiKey: openAiKey,
        model: Deno.env.get('OPENAI_TTS_MODEL') || 'gpt-4o-mini-tts',
        voice: Deno.env.get('OPENAI_TTS_VOICE') || 'alloy',
        speed: Number(Deno.env.get('OPENAI_TTS_SPEED') || '0.95'),
        text: normalized,
      })
      usedProvider = 'openai'
    } catch (error) {
      console.warn(
        `OpenAI direto indisponivel, tentando Google TTS: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  // Layer 3: Google Cloud TTS REST API (last resort)
  if (!audioBuffer) {
    try {
      audioBuffer = await generateWithGoogle(normalized)
      usedProvider = 'google'
    } catch (error) {
      console.error(
        `Falha no fallback Google TTS: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  // All providers failed
  if (!audioBuffer) {
    return jsonResponse(
      req,
      {
        error:
          'Nao foi possivel gerar audio no momento. Tente novamente em instantes.',
      },
      503,
    )
  }

  // Upload to cache (fire-and-forget style but we await for reliability)
  try {
    await uploadToCache(adminClient, filePath, audioBuffer)
  } catch (error) {
    console.error(
      `Falha ao salvar audio TTS em cache (${usedProvider}): ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  // Return public URL
  const { data: urlData } = adminClient.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return jsonResponse(req, { url: urlData.publicUrl })
})
