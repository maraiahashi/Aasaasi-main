// src/lib/types.ts
export type SectionInfo = { name: string; count: number };

export type KindInfo = {
  kind: string;           // "wod" | "vocab" | "idiom" | "english"
  total: number;
  sections: SectionInfo[];
};

export type KindsResponse = { kinds: KindInfo[] };

export type StartRequest = { kind: string };
export type SubmitItem = { itemId: string; answer: string };
export type SubmitRequest = { kind: string; answers: SubmitItem[] };

// Simplify the shape of "start test" response
export type TestItem = {
  _id: string;
  question: string;
  options?: string[];     // present for MCQ
  correct?: string;       // (server may omit in production)
  section?: string;
};

export type StartResponse = {
  kind: string;
  items: TestItem[];      // flattened items to render
};
