/**
 * Dataset Service
 * Handles Excel/CSV data processing and word lookup functionality
 */

import { WordDefinition, ExcelDataset } from '@/types/core';

interface CSVRowData {
  [key: string]: string;
}

class DatasetService {
  private static instance: DatasetService;
  private loadedDatasets: ExcelDataset[] = [];
  private isProcessing: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): DatasetService {
    if (!DatasetService.instance) {
      DatasetService.instance = new DatasetService();
    }
    return DatasetService.instance;
  }

  public get datasets(): ReadonlyArray<ExcelDataset> {
    return [...this.loadedDatasets];
  }

  public get isLoading(): boolean {
    return this.isProcessing;
  }

  private parseCSVContent(csvText: string): CSVRowData[] {
    const lines = csvText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (lines.length === 0) {
      return [];
    }
    
    const headers = lines[0]
      .split(',')
      .map(header => header.trim().replace(/"/g, ''));
    
    return lines.slice(1).map(line => {
      const values = line
        .split(',')
        .map(value => value.trim().replace(/"/g, ''));
      
      const rowData: CSVRowData = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });
      
      return rowData;
    });
  }

  private transformRowToWordDefinition(row: CSVRowData): WordDefinition {
    return {
      word: row.word || row.Word || '',
      pronunciation: row.pronunciation || row.Pronunciation || undefined,
      partOfSpeech: row.partOfSpeech || row['Part of Speech'] || undefined,
      definition: row.definition || row.Definition || '',
      somaliTranslation: row.somaliTranslation || row['Somali Translation'] || row.somali || '',
      level: row.level || row.Level || undefined,
      examples: row.examples ? row.examples.split(';').map(ex => ex.trim()) : undefined,
      etymology: row.etymology || row.Etymology || undefined,
      synonyms: row.synonyms ? row.synonyms.split(',').map(syn => syn.trim()) : undefined
    };
  }

  public async processDatasetFiles(fileList: FileList): Promise<void> {
    this.isProcessing = true;
    const newDatasets: ExcelDataset[] = [];

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        
        if (this.isCSVFile(file)) {
          const dataset = await this.processCSVFile(file);
          if (dataset) {
            newDatasets.push(dataset);
          }
        }
      }

      this.loadedDatasets = [...this.loadedDatasets, ...newDatasets];
    } catch (error) {
      console.error('[DatasetService] Error processing files:', error);
      throw new Error('Failed to process dataset files');
    } finally {
      this.isProcessing = false;
    }
  }

  private isCSVFile(file: File): boolean {
    return file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
  }

  private async processCSVFile(file: File): Promise<ExcelDataset | null> {
    try {
      const csvContent = await file.text();
      const rawData = this.parseCSVContent(csvContent);
      
      if (rawData.length === 0) {
        console.warn(`[DatasetService] No data found in file: ${file.name}`);
        return null;
      }

      const words = rawData
        .map(row => this.transformRowToWordDefinition(row))
        .filter(word => word.word && word.definition); // Only include valid entries

      return {
        name: file.name.replace('.csv', ''),
        words
      };
    } catch (error) {
      console.error(`[DatasetService] Error processing file ${file.name}:`, error);
      return null;
    }
  }

  public searchWords(searchQuery: string): ReadonlyArray<WordDefinition> {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    if (!normalizedQuery) {
      return [];
    }

    const allWords = this.loadedDatasets.flatMap(dataset => dataset.words);
    
    return allWords.filter(word => 
      word.word.toLowerCase().includes(normalizedQuery) ||
      word.definition.toLowerCase().includes(normalizedQuery) ||
      word.somaliTranslation.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * Get a random word from all loaded datasets
   * Supports filtering by difficulty level and learning goals
   */
  public getRandomWord(level?: string, excludeWords?: ReadonlyArray<string>): WordDefinition | null {
    let availableWords = this.loadedDatasets.flatMap(dataset => dataset.words);
    
    // Filter by level if specified
    if (level) {
      availableWords = availableWords.filter(word => word.level === level);
    }
    
    // Exclude already learned words
    if (excludeWords && excludeWords.length > 0) {
      availableWords = availableWords.filter(word => 
        !excludeWords.includes(word.word.toLowerCase())
      );
    }
    
    if (availableWords.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * availableWords.length);
    return availableWords[randomIndex];
  }

  /**
   * Get words similar to a given word (by part of speech or semantic similarity)
   */
  public getSimilarWords(targetWord: string, limit: number = 5): ReadonlyArray<WordDefinition> {
    const allWords = this.loadedDatasets.flatMap(dataset => dataset.words);
    const word = allWords.find(w => w.word.toLowerCase() === targetWord.toLowerCase());
    
    if (!word) return [];
    
    // Find words with same part of speech
    const similarWords = allWords.filter(w => 
      w.word !== word.word && 
      w.partOfSpeech === word.partOfSpeech
    );
    
    // Shuffle and limit results
    return similarWords
      .sort(() => Math.random() - 0.5)
      .slice(0, limit);
  }

  /**
   * Get comprehensive statistics about loaded datasets
   */
  public getWordStatistics() {
    const allWords = this.loadedDatasets.flatMap(dataset => dataset.words);
    const partOfSpeechCounts: Record<string, number> = {};
    const levelCounts: Record<string, number> = {};
    
    allWords.forEach(word => {
      if (word.partOfSpeech) {
        partOfSpeechCounts[word.partOfSpeech] = (partOfSpeechCounts[word.partOfSpeech] || 0) + 1;
      }
      if (word.level) {
        levelCounts[word.level] = (levelCounts[word.level] || 0) + 1;
      }
    });
    
    return {
      totalWords: allWords.length,
      totalDatasets: this.loadedDatasets.length,
      partOfSpeechDistribution: partOfSpeechCounts,
      levelDistribution: levelCounts,
      averageExamplesPerWord: allWords.reduce((sum, word) => 
        sum + (word.examples?.length || 0), 0) / allWords.length
    };
  }

  public getWordsByLevel(level: string): ReadonlyArray<WordDefinition> {
    const allWords = this.loadedDatasets.flatMap(dataset => dataset.words);
    return allWords.filter(word => word.level?.toLowerCase() === level.toLowerCase());
  }

  public clearAllDatasets(): void {
    this.loadedDatasets = [];
  }
}

export { DatasetService };