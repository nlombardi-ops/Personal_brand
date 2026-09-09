"use client";

import { OWNER_LABELS, OWNER_DETAIL_OWNERS } from "@/lib/community/loop-defaults";
import { formatRelativeDue } from "@/lib/community/relative-date";
import type { OpenLoop } from "@/lib/types";
import QuickActions, { type QuickActionKey } from "./QuickActions";

// Which board bucket this card sits in — drives the date-pill colour and the 2px
// left border (Vencidos / Vencen pronto only).
export type UrgencyTone = "overdue" | "dueSoon" | "waiting" | "noDate";

// UI-SPEC Copywriting Contract → Error states (mutation failure). Duplicated as
// a literal here rather than imported from Cockpit to avoid an import cycle.
const SAVE_ERROR =
  "No se ha podido guardar el bucle. Revisa tu conexión e inténtalo de nuevo.";

const PILL_COLOR: Record<UrgencyTone, string> = {
  overdue: "text-[#b91c1c]",
  dueSoon: "text-[#a16207]",
  waiting: "text-neutral-600",
  noDate: "text-neutral-500",
};

// 2px left border in the urgency colour, Vencidos + Vencen pronto only (UI-SPEC).
const LEFT_BORDER: Partial<Record<UrgencyTone, string>> = {
  overdue: "border-l-2 border-l-[#b91c1c]",
  dueSoon: "border-l-2 border-l-[#a16207]",
};

interface Props {
  loop: OpenLoop;
  tone: UrgencyTone;
  onOpen: (loop: OpenLoop) => void;
  pendingAction: QuickActionKey | null;
  quickError: boolean;
  onQuickStart: (loopId: string, key: QuickActionKey) => void;
  onQuickSettle: (loopId: string, ok: boolean) => void;
}

// D-16: the card shows ONLY the title, a relative due-date pill and an owner
// chip — plus the D-12 inline quick actions. The next-action text and the loop
// category live in the slide-over, never here. All free text renders as ordinary
// React children — the raw-HTML injection prop is prohibited on this surface
// (values may quote neighbour emails).
export default function LoopCard({
  loop,
  tone,
  onOpen,
  pendingAction,
  quickError,
  onQuickStart,
  onQuickSettle,
}: Props) {
  const ownerLabel = OWNER_LABELS[loop.owner];
  const detail =
    loop.owner_detail && OWNER_DETAIL_OWNERS.includes(loop.owner)
      ? loop.owner_detail
      : null;
  // Only the affected card enters a disabled, reduced-opacity state — the rest
  // of the board stays interactive (UI-SPEC loading | quick-action mutation).
  const busy = pendingAction !== null;

  return (
    <div
      className={`group relative rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 ${
        LEFT_BORDER[tone] ?? ""
      } ${busy ? "opacity-60" : ""}`}
      aria-busy={busy}
    >
      {/* Whole-card affordance: a real button (keyboard-focusable) behind the
          content. The content is pointer-events-none so clicks fall through to
          here; the quick-action layer re-enables pointer events for itself. */}
      <button
        type="button"
        onClick={() => onOpen(loop)}
        disabled={busy}
        aria-label={`Editar bucle: ${loop.title}`}
        className="absolute inset-0 z-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172a] focus-visible:ring-offset-2"
      />

      <div className="pointer-events-none relative z-10">
        <p className="line-clamp-2 pr-2 text-sm font-semibold leading-[1.4] text-neutral-900">
          {loop.title}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {loop.due ? (
            <span
              className={`font-mono text-xs tabular-nums ${PILL_COLOR[tone]}`}
            >
              {formatRelativeDue(loop.due)}
            </span>
          ) : null}
          <span className="inline-flex items-center border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
            {ownerLabel}
            {detail ? (
              <span className="ml-1 inline-block max-w-[12ch] truncate align-bottom">
                ({detail})
              </span>
            ) : null}
          </span>
        </div>
        {quickError ? (
          <p className="mt-2 text-xs font-semibold text-[#b91c1c]">
            {SAVE_ERROR}
          </p>
        ) : null}
      </div>

      {/* Quick actions: always visible on mobile (static row below the meta);
          on desktop an absolute top-right cluster revealed on hover / focus,
          forced visible while pending or after an error (D-12 / D-15). */}
      <div
        className={`pointer-events-auto relative z-20 mt-3 flex justify-end md:absolute md:right-2 md:top-2 md:mt-0 md:transition-opacity ${
          busy || quickError
            ? "md:opacity-100"
            : "md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        }`}
      >
        <QuickActions
          loopId={loop.id}
          pendingAction={pendingAction}
          onStart={(key) => onQuickStart(loop.id, key)}
          onSettle={(ok) => onQuickSettle(loop.id, ok)}
        />
      </div>
    </div>
  );
}
