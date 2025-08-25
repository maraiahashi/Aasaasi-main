import { getOrCreateSessionId } from "./session";

const headers = () => ({
  "Content-Type": "application/json",
  "X-Session-Id": getOrCreateSessionId(),
});

export type EventKind =
  | "dictionary_search"
  | "word_learned"
  | "quiz_completed"
  | "grammar_studied"
  | "time_spent"
  | "page_view";

export async function postEvent(kind: EventKind, payload: Record<string, any> = {}) {
  try {
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ kind, payload }),
      keepalive: true,
    });
  } catch {
    // ignore for offline
  }
}

export async function fetchSummary() {
  const r = await fetch("/api/analytics/summary", { headers: headers() });
  if (!r.ok) throw new Error("summary failed");
  return r.json();
}
