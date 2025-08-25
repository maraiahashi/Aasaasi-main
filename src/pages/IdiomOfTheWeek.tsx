// src/pages/IdiomOfTheWeek.tsx
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { IdiomCard } from "@/components/common/IdiomCard";
import { Archive } from "lucide-react";
import { getSessionId, logEvent } from "@/lib/activity";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@/components/ui";

type Idiom = {
  id?: string;
  idiom: string;
  meaning: string;
  somaliTranslation?: string;
  example?: string;
  origin?: string;
  pronunciation?: string;
  weekLabel?: string;
  week?: string;
};

const IdiomOfTheWeek = () => {
  const sessionId = useMemo(getSessionId, []);
  const [showArchive, setShowArchive] = useState(false);
  const [current, setCurrent] = useState<Idiom | null>(null);
  const [archive, setArchive] = useState<Idiom[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);

  // TS-safe wrapper so we can use custom event names without changing lib types
  const logIdiomViewed = async (idiom?: string, week?: string) => {
    try {
      await (logEvent as unknown as (sid: string, ev: string, payload?: any) => Promise<void>)(
        sessionId,
        "idiom_viewed",
        { idiom, week }
      );
    } catch {
      /* ignore analytics errors */
    }
  };

  // Fetch current idiom
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/idioms/current", {
          headers: { "X-Session-Id": sessionId },
        });
        const j: Idiom | null = await r.json();
        setCurrent(j || null);
        if (j?.idiom) await logIdiomViewed(j.idiom, j.weekLabel);
      } catch {
        setCurrent(null);
      }
    })();
  }, [sessionId]);

  // Archive fetch on toggle
  const toggleArchive = async () => {
    const next = !showArchive;
    setShowArchive(next);
    if (next && archive.length === 0) {
      setLoadingArchive(true);
      try {
        const r = await fetch("/api/idioms/archive?limit=50", {
          headers: { "X-Session-Id": sessionId },
        });
        const j = await r.json();
        setArchive(Array.isArray(j?.items) ? j.items : []);
      } catch {
        setArchive([]);
      } finally {
        setLoadingArchive(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header currentPage="Idiom of the Week" />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <Card className="mb-8 bg-gradient-to-r from-accent to-primary text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold">Idiom of the Week</CardTitle>
            </CardHeader>
          </Card>

          {/* Main idiom */}
          {current ? (
            <IdiomCard idiom={current} isMain />
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No idiom found.
              </CardContent>
            </Card>
          )}

          {/* Archive Section Toggle */}
          <div className="text-center my-6">
            <Button onClick={toggleArchive} variant="outline" className="text-lg px-6 py-3">
              <Archive className="h-5 w-5 mr-2" />
              {showArchive ? "Hide Previous Idioms" : "View Previous Idioms"}
            </Button>
          </div>

          {/* Previous Idioms Archive */}
          {showArchive && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-center text-primary mb-2">Idiom Archive</h2>

              {loadingArchive ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    Loading…
                  </CardContent>
                </Card>
              ) : archive.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No previous idioms yet.
                  </CardContent>
                </Card>
              ) : (
                archive.map((idiom, i) => <IdiomCard key={idiom.id || i} idiom={idiom} />)
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IdiomOfTheWeek;
