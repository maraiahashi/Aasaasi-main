// src/lib/api.ts

// Build-time values (Vite). Also tolerate Next-style if one sneaks in.
const BUILT_BASE: string | undefined =
  (import.meta as any)?.env?.VITE_API_BASE_URL ??
  ((typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_API_BASE_URL) || undefined);

// Optional runtime override you can set from DevTools:  window.__API_BASE__ = '...'
declare global { interface Window { __API_BASE__?: string } }
const RUNTIME_BASE = typeof window !== "undefined" ? window.__API_BASE__ : undefined;

// Sensible fallbacks:
// - SSR/dev: http://localhost:8000  (we'll add /api below)
// - Browser/dev: /api  (useful if you proxy locally)
const RAW_BASE =
  RUNTIME_BASE ??
  BUILT_BASE ??
  (typeof window === "undefined" ? "http://localhost:8000" : "/api");

// Normalize: strip trailing slashes
function stripTrailing(s: string) { return s.replace(/\/+$/, ""); }

// Ensure the base includes /api (but don't double it)
function withApi(base: string) {
  const b = stripTrailing(base);
  return /(^|\/)api$|(^|\/)api\//.test(b) ? b : `${b}/api`;
}

export const API_BASE = withApi(RAW_BASE);

// Expose for quick checks in DevTools
if (typeof window !== "undefined") window.__API_BASE__ = API_BASE;

function join(base: string, path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(join(API_BASE, path), {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${txt ? ` — ${txt}` : ""}`);
  }

  if (res.status === 204) return undefined as unknown as T;

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json() as Promise<T>;
  // If backend ever returns text, still resolve (handy for /health)
  return (await res.text()) as unknown as T;
}

export const api = {
  get:    <T>(path: string) => request<T>(path),
  post:   <T>(path: string, body?: unknown, init?: RequestInit) =>
            request<T>(path, { method: "POST", body: body == null ? undefined : JSON.stringify(body), ...init }),
  put:    <T>(path: string, body?: unknown, init?: RequestInit) =>
            request<T>(path, { method: "PUT",  body: body == null ? undefined : JSON.stringify(body), ...init }),
  delete: <T>(path: string, init?: RequestInit) =>
            request<T>(path, { method: "DELETE", ...init }),
};
