cat > src/lib/api.ts <<'TS'
// Build-time base (Vite). Also tolerate Next-style if it sneaks in.
const BUILT_BASE: string | undefined =
  (import.meta as any)?.env?.VITE_API_BASE_URL ??
  ((typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_API_BASE_URL) || undefined);

// Runtime override if you ever set it from the console or HTML.
declare global { interface Window { __API_BASE__?: string } }
const RUNTIME_BASE = typeof window !== "undefined" ? (window as any).__API_BASE__ : undefined;

// Final base, with sensible fallbacks
export const API_BASE: string =
  RUNTIME_BASE ??
  BUILT_BASE ??
  (typeof window === "undefined" ? "http://localhost:8000" : "/api");

// Expose for quick checks in DevTools
if (typeof window !== "undefined") (window as any).__API_BASE__ = API_BASE;

function join(base: string, path: string) {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(join(API_BASE, path), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${txt ? ` — ${txt}` : ""}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path:string)=>request<T>(path),
  post:   <T>(path:string,body?:unknown,init?:RequestInit)=>request<T>(path,{method:"POST",body:body==null?undefined:JSON.stringify(body),...init}),
  put:    <T>(path:string,body?:unknown,init?:RequestInit)=>request<T>(path,{method:"PUT", body:body==null?undefined:JSON.stringify(body),...init}),
  delete: <T>(path:string,init?:RequestInit)=>request<T>(path,{method:"DELETE",...init}),
};
TS
