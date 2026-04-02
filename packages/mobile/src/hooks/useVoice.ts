import { useState, useEffect, useCallback } from 'react';
import VoiceService from '../services/voice';

export const useVoice = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleStart = () => setIsListening(true);
    const handleEnd = () => setIsListening(false);
    const handleResults = (data: string[]) => setResults(data ?? []);
    const handleError = (err: string) => {
      setError(err);
      setIsListening(false);
    };

    VoiceService.on('start', handleStart);
    VoiceService.on('end', handleEnd);
    VoiceService.on('results', handleResults);
    VoiceService.on('error', handleError);

    return () => {
      VoiceService.off('start', handleStart);
      VoiceService.off('end', handleEnd);
      VoiceService.off('results', handleResults);
      VoiceService.off('error', handleError);
    };
  }, []);

  const speak = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);
      await VoiceService.speak(text);
      setIsSpeaking(false);
    } catch (err) {
      console.error('Error speaking:', err);
      setIsSpeaking(false);
    }
  }, []);

  const startListening = useCallback(async () => {
    try {
      setResults([]);
      setError(null);
      await VoiceService.startListening();
    } catch (err: any) {
      setError(err?.message || 'Error starting voice recognition');
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      await VoiceService.stopListening();
    } catch (err) {
      console.error('Error stopping listening:', err);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      await VoiceService.stop();
      setIsSpeaking(false);
    } catch (err) {
      console.error('Error stopping speech:', err);
    }
  }, []);

  return {
    isSpeaking,
    isListening,
    results,
    error,
    speak,
    startListening,
    stopListening,
    stop,
  };
};