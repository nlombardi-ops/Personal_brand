"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, Loader2, PauseCircle } from "lucide-react";

// D-12: the three inline card actions. Every one is an ordinary PATCH to the
// id-scoped route — mark done sends `{status:'done'}`, mark waiting sends
// `{status:'waiting_on_other'}`, aplazar sends `{due:'<ymd>'}`. There is no
// second endpoint and no second validation path; anything beyond these three
// goes through the slide-over. Cockpit owns the per-card pending/error state
// (keyed by loop id) via onStart/onSettle so two cards never share one spinner.
export type QuickActionKey = "done" | "waiting" | "aplazar";

type QuickActionPatch =
  | { status: "done" }
  | { status: "waiting_on_other" }
  | { due: string };

interface Props {
  loopId: string;
  pendingAction: QuickActionKey | null;
  onStart: (key: QuickActionKey) => void;
  onSettle: (ok: boolean) => void;
}

// 44px hit area, 16px icon (UI-SPEC Spacing Scale touch-target exception).
const btnClass =
  "flex h-11 w-11 items-center justify-center rounded-md text-neutral-500 transition-colors hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172a] disabled:opacity-50";

export default function QuickActions({
  loopId,
  pendingAction,
  onStart,
  onSettle,
}: Props) {
  const router = useRouter();
  const [showDate, setShowDate] = useState(false);
  const busy = pendingAction !== null;

  async function run(patch: QuickActionPatch, key: QuickActionKey) {
    onStart(key);
    try {
      const res = await fetch(`/api/community/open-loops/${loopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        onSettle(false);
        return;
      }
      onSettle(true);
      // Server re-reads and re-groups — a done card vanishes, a waiting/aplazada
      // card moves to the column its date + status now imply.
      router.refresh();
    } catch {
      onSettle(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Marcar hecho"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          void run({ status: "done" }, "done");
        }}
        className={btnClass}
      >
        {pendingAction === "done" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </button>

      <button
        type="button"
        aria-label="Marcar a la espera"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          void run({ status: "waiting_on_other" }, "waiting");
        }}
        className={btnClass}
      >
        {pendingAction === "waiting" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <PauseCircle className="h-4 w-4" />
        )}
      </button>

      <div className="relative">
        <button
          type="button"
          aria-label="Aplazar fecha"
          aria-expanded={showDate}
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            setShowDate((v) => !v);
          }}
          className={btnClass}
        >
          {pendingAction === "aplazar" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarClock className="h-4 w-4" />
          )}
        </button>

        {showDate && (
          <div
            className="absolute right-0 top-full z-30 mt-1 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="date"
              autoFocus
              onChange={(e) => {
                const value = e.target.value;
                if (!value) return;
                setShowDate(false);
                void run({ due: value }, "aplazar");
              }}
              className="rounded-md border border-neutral-200 px-2 py-1 text-sm text-neutral-900 outline-none focus:border-neutral-400"
            />
          </div>
        )}
      </div>
    </div>
  );
}
