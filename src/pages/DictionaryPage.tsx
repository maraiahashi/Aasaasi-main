// src/pages/DictionaryPage.tsx
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import TTSButton from "@/components/TTSButton";
import { Search, Volume2, Sparkles } from "lucide-react";
import { getSessionId, logEvent } from "@/lib/activity";

type Dir = "en-so" | "so-en";

type Result = {
  word: string;                 // always equals headword when present
  headword?: string;
  partOfSpeech?: string;
  pronunciation?: string;
  wordForms?: string;
  phrase?: string;
  usageNote?: string;
  meaning?: string;             // your “Meaning” column
  definition?: string;          // compat
  somaliTranslation?: string;
  examples?: string[];
  error?: string;
  ai?: boolean;                 // mark AI-sourced entries
};

const Dictionary = () => {
  const sessionId = useMemo(() => getSessionId(), []);
  const [searchTerm, setSearchTerm] = useState("");
  const [dir, setDir] = useState<Dir>("en-so");
  const [searchResult, setSearchResult] = useState<Result | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const speakWord = (text?: string) => {
    if (!text) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(u);
    } catch {}
  };

  async function aiFallback(q: string): Promise<Result | null> {
    try {
      const prompt =
        `Create a concise ${dir === "en-so" ? "English→Somali" : "Somali→English"} dictionary entry as JSON.\n` +
        `Keys: word, headword, pronunciation, partOfSpeech, wordForms, phrase, usageNote, meaning, somaliTranslation, examples (array 1–3).\n` +
        `Headword: "${q}". Reply with JSON only.`;
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId,
        },
        body: JSON.stringify({ message: prompt }),
      });

      if (r.status === 401) {
        // Backend missing OPENAI_API_KEY – show a friendly message in the card
        return {
          word: q,
          error:
            "AI assistant is not configured (missing OPENAI_API_KEY on the server).",
        };
      }
      if (!r.ok) return null;

      const j = await r.json();
      const raw = String(j?.reply ?? "").trim();
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1) return null;

      const data = JSON.parse(raw.slice(start, end + 1));
      return {
        word: data.word || q,
        headword: data.headword || data.word || q,
        pronunciation: data.pronunciation,
        partOfSpeech: data.partOfSpeech,
        wordForms: data.wordForms,
        phrase: data.phrase,
        usageNote: data.usageNote,
        meaning: data.meaning ?? data.definition,
        definition: data.definition,
        somaliTranslation: data.somaliTranslation,
        examples: Array.isArray(data.examples) ? data.examples : [],
        ai: true,
      };
    } catch {
      return null;
    }
  }

  const handleSearch = async () => {
    const q = searchTerm.trim();
    if (!q) { setSearchResult(null); setSuggestions([]); return; }
    setLoading(true);
    setSuggestions([]);

    try {
      // 1) try Mongo
      const r = await fetch(
        `/api/dictionary/lookup?term=${encodeURIComponent(q)}&dir=${dir}`,
        { headers: { "X-Session-Id": sessionId } }
      );

      if (r.ok) {
        const data = await r.json();
        const res: Result = {
          word: data.word,
          headword: data.headword ?? data.word,
          pronunciation: data.pronunciation,
          partOfSpeech: data.partOfSpeech,
          wordForms: data.wordForms,
          phrase: data.phrase,
          usageNote: data.usageNote,
          meaning: data.meaning ?? data.definition,
          definition: data.definition,
          somaliTranslation: data.somaliTranslation,
          examples: Array.isArray(data.examples) ? data.examples : [],
        };
        setSearchResult(res);
        await logEvent(sessionId, "word_searched", { word: q.toLowerCase(), dir, source: "mongo" });
        return;
      }

      // 2) not found → AI fallback
      if (r.status === 404) {
        const aiRes = await aiFallback(q);

        if (aiRes) {
          setSearchResult(aiRes);
          await logEvent(sessionId, "word_searched", { word: q.toLowerCase(), dir, source: aiRes.ai ? "ai" : "mongo" });
        } else {
          setSearchResult({ word: q, error: "The word is not available in the dictionary." });
        }

        // load suggestions regardless
        try {
          const s = await fetch(`/api/dictionary/suggest?term=${encodeURIComponent(q)}&dir=${dir}`);
          if (s.ok) setSuggestions(await s.json());
        } catch {}
        return;
      }

      // 3) other API error
      setSearchResult({ word: q, error: "Something went wrong. Please try again." });
    } catch {
      setSearchResult({ word: q, error: "Backend is offline. Please start the API server." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header currentPage="Dictionary" onSearch={(q) => setSearchTerm(q)} />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 gradient-text">Aasaasi Dictionary</h1>
            <p className="text-xl text-muted-foreground">Make your words meaningful</p>
          </div>

          {/* Search row (no tabs / no recent chips) */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="relative">
              <Input
                placeholder={`Search ${dir === "en-so" ? "English → Somali" : "Somali → English"}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleSearch()}
                className="text-lg py-4 px-6 pr-28 rounded-lg border-2 border-primary/20 focus:border-primary/50 bg-background/50"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/70 hover:bg-white"
                  onClick={() => setDir((d) => (d === "en-so" ? "so-en" : "en-so"))}
                  title="Swap direction"
                >
                  {dir === "en-so" ? "EN→SO" : "SO→EN"}
                </Button>
                <Button onClick={handleSearch} size="sm" disabled={loading} className="bg-primary hover:bg-primary/90">
                  <Search className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="max-w-2xl mx-auto mb-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-primary">Did you mean:</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {suggestions.map((s, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => { setSearchTerm(s); setTimeout(handleSearch, 0); }}
                    >
                      {s}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Result */}
          {searchResult && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl text-primary flex items-center gap-3">
                  {searchResult.error ? "Search Result" : (searchResult.headword || searchResult.word)}
                  {!searchResult.error && (
                    <Button variant="ghost" size="icon" onClick={() => speakWord(searchResult.headword || searchResult.word)} title="Play word">
                      <Volume2 className="h-5 w-5" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searchResult.error ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">{searchResult.error}</p>
                    <Badge variant="outline">Try another spelling or see suggestions above</Badge>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Head row: pronunciation / POS */}
                    <div className="flex items-center flex-wrap gap-4">
                      {searchResult.pronunciation && <span className="text-lg text-muted-foreground">{searchResult.pronunciation}</span>}
                      {searchResult.partOfSpeech && <Badge>{searchResult.partOfSpeech}</Badge>}
                    </div>

                    {/* The extra sheet columns */}
                    {searchResult.wordForms && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">Word Forms: </span>{searchResult.wordForms}
                      </div>
                    )}
                    {searchResult.phrase && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">Phrase: </span>{searchResult.phrase}
                      </div>
                    )}
                    {searchResult.usageNote && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">Usage: </span>{searchResult.usageNote}
                      </div>
                    )}

                    {searchResult.meaning && (
                      <div>
                        <h4 className="font-semibold mb-2">Meaning:</h4>
                        <div className="flex items-start gap-3">
                          <p className="text-muted-foreground flex-1">{searchResult.meaning}</p>
                          <TTSButton text={searchResult.meaning} />
                        </div>
                      </div>
                    )}

                    {searchResult.somaliTranslation && (
                      <div>
                        <h4 className="font-semibold mb-2">Somali Translation:</h4>
                        <div className="flex items-center gap-3">
                          <p className="text-xl font-semibold text-accent">{searchResult.somaliTranslation}</p>
                          <TTSButton text={searchResult.somaliTranslation} />
                        </div>
                      </div>
                    )}

                    {Array.isArray(searchResult.examples) && searchResult.examples.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Examples:</h4>
                        <ul className="space-y-2">
                          {searchResult.examples.map((ex, i) => (
                            <li key={i} className="text-muted-foreground">• {ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dictionary;
