// src/hooks/useUserActivity.ts
/* SSR-safe activity shim that powers page UX AND mirrors to backend via lib/activity */

import { getSessionId, logEvent } from "@/lib/activity";

export type ActivityEvent = {
  type: string;
  timestamp: number;
  payload?: Record<string, unknown>;
};

export type QuizResult = {
  name: string;
  correct: number;
  incorrect: number;
  accuracy: number; // 0..100
  timestamp: number;
  incorrectAnswers?: string[];
};

export type ActivitySummary = {
  vocabularyLearned: string[];
  wordsSearched: string[];
  grammarTopicsStudied: string[];
  quizzesTaken: QuizResult[];
  streakDays: number;
  timeSpent: number; // minutes
};

export type Recommendation = {
  type: 'Words' | 'Quiz' | 'Grammar' | 'Practice' | 'Challenge';
  title: string;
  description: string;
  href: string;
  cta?: string;
};

const EVENTS_KEY = '__aasaasi_activity__';
const COUNTERS_KEY = '__aasaasi_counters__';

const isBrowser =
  typeof window !== 'undefined' && typeof localStorage !== 'undefined';

/* ---------- storage helpers (SSR-safe) ---------- */
function readEventsLS(): ActivityEvent[] {
  if (!isBrowser) return [];
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
  } catch {
    return [];
  }
}
function writeEventsLS(e: ActivityEvent[]) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(e.slice(-200)));
  } catch {}
}

function readCounters(): Record<string, number> {
  if (!isBrowser) return {};
  try {
    return JSON.parse(localStorage.getItem(COUNTERS_KEY) || '{}');
  } catch {
    return {};
  }
}
function writeCounters(c: Record<string, number>) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(COUNTERS_KEY, JSON.stringify(c));
  } catch {}
}

/* ---------- aggregation (tolerant to old payload shapes) ---------- */
function aggregateActivity(
  events: ActivityEvent[],
  counters: Record<string, number>
): ActivitySummary {
  const vocabularyLearned = new Set<string>();
  const wordsSearched = new Set<string>();
  const grammarTopicsStudied = new Set<string>();
  const quizzesTaken: QuizResult[] = [];
  let timeSpent = counters.timeSpent ?? 0;
  let streakDays = counters.streakDays ?? 0;

  for (const ev of events) {
    switch (ev.type) {
      case 'vocab_marked':
      case 'vocab_learned': {
        const w = (ev.payload?.word as string) || (ev.payload?.term as string);
        if (typeof w === "string" && w) vocabularyLearned.add(w);
        break;
      }
      case 'word_searched': {
        const q = (ev.payload?.word as string) || (ev.payload?.query as string);
        if (typeof q === "string" && q) wordsSearched.add(q);
        break;
      }
      case 'grammar_studied':
      case 'grammar_topic_studied': {
        const t = ev.payload?.topic as string;
        if (typeof t === "string" && t) grammarTopicsStudied.add(t);
        break;
      }
      case 'quiz_completed': {
        const correct = Number(ev.payload?.correct ?? 0);
        const incorrect = Number(ev.payload?.incorrect ?? 0);
        const accuracy = Number(ev.payload?.accuracy ?? 0);
        const qr: QuizResult = {
          name: String(ev.payload?.name ?? 'Quiz'),
          correct,
          incorrect,
          accuracy,
          incorrectAnswers: Array.isArray(ev.payload?.incorrectAnswers)
            ? (ev.payload?.incorrectAnswers as string[])
            : undefined,
          timestamp: ev.timestamp,
        };
        quizzesTaken.push(qr);
        break;
      }
      case 'time_spent_min':
        timeSpent += Number(ev.payload?.minutes ?? 0);
        break;
      case 'streak_increment':
        streakDays += 1;
        break;
      default:
        break;
    }
  }

  return {
    vocabularyLearned: [...vocabularyLearned],
    wordsSearched: [...wordsSearched],
    grammarTopicsStudied: [...grammarTopicsStudied],
    quizzesTaken,
    streakDays,
    timeSpent,
  };
}

/* ---------- public hook API used by pages ---------- */
export function useUserActivity() {
  const sessionId = getSessionId();

  // generic local logger (preserves your existing UI expectations)
  const trackLocal = (type: string, payload?: Record<string, unknown>) => {
    if (!isBrowser) return;
    const evts = readEventsLS();
    evts.push({ type, payload, timestamp: Date.now() });
    writeEventsLS(evts);
  };

  // mirror increment counters used by your UI
  const increment = (key: string, by = 1) => {
    if (!isBrowser) return;
    const c = readCounters();
    c[key] = (c[key] || 0) + by;
    writeCounters(c);
  };

  // === High-level helpers your pages call ===

  // Test page helper
  const trackQuizCompletion = async (
    name: string,
    correct: number,
    accuracy: number,
    incorrectAnswers: string[] = []
  ) => {
    const incorrect = Math.max(0, incorrectAnswers.length);
    // 1) keep your local UX data
    trackLocal('quiz_completed', { name, correct, accuracy, incorrect, incorrectAnswers });
    // 2) mirror to backend (and local dashboard store) in normalized shape
    await logEvent(sessionId, "quiz_completed", {
      name,
      correct,
      accuracy,
      score: accuracy,                // backend summary will pick accuracy or score
      total: correct + incorrect,
      weak_grammar: incorrectAnswers, // optional
    });
  };

  // Dictionary
  const trackWordSearch = async (query: string) => {
    trackLocal('word_searched', { word: query.toLowerCase() });
    await logEvent(sessionId, "word_searched", { word: query.toLowerCase() });
  };

  // Optional: time spent minutes
  const trackTimeSpent = async (minutes: number) => {
    trackLocal('time_spent_min', { minutes });
    await logEvent(sessionId, "time_spent", { seconds: Math.round(minutes * 60) });
  };

  // Derive the summary each time the hook is used
  const activity = aggregateActivity(readEventsLS(), readCounters());

  const hasActivity = (): boolean => {
    return (
      activity.vocabularyLearned.length > 0 ||
      activity.wordsSearched.length > 0 ||
      activity.grammarTopicsStudied.length > 0 ||
      activity.quizzesTaken.length > 0 ||
      activity.streakDays > 0 ||
      activity.timeSpent > 0
    );
  };

  const getPersonalizedRecommendations = (): Recommendation[] => {
    const recs: Recommendation[] = [];

    if (activity.vocabularyLearned.length < 10) {
      recs.push({
        type: 'Words',
        title: 'Learn 10 common words',
        description: 'Build momentum with a quick set of high-frequency words.',
        href: '/vocabulary-builder',
        cta: 'Start words',
      });
    }

    if (activity.quizzesTaken.length === 0) {
      recs.push({
        type: 'Quiz',
        title: 'Take your first grammar quiz',
        description: 'Check your baseline and unlock tailored practice.',
        href: '/test-your-english',
        cta: 'Begin quiz',
      });
    }

    const lastAccuracy =
      activity.quizzesTaken.length > 0
        ? activity.quizzesTaken[activity.quizzesTaken.length - 1].accuracy
        : undefined;

    if (lastAccuracy !== undefined && lastAccuracy < 80) {
      recs.push({
        type: 'Practice',
        title: 'Target your weak spots',
        description: 'Practice items based on your recent mistakes.',
        href: '/grammar-wise',
        cta: 'Review now',
      });
    }

    if (activity.grammarTopicsStudied.length < 3) {
      recs.push({
        type: 'Grammar',
        title: 'Grammar mini-lessons',
        description: 'Short lessons to improve accuracy and confidence.',
        href: '/grammar-wise',
        cta: 'Open lessons',
      });
    }

    recs.push({
      type: 'Challenge',
      title: 'Daily Challenge',
      description: 'A quick mixed practice to keep your streak alive.',
      href: '/adaptive-learning',
      cta: 'Take challenge',
    });

    return recs;
  };

  const reset = () => {
    if (!isBrowser) return;
    try {
      localStorage.removeItem(EVENTS_KEY);
      localStorage.removeItem(COUNTERS_KEY);
    } catch {}
  };

  // compatibility aliases
  const track = (type: string, payload?: Record<string, unknown>) => trackLocal(type, payload);
  const logAlias = track;

  return {
    // summary + helpers expected by your pages
    activity,
    hasActivity,
    getPersonalizedRecommendations,

    // specific APIs
    trackQuizCompletion,
    trackWordSearch,
    trackTimeSpent,

    // generic API (kept for compatibility)
    track,
    logEvent: logAlias,
    record: logAlias,
    recordEvent: logAlias,
    increment,
    getEvents: () => readEventsLS(),
    getCounters: () => readCounters(),
    reset,
  };
}

export default useUserActivity;
