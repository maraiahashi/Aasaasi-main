// src/pages/WordOfTheDay.tsx
import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { TTSButton } from "@/components/TTSButton";
import { Calendar, History, RotateCcw, CornerUpLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type DayWord = {
  word: string;
  pronunciation?: string;
  partOfSpeech?: string;
  definition?: string;
  somaliTranslation?: string;
  level?: string;
  examples?: string[];
  etymology?: string;
  synonyms?: string[];
  date?: string; // ISO yyyy-mm-dd
};

const SESSION_KEY = "aasaasi_session_id";
function getSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = "sid_" + Math.random().toString(36).slice(2);
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

const WordOfTheDay = () => {
  const navigate = useNavigate();
  const sessionId = useMemo(getSessionId, []);
  const [clock, setClock] = useState(new Date()); // live clock for header when on "today"
  const [showFlashbacks, setShowFlashbacks] = useState(false);
  const [activeWord, setActiveWord] = useState<DayWord | null>(null);
  const [history, setHistory] = useState<{ word: string; date: string }[]>([]);
  const [loadingWord, setLoadingWord] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // AI explanation
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState<string>("");

  const fallback: DayWord = {
    word: "perspective",
    pronunciation: "/pərˈspektɪv/",
    partOfSpeech: "noun",
    definition: "A particular attitude toward or way of regarding something; a point of view.",
    somaliTranslation: "aragtida",
    level: "B2",
    examples: [
      "We need to look at this problem from a different perspective.",
      "Her perspective on life changed after traveling the world.",
    ],
    etymology: "From Latin perspectus, past participle of perspicere “look through, examine”.",
    synonyms: ["viewpoint", "outlook", "angle", "standpoint"],
  };

  // live clock only for "today"
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load today's word initially (no date param)
  const fetchWord = async (dateParam?: string) => {
    setLoadingWord(true);
    setAiText("");
    try {
      const qs = dateParam ? `?date=${encodeURIComponent(dateParam)}` : "";
      const res = await fetch(`/api/content/word-of-the-day${qs}`, {
        headers: { "X-Session-Id": sessionId },
      });
      const data = await res.json();
      setActiveWord(data?.word ?? fallback);
    } catch {
      setActiveWord(fallback);
    } finally {
      setLoadingWord(false);
    }
  };

  useEffect(() => {
    fetchWord(); // today
  }, [sessionId]);

  // Load flashback list on first open
  useEffect(() => {
    if (!showFlashbacks || history.length) return;
    (async () => {
      try {
        const res = await fetch("/api/content/word-of-the-day/history?limit=20", {
          headers: { "X-Session-Id": sessionId },
        });
        const data = await res.json();
        setHistory(data?.history ?? []);
      } catch {
        setHistory([]);
      }
    })();
  }, [showFlashbacks, history.length, sessionId]);

  // Helpers
  const w = activeWord ?? fallback;
  const viewingToday = !selectedDate;
  const displayDateStr = viewingToday
    ? clock.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Ask AI to explain active word
  const askAI = async () => {
    if (!w?.word || aiLoading) return;
    try {
      setAiLoading(true);
      setAiText("");
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
        body: JSON.stringify({
          message:
            `Explain the English word "${w.word}" for Somali learners.\n` +
            `Include: 1) Simple explanation  2) Somali translation  3) Three short example sentences  4) Common collocations (3–5)  5) Quick pronunciation hint.\n` +
            `Format as clean Markdown with short headings (no code blocks).`,
        }),
      });
      const j = await res.json();
      setAiText(j?.reply || "Sorry—no explanation available.");
    } catch (e: any) {
      setAiText(`Sorry—AI explanation is unavailable (${e?.message || "error"}).`);
    } finally {
      setAiLoading(false);
    }
  };

  // Click a flashback card -> load that date
  const openFlashback = async (d: string) => {
    setSelectedDate(d);
    await fetchWord(d);
    // keep flashbacks visible so user can click around
  };

  // Back to today
  const backToToday = async () => {
    setSelectedDate(null);
    await fetchWord();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header currentPage="Word of the Day" />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero/Header */}
          <Card className="mb-8 bg-gradient-to-r from-primary to-accent text-white">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="h-6 w-6" />
                <CardTitle className="text-2xl">Word of the Day</CardTitle>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFlashbacks((s) => !s)}
                  className="ml-4 text-primary-foreground/80 hover:text-primary-foreground"
                >
                  <History className="h-4 w-4 mr-1" />
                  {showFlashbacks ? "Hide" : "Show"} History
                </Button>

                {!viewingToday && (
                  <Button variant="ghost" size="sm" onClick={backToToday} className="ml-2">
                    <CornerUpLeft className="h-4 w-4 mr-1" />
                    Back to Today
                  </Button>
                )}
              </div>
              <CardDescription className="text-primary-foreground/90 text-lg">
                {displayDateStr}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Main Word Card */}
          <Card className="shadow-lg mb-8">
            <CardHeader className="text-center border-b">
              <div className="flex items-center justify-center gap-3 mb-2">
                <CardTitle className="text-4xl font-bold text-primary">
                  {loadingWord ? "—" : w.word}
                </CardTitle>
                {!loadingWord && <TTSButton text={w.word} size="default" voiceHint="en-US" />}
              </div>

              {!loadingWord && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {w.pronunciation && (
                    <>
                      <span className="text-lg text-muted-foreground">{w.pronunciation}</span>
                      <TTSButton text={w.word} size="sm" variant="ghost" voiceHint="en-US" />
                    </>
                  )}
                  {w.partOfSpeech && <Badge variant="outline">{w.partOfSpeech}</Badge>}
                  {w.level && <Badge>{w.level}</Badge>}
                </div>
              )}
            </CardHeader>

            <CardContent className="p-8 space-y-8">
              {w.definition && (
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-primary">Definition</h3>
                  <div className="flex items-start gap-3">
                    <p className="text-lg leading-relaxed flex-1">{w.definition}</p>
                    <TTSButton text={w.definition} voiceHint="en-US" />
                  </div>
                </div>
              )}

              {w.somaliTranslation && (
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-primary">Somali Translation</h3>
                  <div className="flex items-center gap-3">
                    <p className="text-2xl font-bold text-accent">{w.somaliTranslation}</p>
                    <TTSButton text={w.somaliTranslation} />
                  </div>
                </div>
              )}

              {w.examples && w.examples.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-primary">Examples</h3>
                  <div className="space-y-3">
                    {w.examples.map((ex, i) => (
                      <div key={i} className="p-4 bg-muted rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <p className="italic flex-1">"{ex}"</p>
                          <TTSButton text={ex} size="sm" variant="ghost" voiceHint="en-US" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {w.etymology && (
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-primary">Etymology</h3>
                  <p className="text-muted-foreground">{w.etymology}</p>
                </div>
              )}

              {w.synonyms && w.synonyms.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-primary">Synonyms</h3>
                  <div className="flex flex-wrap gap-2">
                    {w.synonyms.map((s, i) => (
                      <Badge key={i} variant="secondary">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Explanation */}
              <div>
                <Button
                  onClick={askAI}
                  variant="outline"
                  className="mb-3"
                  disabled={aiLoading || loadingWord}
                >
                  {aiLoading ? "Thinking…" : "Ask AI to explain"}
                </Button>

                {aiText && (
                  <div className="p-5 rounded-xl bg-muted">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-primary">AI Explanation</h4>
                      <TTSButton text={aiText} />
                    </div>
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
                  </div>
                )}
              </div>
              {/* /AI Explanation */}
            </CardContent>
          </Card>

          {/* Flashbacks: clickable cards */}
          {showFlashbacks && (
            <Card className="shadow-lg mb-8">
              <CardHeader>
                <CardTitle className="text-2xl text-primary flex items-center">
                  <RotateCcw className="h-6 w-6 mr-2" />
                  Word Flashbacks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {history.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => openFlashback(item.date)}
                      className="w-full text-left p-4 bg-muted rounded-lg hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-lg">{item.word}</h4>
                          <p className="text-sm text-muted-foreground">{item.date}</p>
                        </div>
                        <TTSButton text={item.word} size="sm" variant="ghost" voiceHint="en-US" />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
        </div>
      </div>
    </div>
  );
};

export default WordOfTheDay;
