"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type SyncState = "idle" | "syncing" | "done" | "error";

interface Props {
  communityLatest: string | null;
  energyLatest: string | null;
  internetLatest: string | null;
  nextSync: string;
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

export default function SyncButton({
  communityLatest,
  energyLatest,
  internetLatest,
  nextSync,
}: Props) {
  const router = useRouter();
  const [state, setSyncState] = useState<SyncState>("idle");
  const [result, setResult] = useState<{ synced?: Record<string, number>; error?: string } | null>(null);

  async function handleSync() {
    setSyncState("syncing");
    setResult(null);
    try {
      const res = await fetch("/api/dashboard/sync", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setSyncState("done");
        setResult({ synced: data.synced });
        router.refresh();
      } else {
        setSyncState("error");
        setResult({ error: data.error });
      }
    } catch {
      setSyncState("error");
      setResult({ error: "Request failed" });
    }
  }

  const internetStale =
    internetLatest
      ? (() => {
          const [y, m] = internetLatest.split("-").map(Number);
          const now = new Date();
          return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m) > 2;
        })()
      : true;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs">
      {state === "syncing" ? (
        <Loader2 className="h-3.5 w-3.5 text-stone-400 flex-shrink-0 animate-spin" />
      ) : state === "done" ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
      ) : state === "error" ? (
        <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
      )}

      <div className="space-y-0.5">
        {state === "done" && result?.synced ? (
          <p className="text-emerald-700 font-medium">
            Synced — {Object.entries(result.synced).map(([k, v]) => `${k}: ${v}`).join(", ")}
          </p>
        ) : state === "error" ? (
          <p className="text-red-600">{result?.error || "Sync failed"}</p>
        ) : (
          <div className="flex gap-3 text-stone-600">
            <span>
              Community{" "}
              <span className="font-medium text-stone-900">
                {communityLatest ? fmtMonth(communityLatest) : "—"}
              </span>
            </span>
            <span>
              Energy{" "}
              <span className="font-medium text-stone-900">
                {energyLatest ? fmtMonth(energyLatest) : "—"}
              </span>
            </span>
            <span className={internetStale ? "text-amber-600" : ""}>
              Internet{" "}
              <span className={`font-medium ${internetStale ? "text-amber-700" : "text-stone-900"}`}>
                {internetLatest ? fmtMonth(internetLatest) : "—"}
                {internetStale ? " ⚠" : ""}
              </span>
            </span>
          </div>
        )}
        <p className="text-stone-400">
          Next sync:{" "}
          <span className="text-stone-600">{nextSync}</span>
        </p>
      </div>

      <button
        onClick={handleSync}
        disabled={state === "syncing"}
        className="ml-2 rounded-lg border border-stone-200 px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition flex-shrink-0"
      >
        {state === "syncing" ? "Syncing…" : "Sync now"}
      </button>
    </div>
  );
}
