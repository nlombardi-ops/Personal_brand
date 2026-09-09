"use client";

import LoopCard from "./LoopCard";
import type { QuickActionHandlers, QuickState } from "./LoopColumn";
import type { OpenLoop } from "@/lib/types";

interface Props extends QuickActionHandlers {
  loops: OpenLoop[];
  onOpen: (loop: OpenLoop) => void;
  quickState: QuickState;
}

// D-13 / D-05: the full-width collapsed section beneath the board. Native
// details/summary disclosure, default collapsed. These loops are visible but
// never urgent — muted treatment throughout, no date pill on the cards.
export default function NoDateSection({
  loops,
  onOpen,
  quickState,
  onQuickStart,
  onQuickSettle,
}: Props) {
  if (loops.length === 0) return null;

  return (
    <details className="mt-8 border-t border-neutral-200 pt-4">
      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-widest text-neutral-600">
        Sin fecha · {loops.length}
      </summary>
      <div className="mt-4 flex flex-col gap-2">
        {loops.map((loop) => (
          <LoopCard
            key={loop.id}
            loop={loop}
            tone="noDate"
            onOpen={onOpen}
            pendingAction={quickState[loop.id]?.pendingAction ?? null}
            quickError={quickState[loop.id]?.error ?? false}
            onQuickStart={onQuickStart}
            onQuickSettle={onQuickSettle}
          />
        ))}
      </div>
    </details>
  );
}
