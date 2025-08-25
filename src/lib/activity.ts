// src/lib/activity.ts
// Local activity log + best-effort backend mirroring (SSR-safe)

export type EventItem = {
  type: "word_searched" | "quiz_completed" | "vocab_marked" | "grammar_studied" | "time_spent" | "page_view";
  at: string; // ISO timestamp
  meta?: Record<string, any>;
};

const SID_KEY = "aasaasi_session";
const KEY = (sid: string) => `aasaasi.events.${sid}`;

const isBrowser = typeof window !== "undefined" && typeof localStorage !== "undefined";

/** Stable per-browser session id (no login required) */
export function getSessionId(): string {
  if (!isBrowser) return "ssr";
  let sid = localStorage.getItem(SID_KEY);
  if (!sid) {
    const rnd =
      (globalThis.crypto && "randomUUID" in globalThis.crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
    sid = `sess_${rnd}`;
    localStorage.setItem(SID_KEY, sid);
  }
  return sid;
}

export function readEvents(sessionId: string): EventItem[] {
  if (!isBrowser) return [];
  try {
    const raw = localStorage.getItem(KEY(sessionId));
    const arr = raw ? (JSON.parse(raw) as EventItem[]) : [];
    return arr.filter(e => e && e.type && e.at).sort((a, b) => a.at.localeCompare(b.at));
  } catch {
    return [];
  }
}

function writeEvents(sessionId: string, events: EventItem[]) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(KEY(sessionId), JSON.stringify(events));
    try {
      // nudge other tabs
      window.dispatchEvent(new StorageEvent("storage", { key: KEY(sessionId) }));
    } catch { /* noop */ }
  } catch { /* noop */ }
}

export function clearEvents(sessionId: string) {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(KEY(sessionId));
    try {
      window.dispatchEvent(new StorageEvent("storage", { key: KEY(sessionId) }));
    } catch { /* noop */ }
  } catch { /* noop */ }
}

/** Normalize to backend "kind" */
function toBackendKind(t: EventItem["type"]) {
  switch (t) {
    case "word_searched":   return "dictionary_search";
    case "vocab_marked":    return "word_learned"; // backend expects word_learned
    case "quiz_completed":  return "quiz_completed";
    case "grammar_studied": return "grammar_studied";
    case "time_spent":      return "time_spent";
    case "page_view":       return "page_view";
    default:                return String(t);
  }
}

/** Core logger: save locally + mirror to /api/analytics/event ({kind,payload,ts}) */
export async function logEvent(
  sessionId: string,
  type: EventItem["type"],
  meta: Record<string, any> = {}
) {
  const evt: EventItem = { type, meta, at: new Date().toISOString() };

  // local first (dashboard can read even if offline)
  const all = readEvents(sessionId);
  all.push(evt);
  writeEvents(sessionId, all);

  // backend mirror (FastAPI accepts this shape and the old one)
  try {
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
      body: JSON.stringify({
        kind: toBackendKind(type),
        payload: meta,
        ts: evt.at,
      }),
      keepalive: true,
    });
  } catch { /* ignore network errors */ }
}

/** Convenience: page views (no local write) */
export async function logPageView(sessionId: string, page: string) {
  try {
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": sessionId },
      body: JSON.stringify({
        kind: "page_view",
        payload: { page },
        ts: new Date().toISOString(),
      }),
      keepalive: true,
    });
  } catch { /* ignore */ }
}
