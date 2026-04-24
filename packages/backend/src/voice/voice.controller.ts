import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TtsQueryDto } from './dto/tts-query.dto';
import { VoiceService } from './voice.service';

@ApiTags('Voice')
@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @UseGuards(JwtAuthGuard)
  @Get('tts')
  @ApiOperation({
    summary:
      'Gera áudio TTS em pt-BR com cache no Supabase (302 em cache hit, stream em cache miss)',
  })
  @ApiQuery({ name: 'text', required: true, type: String })
  @ApiProduces('audio/mpeg')
  @ApiResponse({
    status: 302,
    description: 'Cache hit: redireciona para URL pública do Supabase Storage',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache miss: retorna stream de áudio MP3',
  })
  async tts(@Query() query: TtsQueryDto, @Res() response: Response): Promise<void> {
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    // Cache TTS audio for 24h, scoped to the authenticated client only
    response.setHeader('Cache-Control', 'private, max-age=86400');
    // TODO: Implement Supabase Storage bucket cleanup for TTS cache (>30 days)
    await this.voiceService.synthesize(query.text, response);
  }
}