// src/pages/AIAssistantPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Header } from "@/components/Header";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, Input, Badge
} from "@/components/ui";
import { Search } from "lucide-react";
import { TTSButton } from "@/components/TTSButton";

type Msg = { type: "user" | "tutor"; message: string };

const SESSION_KEY = "aasaasi_session_id";
function getSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = "sid_" + Math.random().toString(36).slice(2);
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

const LearningTutor = () => {
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sessionId = useMemo(getSessionId, []);

  const sampleQuestions = [
    "What's the difference between 'a' and 'an'?",
    "How do I use present perfect tense?",
    "Translate 'hello' to Somali",
    "What are some common English idioms?",
    "Help me with pronunciation of 'though'",
  ];

  async function askBackend(prompt: string) {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": sessionId,
      },
      body: JSON.stringify({ message: prompt }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || `HTTP ${res.status}`);
    }
    return (await res.json()) as { reply: string };
  }

  const handleAskQuestion = async () => {
    const q = question.trim();
    if (!q || isLoading) return;

    setConversation((prev) => [...prev, { type: "user", message: q }]);
    setQuestion("");
    setIsLoading(true);

    try {
      const { reply } = await askBackend(q);
      setConversation((prev) => [...prev, { type: "tutor", message: reply }]);
    } catch (err: any) {
      setConversation((prev) => [
        ...prev,
        { type: "tutor", message: `Sorry—couldn’t reach the tutor (${err.message}).` },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // enter-to-send
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isLoading && document.activeElement === inputRef.current) {
        handleAskQuestion();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLoading]);

  // auto-scroll to last message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation, isLoading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Unified header with logo */}
      <Header currentPage="AI Assistant" />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <Card className="mb-8 bg-gradient-to-r from-accent to-primary text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold">AI Language Assistant</CardTitle>
              <CardDescription className="text-white/90 text-lg">
                Get personalized help with English grammar, vocabulary, and pronunciation
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Suggestions */}
          {conversation.length === 0 && (
            <Card className="mb-8 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-primary">Try asking me:</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sampleQuestions.map((s, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="h-auto p-4 text-left justify-start"
                      onClick={() => setQuestion(s)}
                    >
                      “{s}”
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conversation */}
          {conversation.length > 0 && (
            <Card className="mb-8 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-primary">Conversation</CardTitle>
              </CardHeader>
              <CardContent ref={scrollRef} className="space-y-4 max-h-96 overflow-y-auto">
                {conversation.map((msg, idx) => {
                  const isUser = msg.type === "user";
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border ${
                        isUser ? "bg-blue-50 border-blue-100 ml-8" : "bg-white mr-8"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={isUser ? "secondary" : "outline"}>
                          {isUser ? "You" : "Tutor"}
                        </Badge>
                        {/* audio for every bubble */}
                        <TTSButton text={msg.message} />
                      </div>

                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                      ) : (
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
                          {msg.message}
                        </ReactMarkdown>
                      )}
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="p-4 rounded-2xl bg-white border mr-8">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Tutor</Badge>
                    </div>
                    <div className="animate-pulse h-2 w-24 rounded bg-primary/40" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Input */}
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex gap-3">
                <Input
                  ref={inputRef}
                  placeholder="Ask me anything about English…"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAskQuestion(); }}
                  className="flex-1"
                />
                <Button
                  onClick={handleAskQuestion}
                  disabled={!question.trim() || isLoading}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Ask
                </Button>
              </div>

              {conversation.length > 0 && (
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => setConversation([])}
                >
                  Start New Conversation
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LearningTutor;
