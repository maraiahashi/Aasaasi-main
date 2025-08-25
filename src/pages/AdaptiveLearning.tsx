// src/pages/AdaptiveLearning.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Badge, Progress } from "@/components/ui";
import { Brain, BookOpen, Lightbulb, Target, TrendingUp, Star, Check } from "lucide-react";
import { getSessionId, readEvents, clearEvents } from "@/lib/activity";

// -------- config: start at 0 on every full refresh (per your request) -----
const RESET_ON_REFRESH = false;

// ------------ helpers -------------
const arr = <T,>(x: T[] | undefined | null): T[] => (Array.isArray(x) ? x : []);
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const pct = (v: number) => `${clamp(Math.round(v))}%`;
const ymd = (d: Date) => d.toISOString().slice(0, 10);

// ------------ optional backend -------------
type BackendSummary = {
  wordsSearched?: number;
  quizzesCompleted?: number;
  avgAccuracy?: number; // 0..100
  grammarTopics?: number;
  missedWords?: string[];
  trendingWords?: string[];
  weakGrammar?: string[];
};

type DayWord = { word: string; definition?: string; partOfSpeech?: string; date?: string };
type Idiom = { idiom: string; meaning?: string };

const api = {
  async summary(sessionId: string): Promise<BackendSummary | null> {
    try {
      const r = await fetch("/api/analytics/summary", { headers: { "X-Session-Id": sessionId } });
      return r.ok ? r.json() : null;
    } catch {
      return null;
    }
  },
  async wotd(sessionId: string): Promise<DayWord | null> {
    try {
      const r = await fetch("/api/content/word-of-the-day", { headers: { "X-Session-Id": sessionId } });
      if (!r.ok) return null;
      const j = await r.json();
      return j?.word ?? null;
    } catch {
      return null;
    }
  },
  // idiom helper
  async idiom(sessionId: string) {
    try {
      const r = await fetch("/api/idioms/current", { headers: { "X-Session-Id": sessionId } });
      return r.ok ? r.json() : null;
    } catch {
      return null;
    }
  },
};

// ------------ page -------------
const AdaptiveLearning: React.FC = () => {
  const sessionId = useMemo(getSessionId, []);
  const [summary, setSummary] = useState<BackendSummary | null>(null);
  const [wotd, setWotd] = useState<DayWord | null>(null);
  const [idiom, setIdiom] = useState<Idiom | null>(null);
  const [bump, setBump] = useState(0); // bump when events change

  // Per your instruction: start from 0 on every full refresh of this page.
  useEffect(() => {
    if (RESET_ON_REFRESH) clearEvents(sessionId);
  }, [sessionId]);

  // re-read whenever storage/visibility changes
  useEffect(() => {
    const onVis = () => setBump((v) => v + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("aasaasi.events.")) setBump((v) => v + 1);
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("storage", onStorage);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // optional backend content (works even if missing)
  useEffect(() => {
    let dead = false;
    (async () => {
      const [s, dw, idm] = await Promise.all([api.summary(sessionId), api.wotd(sessionId), api.idiom(sessionId)]);
      if (dead) return;
      if (s) setSummary(s);
      if (dw) setWotd(dw);
      if (idm) setIdiom(idm);
    })();
    return () => {
      dead = true;
    };
  }, [sessionId, bump]);

  // read local events
  const events = readEvents(sessionId);

  // stats from events
  const wordsSearched = events.filter((e) => e.type === "word_searched").length;
  const quizEvents = events.filter((e) => e.type === "quiz_completed");
  const grammarTopics = (() => {
    const set = new Set<string>();
    for (const e of events) if (e.type === "grammar_studied" && e.meta?.topic) set.add(String(e.meta.topic));
    return set.size || events.filter((e) => e.type === "grammar_studied").length;
  })();
  const accuracy =
    quizEvents.length === 0
      ? 0
      : Math.round(
          quizEvents.reduce((s, e) => s + (Number(e.meta?.accuracy) || Number(e.meta?.score) || 0), 0) /
            quizEvents.length
        );

  // combine with backend if present (but still start from 0 on fresh load)
  const stats = {
    wordsSearched: summary?.wordsSearched ?? wordsSearched,
    quizzesCompleted: summary?.quizzesCompleted ?? quizEvents.length,
    accuracy: clamp(summary?.avgAccuracy ?? accuracy),
    grammarTopics: summary?.grammarTopics ?? grammarTopics,
  };

  // weekly bars
  const last7 = (() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      const d = (e.at || "").slice(0, 10);
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    const out: { label: string; count: number }[] = [];
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push({ label: names[d.getDay()], count: counts.get(ymd(d)) ?? 0 });
    }
    return out;
  })();

  // recent searches from local events
  const recentWords = events
    .filter((e) => e.type === "word_searched" && e.meta?.word)
    .slice(-8)
    .reverse()
    .map((e) => String(e.meta!.word));

  // recommendations
  const hasHistory = stats.wordsSearched + stats.quizzesCompleted + stats.grammarTopics > 0;
  const recs = (() => {
    const out: { title: string; reason?: string; items: string[]; priority: "high" | "medium" | "low"; icon?: any }[] =
      [];
    if (!hasHistory) {
      out.push({
        title: "Trending Words",
        reason: "Popular this week",
        priority: "medium",
        icon: TrendingUp,
        items: arr(summary?.trendingWords).slice(0, 8),
      });
      out.push({
        title: "Beginner Quiz",
        reason: "A friendly place to start",
        priority: "medium",
        icon: Brain,
        items: ["Basic Vocabulary", "Simple Present"],
      });
      if (wotd) out.push({ title: "Word of the Day", reason: wotd.definition, icon: BookOpen, priority: "low", items: [wotd.word] });
      if (idiom) out.push({ title: "Related Idioms", reason: idiom.meaning, icon: Lightbulb, priority: "low", items: [idiom.idiom] });
      return out;
    }
    const missed = arr(summary?.missedWords);
    if (missed.length) {
      out.push({ title: "Words to Revise", reason: "Based on your mistakes", icon: BookOpen, priority: "high", items: missed.slice(0, 8) });
    } else if (recentWords.length) {
      out.push({ title: "Words to Revise", reason: "From your recent searches", icon: BookOpen, priority: "high", items: recentWords.slice(0, 8) });
    }
    const weak = arr(summary?.weakGrammar);
    if (weak.length) out.push({ title: "Areas to Improve", reason: "From quiz answers", icon: Target, priority: "medium", items: weak.slice(0, 6) });
    out.push({
      title: "New Quizzes",
      reason: stats.accuracy < 60 ? "Build accuracy" : "Keep sharp",
      icon: Brain,
      priority: "medium",
      items: stats.accuracy < 60 ? ["Vocabulary Booster", "Present Tenses"] : ["Mixed Review"],
    });
    if (wotd) out.push({ title: "Word of the Day", reason: wotd.definition, icon: BookOpen, priority: "low", items: [wotd.word] });
    if (idiom) out.push({ title: "Idiom of the Week", reason: idiom.meaning, icon: Lightbulb, priority: "low", items: [idiom.idiom] });
    return out;
  })();

  // badges
  const badges = [
    { title: "Word Collector",  desc: "50+ words",      met: stats.wordsSearched >= 50 },
    { title: "Quiz Master",     desc: "10+ quizzes",    met: stats.quizzesCompleted >= 10 },
    { title: "Streak Keeper",   desc: "7-day learning streak", met: last7.every((d) => d.count > 0) },
    { title: "Vocabulary Expert", desc: "Learn 500 words", met: stats.wordsSearched >= 500 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header currentPage="Adaptive Learning" />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <Card className="mb-6 bg-gradient-to-r from-success to-primary text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold flex items-center justify-center">
                <Brain className="h-8 w-8 mr-3" />
                Adaptive Learning Dashboard
              </CardTitle>
              <p className="text-white/90 mt-2">Personalized suggestions based on your recent learning</p>
            </CardHeader>
          </Card>

          {/* Top stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{stats.wordsSearched}</div><div className="text-muted-foreground">Words Searched</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{stats.quizzesCompleted}</div><div className="text-muted-foreground">Quizzes Done</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className={`text-2xl font-bold ${stats.accuracy === 0 ? "text-red-500":""}`}>{stats.accuracy}%</div><div className="text-muted-foreground">Avg Accuracy</div></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{stats.grammarTopics}</div><div className="text-muted-foreground">Grammar Topics</div></CardContent></Card>
          </div>

          {/* Recent searches */}
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-primary flex items-center gap-2"><BookOpen className="h-6 w-6" />Recent Searches</CardTitle></CardHeader>
            <CardContent>
              {recentWords.length === 0 ? (
                <div className="text-muted-foreground">No searches yet.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {recentWords.map((w, i) => <Badge key={i} variant="outline" className="text-xs">{w}</Badge>)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="mb-10">
            <CardHeader><CardTitle className="text-primary flex items-center gap-2"><Lightbulb className="h-6 w-6" />Recommendations</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {recs.map((rec, i) => {
                  const Icon = (rec.icon || Lightbulb) as any;
                  const side =
                    rec.priority === "high" ? "border-l-red-500" : rec.priority === "medium" ? "border-l-blue-400" : "border-l-green-500";
                  return (
                    <Card key={i} className={`border-l-4 ${side}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Icon className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-primary">{rec.title}</h4>
                              {rec.reason && <p className="text-sm text-muted-foreground mb-2">{rec.reason}</p>}
                              <div className="flex flex-wrap gap-2">
                                {rec.items.length ? rec.items.map((t, k) => (
                                  <Badge key={k} variant="outline" className="text-xs">{t}</Badge>
                                )) : <span className="text-sm text-muted-foreground">Will appear after you start learning.</span>}
                              </div>
                            </div>
                          </div>
                          <Badge variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "secondary"}>
                            {rec.priority}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Weekly + Badges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader><CardTitle className="text-primary">Weekly Learning Activity</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {last7.map((d, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1"><span>{d.label}</span><span>{d.count} words · {pct(d.count * 10)}</span></div>
                    <Progress value={clamp(d.count * 10)} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-primary">Achievement Badges</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {badges.map((b, i) => (
                    <div key={i} className={`rounded-xl border p-4 flex flex-col items-center text-center ${b.met ? "bg-emerald-50 border-emerald-300" : "bg-muted"}`}>
                      <div className="mb-2">{b.met ? <Star className="h-6 w-6 text-emerald-600" /> : <Check className="h-6 w-6 opacity-30" />}</div>
                      <div className="font-semibold">{b.title}</div>
                      <div className="text-xs text-muted-foreground">{b.desc}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* NOTE: Removed the bottom “Vocabulary Progress” and “Grammar Mastery” cards as requested */}
        </div>
      </div>
    </div>
  );
};

export default AdaptiveLearning;