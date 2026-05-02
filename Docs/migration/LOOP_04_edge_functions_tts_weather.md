# 🔁 RALPH LOOP 04 — Edge Functions: TTS & Weather

> **Objetivo:** Criar Edge Functions para os serviços que requerem chaves secretas de APIs terceiras (TTS com 3 provedores de fallback, Weather).
> **Risco:** 🟠 ALTO — TTS tem lógica complexa (341 linhas, 3 provedores, cache)
> **Esforço estimado:** 6-8 horas
> **Pré-requisitos:** Nenhum (pode ser executado em paralelo com Loops 01-03)

---

## 📋 Instruções para o Agente

> Ao iniciar este loop, leia primeiro `Docs/Migration/RALPH_MEMORY.md` para contexto completo.
> Ao finalizar, atualize o `RALPH_MEMORY.md` com status, notas e decisões.

---

## 🧠 Contexto Técnico

**Voice/TTS (`voice.service.ts` — 341 linhas):**
- Cadeia de fallback: OpenRouter → OpenAI → Google Cloud TTS
- Cache de áudio no Supabase Storage (bucket `tts-cache`)
- Gera hash do texto para nome do ficheiro (dedup)
- Retorna URL pública do áudio
- **PROBLEMA:** `@google-cloud/text-to-speech` é SDK Node.js, **não funciona em Deno**

**Weather (`weather.service.ts` — 154 linhas):**
- Busca coordenadas do utilizador ou de cidade
- Chama API de clima (precisa de chave protegida)
- Lógica relativamente simples

**Runtime das Edge Functions:** Deno (TypeScript nativo, mas sem acesso a pacotes npm Node.js diretamente)

---

## ✅ Checklist de Tarefas

### Task 4.1 — Criar Edge Function `voice-tts`

**Criar:** `supabase functions new voice-tts`

**Arquivo:** `supabase/functions/voice-tts/index.ts`

**Lógica a migrar do `voice.service.ts`:**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHash } from 'https://deno.land/std/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validar autenticação
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const { text } = await req.json();
  if (!text || text.length > 600) {
    return new Response('Text required (max 600 chars)', { status: 400, headers: corsHeaders });
  }

  const bucketName = 'tts-cache';
  const filePath = `${await hashText(text)}.mp3`;

  // 1. Verificar cache
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: cached } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);
  // Verificar se o ficheiro existe
  const { data: fileList } = await supabaseAdmin.storage.from(bucketName).list('', {
    search: filePath,
  });

  if (fileList && fileList.length > 0) {
    return new Response(JSON.stringify({ url: cached.publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 2. Fallback chain: OpenRouter → OpenAI → Google REST
  let audioBuffer: ArrayBuffer | null = null;

  // Tentativa 1: OpenRouter
  audioBuffer = await tryOpenRouter(text);

  // Tentativa 2: OpenAI direto
  if (!audioBuffer) {
    audioBuffer = await tryOpenAI(text);
  }

  // Tentativa 3: Google Cloud TTS via REST API (NÃO SDK)
  if (!audioBuffer) {
    audioBuffer = await tryGoogleTtsRest(text);
  }

  if (!audioBuffer) {
    return new Response('All TTS providers failed', { status: 503, headers: corsHeaders });
  }

  // 3. Upload para cache
  await supabaseAdmin.storage.from(bucketName).upload(filePath, audioBuffer, {
    contentType: 'audio/mpeg',
    upsert: true,
  });

  const { data: publicUrl } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);

  return new Response(JSON.stringify({ url: publicUrl.publicUrl }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

**Funções auxiliares a implementar:**
- `tryOpenRouter(text)` — POST para `https://openrouter.ai/api/v1/tts`
- `tryOpenAI(text)` — POST para `https://api.openai.com/v1/audio/speech`
- `tryGoogleTtsRest(text)` — POST para `https://texttospeech.googleapis.com/v1/text:synthesize` (REST API, **não SDK**)
- `hashText(text)` — SHA-256 do texto normalizado

**IMPORTANTE — Google Cloud TTS em Deno:**
O SDK `@google-cloud/text-to-speech` não funciona em Deno. Usar a REST API diretamente:
```typescript
async function tryGoogleTtsRest(text: string): Promise<ArrayBuffer | null> {
  const credentialsJson = Deno.env.get('GOOGLE_TTS_CREDENTIALS_JSON');
  if (!credentialsJson) return null;

  // Gerar JWT para autenticação (ou usar API Key se disponível)
  const response = await fetch(
    'https://texttospeech.googleapis.com/v1/text:synthesize',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getGoogleAccessToken(credentialsJson)}`,
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: Deno.env.get('GOOGLE_TTS_LANGUAGE_CODE') ?? 'pt-BR',
          name: Deno.env.get('GOOGLE_TTS_VOICE_NAME') ?? 'pt-BR-Chirp3-HD-Leda',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: Number(Deno.env.get('GOOGLE_TTS_SPEAKING_RATE') ?? '0.92'),
          pitch: Number(Deno.env.get('GOOGLE_TTS_PITCH') ?? '0'),
        },
      }),
    }
  );

  if (!response.ok) return null;
  const { audioContent } = await response.json();
  // audioContent é base64
  const binary = Uint8Array.from(atob(audioContent), c => c.charCodeAt(0));
  return binary.buffer;
}
```

- [ ] Concluído

---

### Task 4.2 — Configurar secrets para TTS

**O que fazer:**
```bash
supabase secrets set OPENROUTER_API_KEY=<value>
supabase secrets set OPENROUTER_TTS_MODEL=openai/gpt-4o-mini-tts-2025-12-15
supabase secrets set OPENROUTER_TTS_VOICE=coral
supabase secrets set OPENROUTER_TTS_SPEED=0.95
supabase secrets set OPENAI_API_KEY=<value>
supabase secrets set OPENAI_TTS_MODEL=gpt-4o-mini-tts
supabase secrets set OPENAI_TTS_VOICE=alloy
supabase secrets set GOOGLE_TTS_CREDENTIALS_JSON='<json-content>'
supabase secrets set GOOGLE_TTS_LANGUAGE_CODE=pt-BR
supabase secrets set GOOGLE_TTS_VOICE_NAME=pt-BR-Chirp3-HD-Leda
```

- [ ] Concluído

---

### Task 4.3 — Criar Edge Function `weather-get`

**Criar:** `supabase functions new weather-get`

**Arquivo:** `supabase/functions/weather-get/index.ts`

**Migrar lógica de `weather.service.ts`:**
- Receber `location` (opcional) e `userId`
- Se sem location: buscar do perfil do idoso (query com RLS)
- Chamar API de clima com chave protegida
- Retornar dados formatados

**Secrets:**
```bash
supabase secrets set WEATHER_API_KEY=<value>
```

- [ ] Concluído

---

### Task 4.4 — Testar Edge Functions localmente

**O que fazer:**
```bash
supabase functions serve voice-tts --env-file .env
supabase functions serve weather-get --env-file .env
```

**Testes:**
```bash
# TTS
curl -X POST http://localhost:54321/functions/v1/voice-tts \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"text": "Olá, bom dia!"}'

# Weather
curl -X POST http://localhost:54321/functions/v1/weather-get \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"location": "São Paulo"}'
```

- [ ] Concluído

---

### Task 4.5 — Deploy das Edge Functions

```bash
supabase functions deploy voice-tts
supabase functions deploy weather-get
```

- [ ] Concluído

---

## 🔄 Pós-Loop

1. [ ] Edge Function `voice-tts` responde com URL de áudio
2. [ ] Fallback chain funciona (testar desativando OpenRouter)
3. [ ] Cache no Storage funciona (segunda chamada com mesmo texto retorna cache)
4. [ ] Edge Function `weather-get` retorna dados de clima
5. [ ] Ambas requerem autenticação (401 sem JWT)
6. [ ] Atualizar `RALPH_MEMORY.md` → Loop 04 → Status
7. [ ] Commit: `feat(migration): loop-04 edge functions voice-tts and weather-get`
