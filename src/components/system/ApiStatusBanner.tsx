import React from "react";
import { api, API_BASE } from "@/lib/api";

export default function ApiStatusBanner() {
  const [ok, setOk] = React.useState<boolean | null>(null);
  const [msg, setMsg] = React.useState<string>("");

  React.useEffect(() => {
    let mounted = true;
    api.get<{ ok: boolean }>("/health")
      .then((j) => { if (mounted) { setOk(!!j.ok); setMsg(""); } })
      .catch((e) => { if (mounted) { setOk(false); setMsg(e instanceof Error ? e.message : String(e)); } });
    return () => { mounted = false; };
  }, []);

  // Hide when healthy
  if (ok === true) return null;

  return (
    <div className={`w-full px-3 py-2 text-xs ${
      ok === null ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
    }`}>
      <div className="container mx-auto px-4 flex items-center justify-between gap-3">
        <div className="truncate">
          {ok === null ? "Checking API…" : "API not reachable — requests may fail."}
          <span className="ml-2 opacity-70">Base:</span> <code>{API_BASE}</code>
          {msg ? <span className="ml-2 opacity-70">({msg})</span> : null}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="shrink-0 rounded border px-2 py-1 hover:bg-white/40"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
