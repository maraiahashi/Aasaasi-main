import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import { Progress } from "@/components/ui";

import { TTSButton } from "@/components/TTSButton";
import { getSessionId, logEvent } from "@/lib/activity";

type VocabItem = {
  word: string;
  definition?: string | null;
  somaliTranslation?: string | null;
  example?: string | null;
  synonyms?: string[] | null;
  level?: string | null;
  category?: string | null; // will be "MCQ"
};

const PAGE_SIZE = 8;

const VocabularyBuilder = () => {
  // words come ONLY from the MCQ bank
  const [words, setWords] = useState<VocabItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [learned, setLearned] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // AI per-card state
  const [aiFor, setAiFor] = useState<string | null>(null);
  const [aiText, setAiText] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);

  const sessionId = getSessionId();

  // fetch MCQ words
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        const r = await fetch(
          `/api/vocab/words?category=MCQ&limit=${PAGE_SIZE}&offset=${offset}`
        );
        const d = await r.json();
        setWords(Array.isArray(d.words) ? d.words : []);
      } catch {
        setWords([]);
        setErrorMsg("Could not load words.");
      } finally {
        setLoading(false);
      }
    })();
  }, [offset]);

  const progress = useMemo(() => {
    const batchTotal = words.length || PAGE_SIZE;
    const batchLearned = words.filter(w => learned.includes(w.word)).length;
    return Math.round((batchLearned / Math.max(1, batchTotal)) * 100);
  }, [words, learned]);

  async function markAsLearned(word: string) {
    if (learned.includes(word)) return;
    setLearned(prev => [...prev, word]);
    await logEvent(sessionId, "vocab_marked", { word });

    // when all visible words are learned, auto-advance
    const allLearnedNow = words.every(w => learned.concat(word).includes(w.word));
    if (allLearnedNow) {
      setOffset(o => Math.max(0, o + PAGE_SIZE));
      setLearned([]);
      setAiFor(null);
      setAiText("");
    }
  }

  async function learnWithAI(word: string, definition?: string | null) {
    if (aiLoading && aiFor === word) return;
    setAiFor(word);
    setAiLoading(true);
    setAiText("");
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId,
        },
        body: JSON.stringify({
          message:
            `Teach the English word "${word}" for Somali learners.\n` +
            `Give a concise, friendly explanation with these sections:\n` +
            `### Simple Explanation\n` +
            `### Somali Translation\n` +
            `### Example Sentences (3 short lines)\n` +
            `### Collocations (3–5 bullets)\n` +
            `### Pronunciation (IPA if known)\n` +
            (definition ? `\nDictionary meaning: ${definition}\n` : ""),
        }),
      });
      const j = await res.json();
      setAiText(j?.reply || "Sorry—no explanation available.");
    } catch (e: any) {
      setAiText(`Sorry—AI explanation is unavailable (${e?.message || "error"}).`);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header currentPage="Vocabulary" />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <Card className="mb-8 bg-gradient-to-r from-primary to-success text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold">Vocabulary Builder</CardTitle>
              <CardDescription className="text-white/90 text-lg">
                Practice high-frequency words. Learn, listen, and master them.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Progress */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-primary">Current Batch Progress</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {words.filter(w => learned.includes(w.word)).length} / {words.length || PAGE_SIZE} words mastered
                </span>
              </div>
              <Progress value={progress} className="mt-2" />
            </CardHeader>
          </Card>

          {errorMsg && (
            <Card className="mb-6">
              <CardContent className="p-4 text-sm text-destructive">{errorMsg}</CardContent>
            </Card>
          )}

          {/* Word cards (MCQ only) */}
          {loading ? (
            <Card><CardContent className="p-6 text-muted-foreground">Loading words…</CardContent></Card>
          ) : words.length === 0 ? (
            <Card><CardContent className="p-6">No words found.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {words.map((w) => {
                const learnedThis = learned.includes(w.word);
                const showSyns = (w.synonyms || []).filter(Boolean);

                return (
                  <Card key={`${w.word}-mcq`} className="shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-2xl text-primary">{w.word}</CardTitle>
                          <TTSButton text={w.word} size="sm" variant="ghost" voiceHint="en-US" />
                        </div>
                        <Badge variant="outline">MCQ</Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {w.definition ? (
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground">DEFINITION</div>
                          <div className="flex items-start gap-3">
                            <div className="text-base flex-1">{w.definition}</div>
                            <TTSButton text={w.definition} size="sm" variant="ghost" voiceHint="en-US" />
                          </div>
                        </div>
                      ) : null}

                      {w.somaliTranslation ? (
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground">SOMALI TRANSLATION</div>
                          <div className="text-lg font-semibold text-accent flex items-center gap-2">
                            {w.somaliTranslation}
                            <TTSButton text={w.somaliTranslation} />
                          </div>
                        </div>
                      ) : null}

                      {w.example ? (
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground">EXAMPLE</div>
                          <div className="text-muted-foreground">“{w.example}”</div>
                        </div>
                      ) : null}

                      {showSyns.length ? (
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground mb-1">
                            RELATED CHOICES
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {showSyns.map((s) => (
                              <Badge key={s} variant="outline">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* Learn with AI (polished box) */}
                      <div className="pt-2">
                        <Button
                          onClick={() => learnWithAI(w.word, w.definition || undefined)}
                          variant="outline"
                          disabled={aiLoading && aiFor === w.word}
                        >
                          {aiLoading && aiFor === w.word ? "Thinking…" : "Learn with AI"}
                        </Button>

                        {aiFor === w.word && aiText && (
                          <div className="mt-3 rounded-2xl border bg-gradient-to-b from-muted/60 to-muted p-0.5">
                            <div className="rounded-2xl bg-background p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-primary">AI Explanation</h4>
                                <TTSButton text={aiText} size="sm" variant="ghost" />
                              </div>
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h3: (p) => <h3 className="font-semibold mt-3 mb-1 text-primary" {...p} />,
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
                          </div>
                        )}
                      </div>

                      <Button
                        disabled={learnedThis}
                        onClick={() => markAsLearned(w.word)}
                        className="w-full mt-2"
                      >
                        {learnedThis ? "Learned ✓" : "Add to Learned Words"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => {
                setOffset(o => Math.max(0, o - PAGE_SIZE));
                setLearned([]);
                setAiFor(null);
                setAiText("");
              }}
              disabled={offset === 0}
            >
              ← Previous
            </Button>
            <Button
              onClick={() => {
                setOffset(o => o + PAGE_SIZE);
                setLearned([]);
                setAiFor(null);
                setAiText("");
              }}
            >
              Next →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VocabularyBuilder;
