import {
  countStrip,
  COUNT_LABELS,
  type LoopCounts,
} from "@/lib/community/relative-date";

// Numeral colour per bucket (UI-SPEC functional status table). Applied to the
// numeral only — the words stay neutral-600 Label type.
const NUMERAL_COLOR: Record<keyof LoopCounts, string> = {
  overdue: "text-[#b91c1c]",
  dueSoon: "text-[#a16207]",
  waiting: "text-neutral-600",
};

const KEYS: Array<keyof LoopCounts> = ["overdue", "dueSoon", "waiting"];

interface Props {
  counts: LoopCounts;
  className?: string;
}

// D-17 count strip: three middot-separated segments, Label-size neutral text
// with monospace tabular numerals coloured per bucket. An all-zero strip is
// informational, so its numerals render neutral rather than status-coloured.
export default function CountStrip({ counts, className }: Props) {
  const allZero =
    counts.overdue === 0 && counts.dueSoon === 0 && counts.waiting === 0;

  return (
    <p className={`text-xs font-semibold text-neutral-600 ${className ?? ""}`}>
      <span className="sr-only">{countStrip(counts)}</span>
      <span aria-hidden="true">
        {KEYS.map((key, i) => {
          const n = counts[key];
          const word = n === 1 ? COUNT_LABELS[key].one : COUNT_LABELS[key].many;
          return (
            <span key={key}>
              {i > 0 ? <span className="mx-1 text-neutral-400"> · </span> : null}
              <span
                className={`font-mono tabular-nums ${
                  allZero ? "text-neutral-500" : NUMERAL_COLOR[key]
                }`}
              >
                {n}
              </span>{" "}
              {word}
            </span>
          );
        })}
      </span>
    </p>
  );
}
