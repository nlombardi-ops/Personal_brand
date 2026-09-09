"use client";

import LoopCard, { type UrgencyTone } from "./LoopCard";
import type { OpenLoop } from "@/lib/types";

const COUNT_COLOR: Record<UrgencyTone, string> = {
  overdue: "text-[#b91c1c]",
  dueSoon: "text-[#a16207]",
  waiting: "text-neutral-600",
  noDate: "text-neutral-500",
};

interface Props {
  title: string;
  tone: UrgencyTone;
  loops: OpenLoop[];
  emptyCopy: string;
  onOpen: (loop: OpenLoop) => void;
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

      <div className="flex flex-col gap-2 overflow-y-auto lg:max-h-[calc(100vh-16rem)]">
        {loops.length === 0 ? (
          <p className="text-xs leading-5 text-neutral-500">{emptyCopy}</p>
        ) : (
          loops.map((loop) => (
            <LoopCard key={loop.id} loop={loop} tone={tone} onOpen={onOpen} />
          ))
        )}
      </div>
    </section>
  );
}
