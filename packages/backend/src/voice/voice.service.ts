import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import type { Response } from 'express';
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';
import { SupabaseService } from '../supabase/supabase.service';

type TtsProvider = 'openai' | 'google';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly bucketName = process.env.TTS_BUCKET ?? 'tts-cache';
  private readonly openAiSpeechEndpoint = 'https://api.openai.com/v1/audio/speech';
  private readonly googleClient: TextToSpeechClient | null;

  constructor(private readonly supabase: SupabaseService) {
    this.googleClient = this.createGoogleClient();
  }

  async synthesize(rawText: string, response: Response): Promise<void> {
    const text = this.normalizeText(rawText);
    const filePath = `${this.createTextHash(text)}.mp3`;

    const cachedUrl = await this.getCachedPublicUrl(filePath);
    if (cachedUrl) {
      this.logger.log(`TTS cache hit: ${filePath}`);
      response.redirect(302, cachedUrl);
      return;
    }

    this.logger.log(`TTS cache miss: ${filePath}`);

    try {
      const buffer = await this.streamFromOpenAi(text, response);
      this.persistCacheInBackground(filePath, buffer, 'openai');
      return;
    } catch (error) {
      if (response.headersSent) {
        this.logger.error(
          `Falha durante stream OpenAI apos envio da resposta: ${this.toErrorMessage(error)}`,
        );
        if (!response.writableEnded) {
          response.end();
        }
        return;
      }

      this.logger.warn(
        `OpenAI indisponivel, iniciando fallback Google TTS: ${this.toErrorMessage(error)}`,
      );
    }

    try {
      const buffer = await this.generateWithGoogle(text);
      response.status(200);
      response.setHeader('Content-Type', 'audio/mpeg');
      response.setHeader('Cache-Control', 'no-store');
      response.send(buffer);
      this.persistCacheInBackground(filePath, buffer, 'google');
    } catch (error) {
      this.logger.error(
        `Falha no fallback Google TTS: ${this.toErrorMessage(error)}`,
      );
      throw new ServiceUnavailableException(
        'Nao foi possivel gerar audio no momento. Tente novamente em instantes.',
      );
    }
  }

  private async streamFromOpenAi(text: string, response: Response): Promise<Buffer> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY nao configurada');
    }

    const requestPayload = {
      model: process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts',
      voice: process.env.OPENAI_TTS_VOICE ?? 'alloy',
      response_format: 'mp3',
      speed: Number(process.env.OPENAI_TTS_SPEED ?? '0.95'),
      input: text,
    };

    const upstream = await fetch(this.openAiSpeechEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      throw new Error(
        `OpenAI retornou ${upstream.status}: ${body.slice(0, 300) || 'sem detalhes'}`,
      );
    }

    if (!upstream.body) {
      throw new Error('OpenAI retornou stream vazio');
    }

    response.status(200);
    response.setHeader('Content-Type', 'audio/mpeg');
    response.setHeader('Cache-Control', 'no-store');

    return this.pipeWebStream(upstream.body, response);
  }

  private async generateWithGoogle(text: string): Promise<Buffer> {
    if (!this.googleClient) {
      throw new Error(
        'Google TTS nao configurado. Configure GOOGLE_APPLICATION_CREDENTIALS ou GOOGLE_TTS_CREDENTIALS_JSON.',
      );
    }

    const [result] = await this.googleClient.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: process.env.GOOGLE_TTS_LANGUAGE_CODE ?? 'pt-BR',
        name: process.env.GOOGLE_TTS_VOICE_NAME,
      },
      audioConfig: {
        audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
        speakingRate: Number(process.env.GOOGLE_TTS_SPEAKING_RATE ?? '0.92'),
        pitch: Number(process.env.GOOGLE_TTS_PITCH ?? '0'),
      },
    });

    const content = result.audioContent;
    if (!content) {
      throw new Error('Google TTS retornou audio vazio');
    }

    if (typeof content === 'string') {
      return Buffer.from(content, 'base64');
    }

    return Buffer.from(content);
  }

  private async getCachedPublicUrl(filePath: string): Promise<string | null> {
    const filename = this.getFileName(filePath);
    const folder = this.getFolder(filePath);

    const { data, error } = await this.supabase.db.storage
      .from(this.bucketName)
      .list(folder, { limit: 100, search: filename });

    if (error) {
      this.logger.warn(`Falha ao consultar cache TTS: ${error.message}`);
      return null;
    }

    const hasFile = data?.some((item) => item.name === filename);
    if (!hasFile) {
      return null;
    }

    const { data: publicUrlData } = this.supabase.db.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  }

  private async uploadToCache(filePath: string, audioBuffer: Buffer): Promise<void> {
    const { error } = await this.supabase.db.storage
      .from(this.bucketName)
      .upload(filePath, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000',
        upsert: true,
      });

    if (error) {
      throw new Error(`Falha no upload TTS para o Supabase: ${error.message}`);
    }
  }

  private persistCacheInBackground(
    filePath: string,
    audioBuffer: Buffer,
    provider: TtsProvider,
  ): void {
    void this.uploadToCache(filePath, audioBuffer)
      .then(() => {
        this.logger.log(
          `Audio TTS salvo em cache (${provider}) no bucket ${this.bucketName}: ${filePath}`,
        );
      })
      .catch((error: unknown) => {
        this.logger.error(
          `Falha ao salvar audio TTS em cache (${provider}): ${this.toErrorMessage(error)}`,
        );
      });
  }

  private async pipeWebStream(
    stream: ReadableStream<Uint8Array>,
    response: Response,
  ): Promise<Buffer> {
    const chunks: Buffer[] = [];
    const reader = stream.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if (!value || value.byteLength === 0) {
          continue;
        }

        const chunk = Buffer.from(value);
        chunks.push(chunk);

        if (!response.write(chunk)) {
          await new Promise<void>((resolve) => response.once('drain', resolve));
        }
      }

      if (!response.writableEnded) {
        response.end();
      }

      return Buffer.concat(chunks);
    } finally {
      reader.releaseLock();
    }
  }

  private createTextHash(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  private normalizeText(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  }

  private getFileName(filePath: string): string {
    const index = filePath.lastIndexOf('/');
    return index >= 0 ? filePath.slice(index + 1) : filePath;
  }

  private getFolder(filePath: string): string {
    const index = filePath.lastIndexOf('/');
    return index >= 0 ? filePath.slice(0, index) : '';
  }

  private createGoogleClient(): TextToSpeechClient | null {
    const credentialsJson = process.env.GOOGLE_TTS_CREDENTIALS_JSON;

    if (credentialsJson) {
      try {
        const credentials = JSON.parse(credentialsJson) as {
          client_email: string;
          private_key: string;
        };

        return new TextToSpeechClient({ credentials });
      } catch (error) {
        this.logger.error(
          `GOOGLE_TTS_CREDENTIALS_JSON invalido: ${this.toErrorMessage(error)}`,
        );
        return null;
      }
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return new TextToSpeechClient();
    }

    return null;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}