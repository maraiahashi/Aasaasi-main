// src/pages/
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TTSButton } from "@/components/TTSButton";
import { getSessionId } from "@/lib/activity";
import { useUserActivity } from "@/hooks/useUserActivity";

type RemoteQuestion = {
  id: string;
  question: string;
  options: string[];
};

type GradeDetail = {
  id: string;
  question: string;
  selected: string;
  correct: string;
  isCorrect: boolean;
  quick3?: string | null; // "Beginner" | "Intermediate" | "Advanced"
  level6?: string | null; // "A1" | ... | "C1"
};

type GradeResult = {
  score: number;
  correct: number;
  total: number;
  estimatedLevel: { quick3?: string | null; cefr6?: string | null };
  feedback: string;
  details: GradeDetail[];
};

type Quick3 = "Beginner" | "Intermediate" | "Advanced";

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ------------ Quick placement (per your spec) ------------------ */

function passBand(served: number, correct: number) {
  if (served < 3) return false;                          // need enough signal
  const need = Math.max(3, Math.ceil(0.75 * served));    // ~75% pass
  return correct >= need;
}

function computeQuickPlacement(details: GradeDetail[]) {
  const served: Record<Quick3, number> = {
    Beginner: 0,
    Intermediate: 0,
    Advanced: 0,
  };
  const correct: Record<Quick3, number> = {
    Beginner: 0,
    Intermediate: 0,
    Advanced: 0,
  };

  for (const d of details) {
    const band = (d.quick3 || "") as Quick3;
    if (band === "Beginner" || band === "Intermediate" || band === "Advanced") {
      served[band] += 1;
      if (d.isCorrect) correct[band] += 1;
    }
  }

  const passB = passBand(served.Beginner, correct.Beginner);
  const passI = passBand(served.Intermediate, correct.Intermediate);
  const passA = passBand(served.Advanced, correct.Advanced);

  let quickLevel: Quick3 | "—" = "—";
  if (passA && passI) quickLevel = "Advanced";
  else if (passI && passB) quickLevel = "Intermediate";
  else if (passB) quickLevel = "Beginner";

  return { quickLevel, served, correct };
}

/* --------------------------------------------------------------- */

const EnglishTests = () => {
  const sessionId = useMemo(getSessionId, []);
  const { trackQuizCompletion } = useUserActivity();

  const [questions, setQuestions] = useState<RemoteQuestion[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");

  const doneCount = Object.keys(selected).length;
  const progress = questions.length ? (doneCount / questions.length) * 100 : 0;

  // fetch & shuffle questions
  useEffect(() => {
    (async () => {
      try {
        // ask for 12 to align with the “quick 12 mixed” idea; backend may return <=12
        const res = await fetch("/api/english-test/questions?limit=12");
        if (!res.ok) throw new Error("Failed to fetch questions");
        const data = await res.json();
        setQuestions(shuffle(data.questions || []));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSelect = (qid: string, opt: string) => {
    setSelected((prev) => ({ ...prev, [qid]: opt }));
  };

  const onSubmit = async () => {
    if (!questions.length) return;
    setSubmitting(true);
    try {
      const answers = questions.map((q) => ({ qid: q.id, selected: selected[q.id] }));
      const res = await fetch("/api/english-test/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data: GradeResult = await res.json();

      // Compute corrected quick placement based on current attempt only
      const quick = computeQuickPlacement(data.details || []);
      // Keep backend feedback/CEFR, but override quick3 display with our computed value
      const patched: GradeResult = {
        ...data,
        estimatedLevel: {
          quick3: quick.quickLevel === "—" ? data.estimatedLevel.quick3 : quick.quickLevel,
          cefr6: data.estimatedLevel.cefr6,
        },
      };
      setResult(patched);

      // analytics (same as before)
      trackQuizCompletion(
        "English Proficiency Test",
        data.correct,
        data.score,
        (data.details || [])
          .filter((d) => !d.isCorrect)
          .map((d) => d.quick3 || d.level6 || "Mixed")
      );
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const askAIForFeedback = async () => {
    if (!result || aiLoading) return;
    setAiLoading(true);
    setAiText("");
    try {
      const wrong = result.details.filter((d) => !d.isCorrect);
      const prompt =
        `I'm assessing an English quiz result.\n` +
        `Score: ${result.correct}/${result.total} (${result.score}%).\n` +
        `Estimated level: quick3=${result.estimatedLevel.quick3 || "—"}, CEFR=${result.estimatedLevel.cefr6 || "—"}.\n` +
        `List of mistakes (Q — selected ➜ correct):\n` +
        wrong.map((d, i) => `${i + 1}. ${d.question} — "${d.selected}" ➜ "${d.correct}"`).join("\n") +
        `\nGive concise, encouraging feedback for a Somali learner:\n` +
        `1) 3–5 key themes to improve\n2) Mini-lessons or tips for each theme\n3) 3 short practice prompts.\n` +
        `Keep it clear, friendly, and in Markdown.`;
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
        body: JSON.stringify({ message: prompt }),
      });
      const j = await r.json();
      setAiText(j?.reply || "No feedback available.");
    } catch (e: any) {
      setAiText(`Sorry—AI feedback is unavailable (${e?.message || "error"}).`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header currentPage="English Tests" />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero (no emoji, consistent with other pages) */}
        <Card className="mb-8 bg-gradient-to-r from-warning to-accent text-white">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Test Your English</CardTitle>
          </CardHeader>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Proficiency Assessment</CardTitle>
            <Progress value={progress} />
          </CardHeader>

          <CardContent className="space-y-6">
            {loading && <div>Loading questions…</div>}
            {!loading && questions.length === 0 && <div>No questions available.</div>}

            {!loading &&
              questions.map((q, i) => (
                <div key={q.id} className="space-y-3">
                  <h3 className="text-lg font-semibold">
                    {i + 1}. {q.question}
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt, j) => {
                      const isSel = selected[q.id] === opt;
                      return (
                        <Button
                          key={j}
                          variant={isSel ? "default" : "outline"}
                          className="justify-start h-auto p-4"
                          onClick={() => onSelect(q.id, opt)}
                        >
                          {String.fromCharCode(65 + j)}. {opt}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}

            <Button
              onClick={onSubmit}
              disabled={
                loading ||
                submitting ||
                questions.length === 0 ||
                Object.keys(selected).length !== questions.length
              }
              className="w-full bg-primary hover:bg-primary/90"
            >
              {submitting ? "Submitting…" : "Submit Test"}
            </Button>

            {result && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-success/10 border border-success rounded-lg space-y-2">
                  <div className="font-semibold text-success">
                    Score: {result.correct}/{result.total} ({result.score}%)
                  </div>
                  <div>Quick level: {result.estimatedLevel.quick3 || "—"}</div>
                  <div>CEFR: {result.estimatedLevel.cefr6 || "—"}</div>
                  <div className="text-sm text-muted-foreground">{result.feedback}</div>

                  {/* Only “Ask AI for feedback”—removed View Recommendations */}
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" onClick={askAIForFeedback} disabled={aiLoading}>
                      {aiLoading ? "Thinking…" : "Ask AI for feedback"}
                    </Button>
                  </div>
                </div>

                {/* Per-question review */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl text-primary">Review</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.details.map((d, idx) => (
                      <div
                        key={d.id}
                        className={`p-3 rounded-md border ${
                          d.isCorrect ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-medium">
                            {idx + 1}. {d.question}
                          </div>
                          <TTSButton text={d.question} size="sm" variant="ghost" voiceHint="en-US" />
                        </div>
                        {!d.isCorrect && (
                          <div className="mt-1 text-sm">
                            <span className="font-semibold">Your answer:</span> {d.selected} •{" "}
                            <span className="font-semibold">Correct:</span> {d.correct}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {d.quick3 || d.level6 ? `Level: ${d.quick3 || d.level6}` : null}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* AI feedback (markdown) */}
                {aiText && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl text-primary">AI Feedback</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: (p) => <h1 className="text-xl font-bold mt-2 mb-1" {...p} />,
                          h2: (p) => <h2 className="text-lg font-semibold mt-2 mb-1" {...p} />,
                          h3: (p) => <h3 className="font-semibold mt-2 mb-1 text-primary" {...p} />,
                          p:  (p) => <p className="leading-relaxed mb-2" {...p} />,
                          ul: (p) => <ul className="list-disc ml-6 space-y-1 mb-2" {...p} />,
                          ol: (p) => <ol className="list-decimal ml-6 space-y-1 mb-2" {...p} />,
                          li: (p) => <li className="leading-relaxed" {...p} />,
                          code: (p) => <code className="px-1 py-0.5 rounded bg-muted" {...p} />,
                        }}
                      >
                        {aiText}
                      </ReactMarkdown>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnglishTests;
