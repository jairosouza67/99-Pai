import * as Speech from 'expo-speech';
import { Audio, type AVPlaybackStatus } from 'expo-av';
import Voice from '@react-native-voice/voice';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

interface VoiceConfig {
  language: string;
  pitch?: number;
  rate?: number;
}

const defaultConfig: VoiceConfig = {
  language: 'pt-BR',
  pitch: 1.0,
  rate: 0.8,
};

export class VoiceService {
  private static instance: VoiceService;
  private isSpeaking = false;
  private isListening = false;
  private currentSound: Audio.Sound | null = null;
  private audioModeConfigured = false;
  private listeners: { [key: string]: ((event: any) => void)[] } = {};

  private constructor() {
    if (Platform.OS !== 'web') {
      Voice.onSpeechStart = () => this.emit('start', {});
      Voice.onSpeechEnd = () => this.emit('end', {});
      Voice.onSpeechResults = (e) => this.emit('results', e?.value ?? []);
      Voice.onSpeechError = (e) => this.emit('error', e?.error ?? 'Unknown error');
    }
  }

  static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  async speak(text: string, config: Partial<VoiceConfig> = {}): Promise<void> {
    const normalizedText = text.trim();
    if (!normalizedText) {
      return;
    }

    const finalConfig = { ...defaultConfig, ...config };
    this.isSpeaking = true;

    try {
      await this.playRemoteTts(normalizedText);
    } catch (error) {
      console.warn('Remote TTS failed, using expo-speech fallback:', error);
      await this.speakWithNative(normalizedText, finalConfig);
    } finally {
      this.isSpeaking = false;
    }
  }

  async stop(): Promise<void> {
    if (this.isSpeaking) {
      await this.stopCurrentSound();
      await Speech.stop();
      this.isSpeaking = false;
    }
  }

  private async playRemoteTts(text: string): Promise<void> {
    await this.ensureAudioMode();
    await this.stopCurrentSound();

    const { data, error } = await supabase.functions.invoke('voice-tts', {
      body: { text },
    });
    if (error) throw new Error(error.message);
    const ttsUri = data.url;

    const { sound } = await Audio.Sound.createAsync(
      { uri: ttsUri },
      {
        shouldPlay: true,
        progressUpdateIntervalMillis: 150,
      },
    );

    this.currentSound = sound;

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const complete = (callback: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        callback();
      };

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) {
          complete(() => {
            void this.stopCurrentSound();
            reject(new Error(status.error || 'Falha ao reproduzir TTS remoto'));
          });
          return;
        }

        if (status.didJustFinish) {
          complete(() => {
            void this.stopCurrentSound();
            resolve();
          });
        }
      });
    });
  }

  private async ensureAudioMode(): Promise<void> {
    if (this.audioModeConfigured) {
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    this.audioModeConfigured = true;
  }

  private async stopCurrentSound(): Promise<void> {
    if (!this.currentSound) {
      return;
    }

    const sound = this.currentSound;
    this.currentSound = null;

    try {
      await sound.stopAsync();
    } catch {
      // No-op: stopping an already stopped sound throws on some platforms.
    }

    try {
      await sound.unloadAsync();
    } catch {
      // No-op: unload may fail if sound was never fully loaded.
    }
  }

  private async speakWithNative(
    text: string,
    config: VoiceConfig,
  ): Promise<void> {
    return new Promise((resolve) => {
      Speech.speak(text, {
        language: config.language,
        pitch: config.pitch,
        rate: config.rate,
        onDone: () => resolve(),
        onError: () => resolve(),
      });
    });
  }

  async startListening(): Promise<void> {
    if (Platform.OS === 'web') {
      console.warn('Voice recognition not supported on web');
      return;
    }

    if (this.isListening) {
      return;
    }

    try {
      await Voice.start('pt-BR');
      this.isListening = true;
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      await Voice.stop();
      this.isListening = false;
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]?.push(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const eventListeners = this.listeners[event];
    if (eventListeners) {
      this.listeners[event] = eventListeners.filter((cb) => cb !== callback);
    }
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners[event];
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  getIsListening(): boolean {
    return this.isListening;
  }
}

export default VoiceService.getInstance();