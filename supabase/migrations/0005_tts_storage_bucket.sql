-- =============================================================
-- Migration: 0005_tts_storage_bucket
-- Objetivo: Criar bucket publico para cache de audio TTS
-- =============================================================

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tts-cache',
  'tts-cache',
  true,
  10485760,
  ARRAY['audio/mpeg']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read access for tts-cache" ON storage.objects;
CREATE POLICY "Public read access for tts-cache"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'tts-cache');

DROP POLICY IF EXISTS "Service role insert tts-cache" ON storage.objects;
CREATE POLICY "Service role insert tts-cache"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'tts-cache');

DROP POLICY IF EXISTS "Service role update tts-cache" ON storage.objects;
CREATE POLICY "Service role update tts-cache"
ON storage.objects
FOR UPDATE
TO service_role
USING (bucket_id = 'tts-cache')
WITH CHECK (bucket_id = 'tts-cache');

DROP POLICY IF EXISTS "Service role delete tts-cache" ON storage.objects;
CREATE POLICY "Service role delete tts-cache"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'tts-cache');

COMMIT;