/**
 * Core data types for the Aasaasi language learning platform
 * Contains the fundamental entities used throughout the application
 */

export interface WordDefinition {
  word: string;
  definition: string;


  pronunciation?: string;
  partOfSpeech?: string;
  somaliTranslation?: string;
  examples?: string[];


  etymology?: string;
  synonyms?: string[];
  
  
  level?: string;
}

export interface IdiomDefinition {
  readonly idiom: string;
  readonly meaning: string;
  readonly somaliTranslation: string;
  readonly example: string;
  readonly origin: string;
  readonly week: string;
}

export interface ExcelDataset {
  readonly name: string;
  readonly words: ReadonlyArray<WordDefinition>;
}

// Search and filtering capabilities
export interface SearchFilter {
  readonly query: string;
  readonly language: 'english' | 'somali';
  readonly partOfSpeech?: string;
  readonly level?: string;
}