/**
 * User activity and progress tracking types
 * Handles learning analytics and personalization
 */

export interface QuizResult {
  readonly type: string;
  readonly score: number;
  readonly accuracy: number;
  readonly timestamp: number;
  readonly incorrectAnswers: ReadonlyArray<string>;
}

export interface UserActivityData {
  readonly wordsSearched: ReadonlyArray<string>;
  readonly quizzesTaken: ReadonlyArray<QuizResult>;
  readonly vocabularyLearned: ReadonlyArray<string>;
  readonly grammarTopicsStudied: ReadonlyArray<string>;
  readonly timeSpent: number;
  readonly lastActivity: number;
  readonly streakDays: number;
  readonly level: 'beginner' | 'intermediate' | 'advanced';
}

export interface LearningRecommendation {
  readonly type: string;
  readonly items: ReadonlyArray<string>;
  readonly reason: string;
  readonly priority: 'high' | 'medium' | 'low';
}