"use client";

import LoopCard, { type UrgencyTone } from "./LoopCard";
import type { QuickActionKey } from "./QuickActions";
import type { OpenLoop } from "@/lib/types";

export type QuickState = Record<
  string,
  { pendingAction: QuickActionKey | null; error: boolean }
>;

export interface QuickActionHandlers {
  onQuickStart: (loopId: string, key: QuickActionKey) => void;
  onQuickSettle: (loopId: string, ok: boolean) => void;
}

const COUNT_COLOR: Record<UrgencyTone, string> = {
  overdue: "text-[#b91c1c]",
  dueSoon: "text-[#a16207]",
  waiting: "text-neutral-600",
  noDate: "text-neutral-500",
};

interface Props extends QuickActionHandlers {
  title: string;
  tone: UrgencyTone;
  loops: OpenLoop[];
  emptyCopy: string;
  onOpen: (loop: OpenLoop) => void;
  quickState: QuickState;
}

// One board column. Transparent background — status colour touches only the
// count numeral here (and the card left border / date pill). The header stays
// put while the body scrolls within a bounded height so all three columns align.
export default function LoopColumn({
  title,
  tone,
  loops,
  emptyCopy,
  onOpen,
  quickState,
  onQuickStart,
  onQuickSettle,
}: Props) {
  return (
    <section className="flex flex-col bg-transparent">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
          {title}
        </h2>
        <span
          className={`font-mono text-xs tabular-nums ${COUNT_COLOR[tone]}`}
        >
          {loops.length}
        </span>
      </div>

      {/* Bounded scroll only on desktop (lg) so the three columns align; in the
          stacked mobile layout the column grows with its content — no nested
          scroll trap (D-15). */}
      <div className="flex flex-col gap-2 lg:max-h-[calc(100vh-16rem)] lg:overflow-y-auto">
        {loops.length === 0 ? (
          <p className="text-xs leading-5 text-neutral-500">{emptyCopy}</p>
        ) : (
          loops.map((loop) => (
            <LoopCard
              key={loop.id}
              loop={loop}
              tone={tone}
              onOpen={onOpen}
              pendingAction={quickState[loop.id]?.pendingAction ?? null}
              quickError={quickState[loop.id]?.error ?? false}
              onQuickStart={onQuickStart}
              onQuickSettle={onQuickSettle}
            />
          ))
        )}
      </div>
    </section>
  );
}
