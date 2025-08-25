// src/pages/GrammarWise.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";
import { Button } from "@/components/ui";
import { Header } from "@/components/Header";
import { BookOpen } from "lucide-react";
import { getSessionId, logEvent } from "@/lib/activity";
import { TTSButton } from "@/components/TTSButton";

type TopicDoc = {
  slug: string;
  title: string;          // "advice vs advise"
  words: string[];
  pronunciation?: string;
  meanings: Record<string,string>;
  usage_en: Record<string,string>;
  usage_so: Record<string,string>;
  examples: string[];
};

type TestQuestion = {
  topic: string;
  text: string;
  options: string[];
  answerIndex: number; // 0
};

const GrammarWise = () => {
  const sessionId = useMemo(() => getSessionId(), []);
  const [topics, setTopics] = useState<TopicDoc[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showTest, setShowTest] = useState(false);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const current = topics[currentIdx];

  useEffect(() => {
    fetch("/api/grammar/topics")
      .then(r => r.json())
      .then(data => setTopics(Array.isArray(data?.topics) ? data.topics : []))
      .catch(() => setTopics([]));
  }, []);

  useEffect(() => {
    if (!current) return;
    // prefetch questions for this topic
    fetch(`/api/grammar/test?topic=${encodeURIComponent(current.slug)}`)
      .then(r => r.json())
      .then(data => setQuestions(Array.isArray(data?.questions) ? data.questions : []))
      .catch(() => setQuestions([]));
  }, [current?.slug]);

  const onSeeNext = async () => {
    const next = Math.min(currentIdx + 1, Math.max(0, topics.length - 1));
    if (current) {
      await logEvent(sessionId, "grammar_studied", { topic: current.slug, action: "next_tip" });
    }
    setCurrentIdx(next);
  };

  const onSeePrev = async () => {
    const prev = Math.max(0, currentIdx - 1);
    if (current) {
      await logEvent(sessionId, "grammar_studied", { topic: current.slug, action: "prev_tip" });
    }
    setCurrentIdx(prev);
  };

  const onStartTest = async () => {
    if (current) {
      await logEvent(sessionId, "grammar_studied", { topic: current.slug, action: "start_test" });
    }
    setShowTest(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header currentPage="GrammarWise" />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8 bg-gradient-to-r from-success to-primary text-white">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <BookOpen className="h-6 w-6" />
                <CardTitle className="text-3xl">GrammarWise</CardTitle>
              </div>
              <CardDescription className="text-white/90 text-lg">
                Learn and improve your grammar with clear tips and examples
              </CardDescription>
            </CardHeader>
          </Card>

          {!current ? (
            <Card className="shadow-lg"><CardContent className="p-6">Loading topics…</CardContent></Card>
          ) : !showTest ? (
            <>
              {/* Tip card */}
              <Card className="shadow-lg mb-6">
                <CardHeader>
                  <CardTitle className="text-2xl text-primary">{current.title}</CardTitle>
                  <CardDescription>Do you know the difference?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {current.words.map((w) => (
                    <div key={w}>
                      {/* MAIN WORD + AUDIO (only here) */}
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">{w}</div>
                        <TTSButton text={w} size="sm" />
                      </div>

                      {/* meanings/usage (no audio here) */}
                      <div className="text-muted-foreground">{current.meanings[w]}</div>
                      <div className="mt-2">
                        <div className="text-sm">Usage (English):</div>
                        <p className="text-muted-foreground">{current.usage_en[w]}</p>
                      </div>
                      <div className="mt-2">
                        <div className="text-sm">Soomaali ku baro:</div>
                        <p className="text-muted-foreground">{current.usage_so[w]}</p>
                      </div>
                    </div>
                  ))}

                  {Array.isArray(current.examples) && current.examples.length > 0 && (
                    <div>
                      <div className="font-semibold mb-2">Examples</div>
                      <ul className="space-y-1">
                        {current.examples.map((ex, i) => (
                          <li key={i} className="text-muted-foreground">• {ex}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-between mb-8">
                <Button variant="outline" onClick={onSeePrev} disabled={currentIdx === 0}>
                  Previous Tip
                </Button>
                <Button onClick={onSeeNext} disabled={currentIdx === topics.length - 1}>
                  Next Tip
                </Button>
              </div>

              <div className="text-center">
                <Button onClick={onStartTest} className="h-16 px-8 text-lg bg-primary hover:bg-primary-hover">
                  Take Grammar Test
                </Button>
              </div>
            </>
          ) : (
            <GrammarTest
              topicSlug={current.slug}
              questions={questions}
              onBack={async () => {
                await logEvent(sessionId, "grammar_studied", { topic: current.slug, action: "back_to_tips" });
                setShowTest(false);
              }}
              onFinish={async (scorePct: number) => {
                await logEvent(sessionId, "quiz_completed", { topic: current.slug, scorePct });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GrammarWise;

/* --- tiny inline test component to avoid breaking your design --- */
function GrammarTest({
  topicSlug, questions, onBack, onFinish
}: { topicSlug: string; questions: TestQuestion[]; onBack: () => void; onFinish: (s:number)=>void; }) {
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);

  if (!questions.length) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6">
          No questions yet for this topic.
          <div className="mt-4"><Button variant="outline" onClick={onBack}>Back to Tips</Button></div>
        </CardContent>
      </Card>
    );
  }

  const q = questions[i];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Quiz: {topicSlug.replace(/-/g," ")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-lg">{q.text}</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {q.options.map((opt, idx) => (
            <Button key={idx} variant="outline" onClick={() => {
              if (idx === q.answerIndex) setCorrect(c => c + 1);
              if (i < questions.length - 1) setI(i + 1);
              else {
                const pct = Math.round(((idx === q.answerIndex ? correct + 1 : correct) / questions.length) * 100);
                onFinish(pct);
                onBack();
              }
            }}>
              {opt}
            </Button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          Question {i+1} of {questions.length} • Correct so far: {correct}
        </div>
        <div><Button variant="outline" onClick={onBack}>Back to Tips</Button></div>
      </CardContent>
    </Card>
  );
}
