// src/lib/api.ts

// Treat this as a module so the global augmentation works.
export {};

// Try Vite-style env first, then Next-style. Avoid @types/node requirement.
type Env = Partial<{
  VITE_API_BASE_URL: string;
  NEXT_PUBLIC_API_BASE_URL: string;
}>;

const viteEnv = (import.meta as any)?.env as Env | undefined;
const BUILT_BASE: string | undefined =
  viteEnv?.VITE_API_BASE_URL ??
  ((globalThis as any)?.process?.env?.NEXT_PUBLIC_API_BASE_URL as string | undefined);

// Runtime override if you ever set it from the console or HTML.
declare global {
  interface Window { __API_BASE__?: string }
}
const RUNTIME_BASE =
  typeof window !== "undefined" ? (window as any).__API_BASE__ : undefined;

// Final base, with sensible fallbacks.
export const API_BASE: string =
  RUNTIME_BASE ??
  BUILT_BASE ??
  (typeof window === "undefined" ? "http://localhost:8000" : "/api");

// Expose for quick checks in DevTools.
if (typeof window !== "undefined") (window as any).__API_BASE__ = API_BASE;

const join = (base: string, path: string) =>
  `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(join(API_BASE, path), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${txt ? ` — ${txt}` : ""}`);
  }
  // Allow void on 204
  // @ts-expect-error
  return res.status === 204 ? undefined : ((await res.json()) as T);
}

export const api = {
  get:   <T>(path: string) => request<T>(path),
  post:  <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, { method: "POST", body: body == null ? undefined : JSON.stringify(body), ...init }),
  put:   <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, { method: "PUT",  body: body == null ? undefined : JSON.stringify(body), ...init }),
  delete:<T>(path: string, init?: RequestInit) =>
    request<T>(path, { method: "DELETE", ...init }),
};
