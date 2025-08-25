/**
 * Text-to-Speech Service
 * Encapsulates speech synthesis functionality with proper error handling
 */

export interface SpeechOptions {
  readonly rate?: number;
  readonly pitch?: number;
  readonly volume?: number;
  readonly voice?: string;
}

export interface TTSState {
  readonly isPlaying: boolean;
  readonly isSupported: boolean;
}

class TextToSpeechService {
  private static instance: TextToSpeechService;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPlaying: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): TextToSpeechService {
    if (!TextToSpeechService.instance) {
      TextToSpeechService.instance = new TextToSpeechService();
    }
    return TextToSpeechService.instance;
  }

  public get isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public get currentPlayState(): boolean {
    return this.isPlaying;
  }

  public speak(
    text: string, 
    options: SpeechOptions = {},
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: SpeechSynthesisErrorEvent) => void
  ): void {
    if (!this.isSupported) {
      console.warn('[TTS] Speech synthesis not supported in this environment');
      return;
    }

    if (this.isPlaying) {
      this.stop();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure speech parameters
    utterance.rate = options.rate ?? 0.8;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;

    // Set up event handlers
    utterance.onstart = () => {
      this.isPlaying = true;
      onStart?.();
    };

    utterance.onend = () => {
      this.isPlaying = false;
      this.currentUtterance = null;
      onEnd?.();
    };

    utterance.onerror = (event) => {
      this.isPlaying = false;
      this.currentUtterance = null;
      onError?.(event);
      console.error('[TTS] Speech synthesis error:', event);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  public stop(): void {
    if (this.isSupported && this.isPlaying) {
      window.speechSynthesis.cancel();
      this.isPlaying = false;
      this.currentUtterance = null;
    }
  }

  public pause(): void {
    if (this.isSupported && this.isPlaying) {
      window.speechSynthesis.pause();
    }
  }

  public resume(): void {
    if (this.isSupported && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  public getAvailableVoices(): ReadonlyArray<SpeechSynthesisVoice> {
    if (!this.isSupported) {
      return [];
    }
    return window.speechSynthesis.getVoices();
  }
}

export { TextToSpeechService };