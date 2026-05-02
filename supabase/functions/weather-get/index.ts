import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, jsonResponse } from '../_shared/cors.ts'
import { validateWeatherLocation } from '../_shared/validation.ts'
import { resolveLegacyId } from '../_shared/identity.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

// ── Helpers ────────────────────────────────────────────────────────────────

// ── Geocoding: hardcoded Brazilian cities (ported from weather.service.ts) ─

const CITIES: Record<string, { lat: number; lon: number }> = {
  'são paulo': { lat: -23.5505, lon: -46.6333 },
  'rio de janeiro': { lat: -22.9068, lon: -43.1729 },
  brasília: { lat: -15.8267, lon: -47.9218 },
  salvador: { lat: -12.9714, lon: -38.5014 },
  fortaleza: { lat: -3.7172, lon: -38.5433 },
  'belo horizonte': { lat: -19.9167, lon: -43.9345 },
  manaus: { lat: -3.119, lon: -60.0217 },
  curitiba: { lat: -25.4284, lon: -49.2733 },
  recife: { lat: -8.0476, lon: -34.877 },
  'porto alegre': { lat: -30.0346, lon: -51.2177 },
}

function getCoordinatesForCity(
  city: string,
): { lat: number; lon: number } | null {
  return CITIES[city.toLowerCase()] || null
}

// ── Weather descriptions (ported from weather.service.ts) ──────────────────

const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: 'Céu limpo',
  1: 'Principalmente limpo',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Neblina',
  48: 'Névoa gelada',
  51: 'Garoa leve',
  53: 'Garoa moderada',
  55: 'Garoa forte',
  61: 'Chuva leve',
  63: 'Chuva moderada',
  65: 'Chuva forte',
  71: 'Neve leve',
  73: 'Neve moderada',
  75: 'Neve forte',
  77: 'Granizo',
  80: 'Pancadas de chuva leves',
  81: 'Pancadas de chuva moderadas',
  82: 'Pancadas de chuva fortes',
  85: 'Pancadas de neve leves',
  86: 'Pancadas de neve fortes',
  95: 'Trovoada',
  96: 'Trovoada com granizo leve',
  99: 'Trovoada com granizo forte',
}

function getWeatherDescription(code: number): string {
  return WEATHER_DESCRIPTIONS[code] || 'Condição desconhecida'
}

// ── Clothing advice (ported from weather.service.ts) ──────────────────────

function getClothingAdvice(temperature: number): string {
  if (temperature < 15) {
    return 'Vista um casaco quente hoje.'
  } else if (temperature >= 15 && temperature <= 22) {
    return 'Uma blusa leve é uma boa ideia.'
  } else if (temperature > 22 && temperature <= 30) {
    return 'Pode usar roupa leve hoje.'
  } else {
    return 'Está muito quente! Use roupa bem leve e beba água.'
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

  // Admin client for identity resolution
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

  // Rate limiting: 30 requests per minute per user
  const rateLimit = await checkRateLimit(supabaseAdmin, `weather-get:${legacyId}`, 30, 60)
  if (!rateLimit.allowed) {
    return jsonResponse(req, { error: 'Rate limit exceeded. Try again later.' }, 429)
  }

  // Parse body
  let location: string | undefined
  try {
    const body = await req.json()
    location = body.location
  } catch {
    // Empty body is fine — we'll use saved location
  }

  const locationValidation = validateWeatherLocation(location)
  if (locationValidation) {
    return jsonResponse(req, { error: locationValidation.message }, 400)
  }

  let lat: number
  let lon: number

  if (location) {
    // Geocode the provided location
    const coords = getCoordinatesForCity(location)
    if (!coords) {
      return jsonResponse(req, { error: 'Location not found' }, 400)
    }
    lat = coords.lat
    lon = coords.lon
  } else {
    // Try to get from user's elderly profile
    const { data: userData, error: profileError } = await supabaseAdmin
      .from('user')
      .select(
        `
        id,
        elderlyprofile (
          id,
          location
        )
      `,
      )
      .eq('id', legacyId)
      .single()

    if (profileError) {
      console.warn(
        `Falha ao buscar perfil do usuario: ${profileError.message}`,
      )
    }

    const elderlyProfile = (userData as any)?.elderlyprofile

    let profileLoc: string | null = null
    if (elderlyProfile) {
      if (Array.isArray(elderlyProfile)) {
        profileLoc = elderlyProfile[0]?.location
      } else {
        profileLoc = elderlyProfile.location
      }
    }

    if (profileLoc) {
      const coords = getCoordinatesForCity(profileLoc)
      if (!coords) {
        return jsonResponse(req, { error: 'User location not found' }, 400)
      }
      lat = coords.lat
      lon = coords.lon
    } else {
      // Default to São Paulo
      lat = -23.5505
      lon = -46.6333
    }
  }

  // Fetch from Open-Meteo API
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius`
  const response = await fetch(url)

  if (!response.ok) {
    return jsonResponse(req, { error: 'Failed to fetch weather data' }, 502)
  }

  const data = await response.json()
  const current = data.current_weather

  const temperature = current.temperature
  const weatherCode = current.weathercode

  const weatherDescription = getWeatherDescription(weatherCode)
  const clothingAdvice = getClothingAdvice(temperature)

  return jsonResponse(req, {
    temperature,
    temperatureUnit: 'celsius',
    weatherCode,
    weatherDescription,
    clothingAdvice,
  })
})
