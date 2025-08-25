// src/hooks/useExcelData.ts
import { useCallback } from "react";

export type WordDefinition = {
  word: string;
  pronunciation?: string;
  partOfSpeech?: string;
  definition: string;
  somaliTranslation?: string;
  examples?: string[];
  level?: string;
};

export type ExcelDataset = {
  name: string;
  rows: WordDefinition[];
};

type UseExcelDataResult = {
  readonly datasets: ReadonlyArray<ExcelDataset>;
  readonly isLoading: boolean;
  readonly loadDatasets: (files: FileList) => Promise<void>;
  readonly searchWords: (query: string) => ReadonlyArray<WordDefinition>;
  readonly getRandomWord: () => WordDefinition | null;
  readonly getWordsByLevel: (level: string) => ReadonlyArray<WordDefinition>;
  readonly clearAllDatasets: () => void;
};

// Tiny built-in demo so searches always show something
const DEMO: WordDefinition[] = [
  {
    word: "hello",
    pronunciation: "/həˈloʊ/",
    partOfSpeech: "exclamation",
    definition: "Used as a greeting or to begin a conversation.",
    somaliTranslation: "salaan",
    examples: ["Hello, how are you?", "She said hello to everyone."],
    level: "A1",
  },
  {
    word: "book",
    pronunciation: "/bʊk/",
    partOfSpeech: "noun",
    definition:
      "A written or printed work consisting of pages bound together.",
    somaliTranslation: "buug",
    examples: ["I'm reading a good book.", "She wrote a book about her travels."],
    level: "A1",
  },
];

const DATASETS: ExcelDataset[] = [{ name: "demo", rows: DEMO }];

export const useExcelData = (): UseExcelDataResult => {
  const searchWords = useCallback((query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    // search demo (and later, merge with any loaded datasets you add)
    return DEMO.filter(
      (r) =>
        r.word.toLowerCase().includes(q) ||
        (r.somaliTranslation ?? "").toLowerCase().includes(q)
    );
  }, []);

  // Stubs that keep the same API; easy to extend later
  const loadDatasets = useCallback(async (_files: FileList) => {
    // TODO: parse Excel/CSV and push into DATASETS[0].rows
    return;
  }, []);

  const clearAllDatasets = useCallback(() => {
    // If you add real loading, clear your in-memory list here
    return;
  }, []);

  const getRandomWord = useCallback(() => {
    if (DEMO.length === 0) return null;
    return DEMO[Math.floor(Math.random() * DEMO.length)];
  }, []);

  const getWordsByLevel = useCallback((level: string) => {
    const lvl = level.trim().toLowerCase();
    return DEMO.filter((r) => (r.level ?? "").toLowerCase() === lvl);
  }, []);

  return {
    datasets: DATASETS,
    isLoading: false,
    loadDatasets,
    searchWords,
    getRandomWord,
    getWordsByLevel,
    clearAllDatasets,
  };
};
