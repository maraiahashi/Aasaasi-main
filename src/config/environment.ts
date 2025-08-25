/**
 * Environment configuration for the Aasaasi platform
 * Centralizes all environment variables and provides type safety
 */

// Application metadata
export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'Aasaasi Language Learning Platform',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
} as const;

// Text-to-Speech settings
export const TTS_CONFIG = {
  enabled: import.meta.env.VITE_TTS_ENABLED !== 'false',
  defaultLanguage: import.meta.env.VITE_TTS_DEFAULT_LANGUAGE || 'en-US',
} as const;

// Analytics configuration
export const ANALYTICS_CONFIG = {
  enabled: import.meta.env.VITE_ANALYTICS_ENABLED === 'true',
  trackingId: import.meta.env.VITE_ANALYTICS_ID || '',
} as const;

// Storage and data management
export const STORAGE_CONFIG = {
  prefix: import.meta.env.VITE_LOCAL_STORAGE_PREFIX || 'aasaasi_',
  maxUploadSizeMB: parseInt(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB || '10'),
} as const;

// Feature flags for progressive enhancement
export const FEATURE_FLAGS = {
  adaptiveLearning: import.meta.env.VITE_FEATURE_ADAPTIVE_LEARNING !== 'false',
  learningTutor: import.meta.env.VITE_FEATURE_LEARNING_TUTOR !== 'false',
  voiceRecognition: import.meta.env.VITE_FEATURE_VOICE_RECOGNITION === 'true',
  performanceMetrics: import.meta.env.VITE_SHOW_PERFORMANCE_METRICS === 'true',
} as const;

// API endpoints (for future integrations)
export const API_CONFIG = {
  dictionaryUrl: import.meta.env.VITE_DICTIONARY_API_URL || '',
  translationUrl: import.meta.env.VITE_TRANSLATION_API_URL || '',
} as const;

// Development helpers
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;