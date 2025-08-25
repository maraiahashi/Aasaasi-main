// src/api/tests.ts (works in Vite or Next)
const API = import.meta?.env?.VITE_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type TestItem = { id: number; prompt: string; choices?: string[] };
export type TestSection = { name: string; items: TestItem[] };
export type StartResp = { testId: string; sections: TestSection[] };

export async function startTest(kind = "english"): Promise<StartResp> {
  const res = await fetch(`${API}/tests/start?kind=${encodeURIComponent(kind)}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to start test");
  return res.json();
}

export async function submitTest(
  testId: string,
  answers: Array<{ section: string; itemId: number; answer: string }>
) {
  const res = await fetch(`${API}/tests/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ testId, answers }),
  });
  if (!res.ok) throw new Error("Failed to submit test");
  return res.json();
}
