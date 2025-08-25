import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Badge, Button } from "@/components/ui";
import { TTSButton } from "@/components/TTSButton";
import { MessageSquare } from "lucide-react";

interface IdiomData {
  idiom: string;
  meaning?: string;
  somaliTranslation?: string;
  example?: string;
  origin?: string;
  pronunciation?: string;
  week?: string;
  weekLabel?: string;
}

interface IdiomCardProps {
  idiom: IdiomData;
  isMain?: boolean;
}

/**
 * Idiom card with TTS and an "Ask AI to explain" helper.
 * Renders Markdown from the AI endpoint with nice styles.
 */
export const IdiomCard = ({ idiom, isMain = false }: IdiomCardProps) => {
  const weekText = idiom.week || idiom.weekLabel;
  const has = (s?: string) => !!(s && String(s).trim().length);

  // --- Ask AI (backend: /api/idioms/explain?idiom=...) ---
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);

  const askAI = async () => {
    setAiLoading(true);
    setAiText(null);
    try {
      const q = encodeURIComponent(idiom.idiom);
      const r = await fetch(`/api/idioms/explain?idiom=${q}`);
      const j = await r.json();
      setAiText(j.explanation || "No explanation available.");
    } catch {
      setAiText("Sorry—couldn’t reach the tutor right now.");
    } finally {
      setAiLoading(false);
    }
  };

  const Title = (
    <div
      className={
        isMain
          ? "flex items-center justify-center gap-3"
          : "flex items-center gap-2"
      }
    >
      <span className={isMain ? "leading-tight" : ""}>“{idiom.idiom}”</span>
      {/* NEW: Listen button for the idiom itself */}
      <TTSButton text={idiom.idiom} />
    </div>
  );

  const HeaderBlock = (
    <CardHeader className={isMain ? "text-center" : ""}>
      <div className={isMain ? "" : "flex items-center justify-between"}>
        <CardTitle className={isMain ? "text-4xl font-bold text-primary" : "text-2xl text-primary"}>
          {Title}
        </CardTitle>
        {!isMain && weekText && <Badge variant="secondary">{weekText}</Badge>}
      </div>
      {isMain && weekText && <Badge variant="outline" className="mx-auto mt-2">{weekText}</Badge>}
      {has(idiom.pronunciation) && (
        <p className="text-sm text-muted-foreground mt-1">/{idiom.pronunciation}/</p>
      )}
    </CardHeader>
  );

  const BodyBlock = (
    <CardContent className={isMain ? "space-y-6 p-8" : "space-y-4"}>
      {/* Meaning */}
      {has(idiom.meaning) && (
        <div>
          <h3 className={`font-semibold text-primary flex items-center gap-2 ${isMain ? "text-xl" : ""}`}>
            Meaning:
            <TTSButton text={idiom.meaning!} />
          </h3>
          <p className={isMain ? "text-lg" : ""}>{idiom.meaning}</p>
        </div>
      )}

      {/* Somali */}
      {has(idiom.somaliTranslation) && (
        <div>
          <h3 className={`font-semibold text-primary flex items-center gap-2 ${isMain ? "text-xl" : ""}`}>
            Somali Translation:
            <TTSButton text={idiom.somaliTranslation!} />
          </h3>
          <p className={isMain ? "text-2xl font-bold text-accent" : "text-accent font-medium"}>
            {idiom.somaliTranslation}
          </p>
        </div>
      )}

      {/* Example */}
      {has(idiom.example) && (
        <div>
          <h3 className={`font-semibold text-primary flex items-center gap-2 ${isMain ? "text-xl" : ""}`}>
            Example:
            <TTSButton text={idiom.example!} />
          </h3>
          <div className={isMain ? "p-4 bg-muted rounded-lg" : ""}>
            <p className={isMain ? "italic" : "italic bg-muted p-3 rounded"}>“{idiom.example}”</p>
          </div>
        </div>
      )}

      {/* Origin */}
      {has(idiom.origin) && (
        <div>
          <h3 className={`font-semibold text-primary ${isMain ? "text-xl mb-2" : ""}`}>Origin:</h3>
          <p className="text-muted-foreground">{idiom.origin}</p>
        </div>
      )}

      {/* Ask AI */}
      <div className={isMain ? "pt-2" : ""}>
        <Button onClick={askAI} disabled={aiLoading} variant="outline">
          <MessageSquare className="h-4 w-4 mr-2" />
          {aiLoading ? "Asking Aasaasi…" : "Ask AI to explain"}
        </Button>
      </div>

      {/* Pretty Markdown rendering of the AI response */}
      {aiText && (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h3: (props) => <h3 className="font-semibold text-primary mt-3 mb-1 text-base" {...props} />,
              p: (props) => <p className="leading-relaxed mb-2" {...props} />,
              ul: (props) => <ul className="list-disc ml-6 space-y-1" {...props} />,
              ol: (props) => <ol className="list-decimal ml-6 space-y-1" {...props} />,
              li: (props) => <li className="leading-relaxed" {...props} />,
              strong: (props) => <strong className="font-semibold" {...props} />,
              em: (props) => <em className="italic" {...props} />,
            }}
          >
            {aiText}
          </ReactMarkdown>
        </div>
      )}
    </CardContent>
  );

  return (
    <Card className={isMain ? "shadow-lg mb-6 border-2 border-primary" : "shadow-md border-l-4 border-l-accent"}>
      {HeaderBlock}
      {BodyBlock}
    </Card>
  );
};
