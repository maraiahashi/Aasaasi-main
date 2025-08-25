// src/lib/api.ts

// Build-time envs (Vite, or Next-style fallback)
const BUILT_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ??
  (typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_API_BASE_URL) ??
  undefined;

// Choose base: prod value at build time; sensible fallbacks otherwise
const RAW_BASE =
  BUILT_BASE ??
  (typeof window === "undefined" ? "http://localhost:8000" : "/api");

// Ensure we always end up with ".../api"
function normalize(base: string) {
  const b = base.replace(/\/+$/, "");
  return b.endsWith("/api") ? b : `${b}/api`;
}
export const API_BASE = normalize(RAW_BASE);

// Write-only: expose for quick checks (no read precedence!)
if (typeof window !== "undefined") (window as any).__API_BASE__ = API_BASE;

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
  return res.status === 204 ? (undefined as unknown as T) : res.json();
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
