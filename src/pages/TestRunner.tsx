// src/pages/TestRunner.tsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";

type TestKind = "wod" | "vocab" | "idiom" | "english";

type TestItem = {
  id: number;
  prompt: string;
  answer: string;
  choices?: string[];
};

type TestSection = {
  name: string;
  items: TestItem[];
};

type TestPayload = {
  kind: TestKind | string;
  title: string;
  sections: TestSection[];
};

export default function TestRunner() {
  const { kind } = useParams<{ kind: TestKind }>();
  const [data, setData] = React.useState<TestPayload | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [showAnswers, setShowAnswers] = React.useState(false);

  const isBadKind =
    !kind || !["wod", "vocab", "idiom", "english"].includes(kind);

  React.useEffect(() => {
    if (isBadKind) return;
    setLoading(true);
    setErr(null);

    api.post<TestPayload>("/tests/start", { kind })
      .then((json) => setData(json))
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [kind, isBadKind]);

  if (isBadKind) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Unknown test kind</h1>
        <p className="text-gray-600 mb-4">
          Use one of: wod, vocab, idiom, english.
        </p>
        <div className="space-x-3">
          <Link className="underline" to="/tests/wod">/tests/wod</Link>
          <Link className="underline" to="/tests/vocab">/tests/vocab</Link>
          <Link className="underline" to="/tests/idiom">/tests/idiom</Link>
          <Link className="underline" to="/tests/english">/tests/english</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">
          {data?.title ?? `Loading ${kind}…`}
        </h1>
        <div className="flex items-center gap-3">
          <button
            className="px-3 py-1 rounded border"
            onClick={() => setShowAnswers((v) => !v)}
          >
            {showAnswers ? "Hide" : "Show"} answers
          </button>
          <Link className="underline" to="/">Home</Link>
        </div>
      </div>

      {loading && <div className="text-gray-500">Loading…</div>}
      {err && (
        <div className="text-red-600 mb-4">
          Failed to load test: {err}. Make sure the backend is running and the request goes to the API (not Vite HTML).
        </div>
      )}

      {data?.sections?.map((section, si) => (
        <details key={si} open className="mb-6 rounded border">
          <summary className="cursor-pointer select-none px-4 py-2 font-medium bg-gray-50">
            {section.name} — {section.items.length} items
          </summary>

          <ul className="p-4 space-y-4">
            {section.items.map((it) => (
              <li key={it.id} className="rounded border p-3">
                <div className="font-medium mb-2">
                  {it.id}. {it.prompt}
                </div>

                {Array.isArray(it.choices) && it.choices.length > 0 ? (
                  <div className="space-y-2">
                    {it.choices.map((c) => (
                      <label key={c} className="block">
                        <input
                          type="radio"
                          name={`q-${si}-${it.id}`}
                          className="mr-2"
                        />
                        {c}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    className="w-full rounded border px-2 py-1"
                    placeholder="Type your answer…"
                  />
                )}

                {showAnswers && (
                  <div className="mt-2 text-sm text-green-700">
                    Answer: <span className="font-semibold">{it.answer}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
