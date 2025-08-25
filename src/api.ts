// src/lib/api.ts
type Env = { VITE_API_BASE_URL?: string; NEXT_PUBLIC_API_BASE_URL?: string } & ImportMetaEnv;
declare const process: any;

const built =
  (import.meta as { env?: Env })?.env?.VITE_API_BASE_URL ??
  ((typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) || undefined);

declare global { interface Window { __API_BASE__?: string } }
const runtime = typeof window !== "undefined" ? (window as any).__API_BASE__ : undefined;

export const API_BASE =
  runtime ??
  built ??
  (typeof window === "undefined" ? "http://localhost:8000" : "/api");

if (typeof window !== "undefined") (window as any).__API_BASE__ = API_BASE;

const join = (b: string, p: string) => `${b.replace(/\/$/, "")}/${p.replace(/^\//, "")}`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(join(API_BASE, path), {
    ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${await res.text().catch(()=>"")}`);
  return res.status === 204 ? (undefined as unknown as T) : (res.json() as Promise<T>);
}

export const api = {
  get:   <T>(path: string) => request<T>(path),
  post:  <T>(path: string, body?: unknown, init?: RequestInit) =>
          request<T>(path, { method: "POST", body: body==null?undefined:JSON.stringify(body), ...init }),
  put:   <T>(path: string, body?: unknown, init?: RequestInit) =>
          request<T>(path, { method: "PUT",  body: body==null?undefined:JSON.stringify(body), ...init }),
  delete:<T>(path: string, init?: RequestInit) =>
          request<T>(path, { method: "DELETE", ...init }),
};
