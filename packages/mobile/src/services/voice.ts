import * as Speech from 'expo-speech';
import Voice from '@react-native-voice/voice';
import { Platform } from 'react-native';

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
    const finalConfig = { ...defaultConfig, ...config };
    this.isSpeaking = true;

    return new Promise((resolve) => {
      Speech.speak(text, {
        language: finalConfig.language,
        pitch: finalConfig.pitch,
        rate: finalConfig.rate,
        onDone: () => {
          this.isSpeaking = false;
          resolve();
        },
        onError: () => {
          this.isSpeaking = false;
          resolve();
        },
      });
    });
  }

  async stop(): Promise<void> {
    if (this.isSpeaking) {
      await Speech.stop();
      this.isSpeaking = false;
    }
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