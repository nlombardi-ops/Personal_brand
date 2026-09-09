"use client";

import { OWNER_LABELS, OWNER_DETAIL_OWNERS } from "@/lib/community/loop-defaults";
import { formatRelativeDue } from "@/lib/community/relative-date";
import type { OpenLoop } from "@/lib/types";

// Which board bucket this card sits in — drives the date-pill colour and the 2px
// left border (Vencidos / Vencen pronto only).
export type UrgencyTone = "overdue" | "dueSoon" | "waiting" | "noDate";

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
}

// D-16: the card shows ONLY the title, a relative due-date pill and an owner
// chip. The next-action text and the loop category live in the slide-over, never
// here. All free text renders as ordinary React children — the raw-HTML
// injection prop is prohibited on this surface (values may quote neighbour
// emails).
export default function LoopCard({ loop, tone, onOpen }: Props) {
  const ownerLabel = OWNER_LABELS[loop.owner];
  const detail =
    loop.owner_detail && OWNER_DETAIL_OWNERS.includes(loop.owner)
      ? loop.owner_detail
      : null;

  return (
    <button
      type="button"
      onClick={() => onOpen(loop)}
      className={`w-full rounded-lg border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-neutral-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172a] focus-visible:ring-offset-2 ${
        LEFT_BORDER[tone] ?? ""
      }`}
    >
      <p className="line-clamp-2 text-sm font-semibold leading-[1.4] text-neutral-900">
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
    </button>
  );
}
