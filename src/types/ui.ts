/**
 * UI component interfaces and props
 * Defines the contract for reusable components
 */

import React from 'react';

export interface LearningFeature {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly title: string;
  readonly description: string;
  readonly gradient: string;
  readonly path: string;
  readonly status: 'Active' | 'Beta' | 'Coming Soon';
}

export interface PageMetadata {
  readonly title: string;
  readonly description?: string;
  readonly showSearch?: boolean;
}

export interface HeaderComponentProps {
  readonly currentPage?: string;
  readonly onSearch?: (query: string) => void;
  readonly showSearch?: boolean;
}


export type TTSComponentProps = {
  text: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link';
  className?: string;
  /** e.g. 'en-US' or a voice name; forwarded to useTTS */
  voiceHint?: string;
};


export interface AasaasiLogoProps {
  readonly variant?: 'light' | 'dark';
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}

export interface ConversationMessage {
  readonly type: 'user' | 'ai';
  readonly message: string;
  readonly timestamp?: number;
}