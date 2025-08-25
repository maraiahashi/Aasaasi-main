const API = import.meta.env.VITE_API_URL;

export async function health() {
  const r = await fetch(`${API}/health`); return r.json();
}

// WoD words
export async function getWodToday(date?: string) {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  const r = await fetch(`${API}/wotd/today${qs}`);
  return r.json();
}
export async function getWodArchive(limit = 30, offset = 0) {
  const r = await fetch(`${API}/wotd/archive?limit=${limit}&offset=${offset}`);
  return r.json();
}

// Idioms
export async function getIdiomCurrent(weekStart?: string) {
  const qs = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";
  const r = await fetch(`${API}/idioms/current${qs}`);
  return r.json();
}
export async function getIdiomArchive(limit = 26, offset = 0) {
  const r = await fetch(`${API}/idioms/archive?limit=${limit}&offset=${offset}`);
  return r.json();
}

// Dictionary
export async function dictSearch(q: string, direction = "en-so", limit = 20) {
  const p = new URLSearchParams({ q, direction, limit: String(limit) });
  const r = await fetch(`${API}/dictionary/search?${p}`);
  return r.json();
}

// Tests
export type TestKind = "wod" | "vocab" | "idiom" | "english";

export async function startTest(kind: TestKind) {
  const r = await fetch(`${API}/tests/start?kind=${kind}`, { method: "POST" });
  return r.json(); // { testId, sections: [{name, items: [...] }] }
}
export async function submitTest(payload: {
  testId: string;
  answers: Array<{ section: string; itemId: number; answer: string }>;
}) {
  const r = await fetch(`${API}/tests/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json(); // { testId, score, sectionBreakdown, feedback }
}
