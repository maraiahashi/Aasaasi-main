import { useEffect, useState } from "react";
import type { TestStartResponse } from "../types";
import { startTest, submitTest } from "../api";

export default function RunTest({ kind }: { kind: "wod"|"vocab"|"idiom"|"english" }) {
  const [test, setTest] = useState<TestStartResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    setResult(null);
    setAnswers({});
    startTest(kind).then(setTest);
  }, [kind]);

  function setAnswer(section: string, itemId: number, value: string) {
    setAnswers(a => ({ ...a, [`${section}|${itemId}`]: value }));
  }

  async function onSubmit() {
    if (!test) return;
    const payload = {
      testId: test.testId,
      answers: Object.entries(answers).map(([k, v]) => {
        const [section, itemId] = k.split("|");
        return { section, itemId: Number(itemId), answer: v };
      }),
    };
    const res = await submitTest(payload);
    setResult(res);
  }

  if (!test) return <div>Loading test…</div>;

  return (
    <div className="space-y-6">
      {test.sections.map(sec => (
        <section key={sec.name}>
          <h3>{sec.name}</h3>
          {sec.items.map((it: any) => {
            const key = `${sec.name}|${it.id}`;
            const val = answers[key] ?? "";
            const isMCQ = Array.isArray(it.choices) && it.choices.length > 0;

            return (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600 }}>{it.id}. {it.prompt}</div>

                {isMCQ ? (
                  <div>
                    {(it.choices as string[]).map(choice => (
                      <label key={choice} style={{ display: "block" }}>
                        <input
                          type="radio"
                          name={key}
                          checked={val === choice}
                          onChange={() => setAnswer(sec.name, it.id, choice)}
                        />
                        {" "}{choice}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    value={val}
                    onChange={e => setAnswer(sec.name, it.id, e.target.value)}
                    placeholder="Type your answer"
                  />
                )}
              </div>
            );
          })}
        </section>
      ))}

      <button onClick={onSubmit}>Submit</button>

      {result && (
        <div style={{ marginTop: 16 }}>
          <h3>Score: {result.score}%</h3>
          <ul>
            {result.sectionBreakdown.map((b: any) => (
              <li key={b.section}>{b.section}: {b.correct}/{b.total}</li>
            ))}
          </ul>
          <ul>
            {result.feedback.map((f: string, i: number) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
