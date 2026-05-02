// =============================================================
// Shared CORS module for 99-Pai Edge Functions
// Context: Ralph Loop — Etapa 03
// =============================================================

export const ALLOWED_ORIGINS = [
  'https://99pai-web.vercel.app',
  'http://localhost:8081',
  'http://localhost:3000',
  'https://localhost:8081',
  'https://localhost:3000',
];

/**
 * Check if the request origin is allowed.
 * Mobile apps (Expo/Capacitor) may send null or capacitor:// origins.
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // Allow mobile apps with null origin
  if (origin.startsWith('capacitor://')) return true;
  if (origin.startsWith('ionic://')) return true;
  if (origin.startsWith('file://')) return true; // Allow file:// for local builds
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Build CORS headers for the given request origin.
 * Returns a safe default if the origin is not allowed.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const allowedOrigin = isAllowedOrigin(origin)
    ? (origin || '*')
    : ALLOWED_ORIGINS[0]; // Default to production URL

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

/**
 * Create a JSON response with proper CORS headers.
 */
export function jsonResponse(
  req: Request,
  body: object,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  });
}
