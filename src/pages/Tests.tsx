// src/pages/Tests.tsx
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type TestKind = "wod" | "vocab" | "idiom" | "english";

type TestItem = {
  id: number;
  prompt: string;
  answer: string;      // returned by /tests/start (we won't show it until after submit)
  choices?: string[];  // present for MCQ sections
};

type TestSection = { name: string; items: TestItem[] };

type StartResponse = {
  kind: TestKind | string;
  title: string;
  sections: TestSection[];
};

type KindsResponse = {
  kinds: { kind: string; total: number; sections: { name: string; count: number }[] }[];
};

export default function Tests() {
  const [kinds, setKinds] = useState<KindsResponse["kinds"]>([]);
  const [kind, setKind] = useState<TestKind>("wod");
  const [data, setData] = useState<StartResponse | null>(null);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; percent: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // load which kinds exist
  useEffect(() => {
    let mounted = true;
    setErr(null);
    api.get<KindsResponse>("/tests/kinds")
      .then((j) => {
        if (!mounted) return;
        setKinds(j.kinds);
        // default to the first kind that actually has items
        const first = j.kinds.find(k => k.total > 0)?.kind as TestKind | undefined;
        if (first) setKind(first);
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
    return () => { mounted = false; };
  }, []);

  // fetch the test whenever kind changes
  useEffect(() => {
    if (!kind) return;
    setLoading(true);
    setErr(null);
    setSubmitted(false);
    setResult(null);
    setSectionIdx(0);
    setAnswers({});

    api.post<StartResponse>("/tests/start", { kind })
      .then((j) => setData(j))
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [kind]);

  const availableKinds = useMemo(() => new Set(kinds.map(k => k.kind)), [kinds]);

  function setAnswer(si: number, id: number, value: string) {
    setAnswers(a => ({ ...a, [`${si}-${id}`]: value }));
  }

  async function onSubmit() {
    if (!data) return;
    setErr(null);
    const payload = {
      kind: data.kind,
      answers: data.sections.flatMap((s, si) =>
        s.items.map(it => ({
          section_index: si,
          id: it.id,
          answer: answers[`${si}-${it.id}`] ?? "",
        }))
      ),
    };

    try {
      const r = await api.post<{ score: number; total: number }>("/tests/submit", payload);
      const percent = Math.round((r.score / Math.max(1, r.total)) * 100);
      setSubmitted(true);
      setResult({ ...r, percent });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  const currentSection = data?.sections?.[sectionIdx];

  return (
    <div className="min-h-screen p-6 bg-white text-gray-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Aasaasi Tests</h1>

          <div className="flex flex-wrap gap-2">
            {(["wod","vocab","idiom","english"] as TestKind[]).map(k => {
              const enabled = availableKinds.has(k);
              return (
                <button
                  key={k}
                  disabled={!enabled}
                  onClick={() => setKind(k)}
                  className={`px-3 py-2 rounded border text-sm ${
                    kind === k ? "bg-black text-white" : "bg-white"
                  } ${enabled ? "border-gray-300 hover:bg-gray-100" : "border-dashed border-gray-300 opacity-50 cursor-not-allowed"}`}
                  title={!enabled ? "No items loaded for this kind" : ""}
                >
                  {k.toUpperCase()}
                </button>
              );
            })}
          </div>
        </header>

        {err && (
          <div className="p-3 rounded border border-rose-300 bg-rose-50 text-rose-700 text-sm">
            {err}
          </div>
        )}

        {loading && <div className="p-4 rounded bg-gray-50">Loading…</div>}

        {data && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium">{data.title}</h2>
              {result && (
                <div className="text-sm">
                  <span className="font-semibold">{result.score}/{result.total}</span>{" "}
                  ({result.percent}%)
                </div>
              )}
            </div>

            {/* section tabs */}
            <div className="flex flex-wrap gap-2">
              {data.sections.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSectionIdx(i)}
                  className={`px-3 py-1.5 rounded text-sm border ${
                    sectionIdx === i ? "bg-black text-white" : "bg-white hover:bg-gray-100"
                  } border-gray-300`}
                >
                  {s.name || `Section ${i + 1}`}{" "}
                  <span className="opacity-60">({s.items.length})</span>
                </button>
              ))}
            </div>

            {/* items */}
            <div className="grid gap-3">
              {currentSection?.items.map((it) => {
                const key = `${sectionIdx}-${it.id}`;
                const value = answers[key] ?? "";
                const isMCQ = (it.choices || []).length > 0;
                const showCorrect = submitted && value !== "" && value.toLowerCase().trim() !== it.answer.toLowerCase().trim();

                return (
                  <div key={key} className="rounded border border-gray-200 p-4">
                    <div className="text-sm text-gray-500">#{it.id}</div>
                    <div className="font-medium mb-2">{it.prompt}</div>

                    {isMCQ ? (
                      <div className="flex flex-col gap-2">
                        {(it.choices || []).map((c, idx) => (
                          <label key={idx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`q-${key}`}
                              value={c}
                              checked={value === c}
                              onChange={(e) => setAnswer(sectionIdx, it.id, e.target.value)}
                            />
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        className="w-full rounded border border-gray-300 px-3 py-2"
                        placeholder="Type your answer"
                        value={value}
                        onChange={(e) => setAnswer(sectionIdx, it.id, e.target.value)}
                      />
                    )}

                    {submitted && (
                      <div className="mt-2 text-sm">
                        {value === "" ? (
                          <span className="text-amber-600">No answer.</span>
                        ) : value.toLowerCase().trim() === it.answer.toLowerCase().trim() ? (
                          <span className="text-emerald-600">Correct</span>
                        ) : (
                          <span className="text-rose-600">
                            Incorrect. Correct answer: <b>{it.answer}</b>
                          </span>
                        )}
                      </div>
                    )}

                    {!isMCQ && value && !submitted && (
                      <div className="mt-1 text-xs text-gray-500">We’ll compare exactly (case-insensitive).</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onSubmit}
                className="px-4 py-2 rounded bg-black text-white"
              >
                Submit answers
              </button>
              {submitted && (
                <button
                  onClick={() => { setSubmitted(false); setResult(null); }}
                  className="px-3 py-2 rounded border border-gray-300"
                >
                  Edit answers
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
