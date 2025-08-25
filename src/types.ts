export type FRItem = { id: number; prompt: string; answer: string };
export type MCQItem = { id: number; prompt: string; answer: string; choices?: string[] };
export type TestSection = { name: string; items: Array<FRItem | MCQItem> };
export type TestStartResponse = { testId: string; sections: TestSection[] };

export type SubmitResult = {
  testId: string;
  score: number;
  sectionBreakdown: Array<{ section: string; correct: number; total: number }>;
  feedback: string[];
};
