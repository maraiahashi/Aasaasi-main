// src/components/TTSButton.tsx
import React from 'react';
import { Button } from '@/components/ui';
import { Volume2, VolumeX } from 'lucide-react';
import { useTTS } from '@/hooks/useTTS';

type Variant = 'default' | 'secondary' | 'outline' | 'ghost';
type Size = 'default' | 'sm' | 'lg' | 'icon';

export type TTSButtonProps = {
  text: string;
  className?: string;
  // Accepts "link" from legacy call sites; we normalize it below.
  variant?: Variant | 'link';
  size?: Size;
  voiceHint?: string;
};

const normalizeVariant = (v: TTSButtonProps['variant']): Variant => {
  if (v === 'link') return 'ghost';
  return (v as Variant) ?? 'outline';
};

/**
 * Text-to-speech button for vocabulary and content pronunciation
 * Integrates with Web Speech API for audio playback
 */
export const TTSButton: React.FC<TTSButtonProps> = ({
  text,
  variant = 'outline',
  size = 'sm',
  className = '',
  voiceHint,     
}) => {
  const { speak, stop, isPlaying, isSupported } = useTTS();

  const handleClick = React.useCallback(() => {
    const t = (text ?? '').trim();
    if (!t) return;

    if (isPlaying) {
      stop();
    } else {
      speak(t, { rate: 0.8, voice: 'english' });
    }
  }, [isPlaying, stop, speak, text]);

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      type="button"
      variant={normalizeVariant(variant)}
      size={size}
      onClick={handleClick}
      className={`transition-colors ${className}`}
      disabled={!(text ?? '').trim()}
      aria-label={isPlaying ? 'Stop audio playback' : 'Play audio'}
      aria-pressed={isPlaying}
    >
      {isPlaying ? (
        <>
          <VolumeX className="h-4 w-4 mr-1" />
          Stop
        </>
      ) : (
        <>
          <Volume2 className="h-4 w-4 mr-1" />
          Listen
        </>
      )}
    </Button>
  );
};

export default TTSButton;
