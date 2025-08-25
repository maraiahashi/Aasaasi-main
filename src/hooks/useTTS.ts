/**
 * Text-to-Speech Hook
 * React hook wrapper for the TextToSpeechService
 */

import { useState, useCallback, useEffect } from 'react';
import { TextToSpeechService, SpeechOptions, TTSState } from '@/services/TextToSpeechService';

interface UseTTSResult extends TTSState {
  speak: (text: string, options?: SpeechOptions) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  availableVoices: ReadonlyArray<SpeechSynthesisVoice>;
}

export const useTTS = (): UseTTSResult => {
  const [ttsState, setTTSState] = useState<TTSState>({
    isPlaying: false,
    isSupported: false
  });
  
  const [availableVoices, setAvailableVoices] = useState<ReadonlyArray<SpeechSynthesisVoice>>([]);
  const ttsService = TextToSpeechService.getInstance();

  useEffect(() => {
    setTTSState({
      isPlaying: ttsService.currentPlayState,
      isSupported: ttsService.isSupported
    });

    // Load available voices
    if (ttsService.isSupported) {
      const voices = ttsService.getAvailableVoices();
      setAvailableVoices(voices);

      // Some browsers load voices asynchronously
      if (voices.length === 0) {
        const voicesChangedHandler = () => {
          setAvailableVoices(ttsService.getAvailableVoices());
        };
        window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
        
        return () => {
          window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        };
      }
    }
  }, [ttsService]);

  const speak = useCallback((text: string, options: SpeechOptions = {}) => {
    ttsService.speak(
      text,
      options,
      () => setTTSState(prev => ({ ...prev, isPlaying: true })),
      () => setTTSState(prev => ({ ...prev, isPlaying: false })),
      (error) => {
        console.error('[useTTS] Speech synthesis error:', error);
        setTTSState(prev => ({ ...prev, isPlaying: false }));
      }
    );
  }, [ttsService]);

  const stop = useCallback(() => {
    ttsService.stop();
    setTTSState(prev => ({ ...prev, isPlaying: false }));
  }, [ttsService]);

  const pause = useCallback(() => {
    ttsService.pause();
  }, [ttsService]);

  const resume = useCallback(() => {
    ttsService.resume();
  }, [ttsService]);

  return {
    ...ttsState,
    speak,
    stop,
    pause,
    resume,
    availableVoices
  };
};