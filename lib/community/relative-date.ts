// PURE module — the fixed Spanish relative-date vocabulary (D-16) and the D-17
// count-strip phrasing live here and nowhere else, so the JSX never re-derives a
// plural rule and the unit test is the single guard on the wording. Only import
// is `differenceInCalendarDays` from date-fns.
import { differenceInCalendarDays } from "date-fns";

export interface LoopCounts {
  overdue: number;
  dueSoon: number;
  waiting: number;
}

// See lib/community/urgency.ts parseYmd for the accepted timezone constraint
// (RESEARCH Pitfall 5): the same y/m/d split keeps membership and label in the
// same runtime timezone, so the column a card sits in can never contradict its
// pill text.
function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * The UI-SPEC "Relative due-date formatting" vocabulary table, verbatim:
 *   delta ≤ -2 → "hace {n} días"   (n positive)
 *   delta -1   → "vencía ayer"
 *   delta 0    → "vence hoy"
 *   delta 1    → "vence mañana"
 *   delta ≥ 2  → "vence en {n} días"  (2..14 on cards; beyond 14 in the waiting column)
 */
export function formatRelativeDue(dueYmd: string, now: Date = new Date()): string {
  const days = differenceInCalendarDays(parseYmd(dueYmd), now);
  if (days <= -2) return `hace ${Math.abs(days)} días`;
  if (days === -1) return "vencía ayer";
  if (days === 0) return "vence hoy";
  if (days === 1) return "vence mañana";
  return `vence en ${days} días`;
}

// D-17 vocabulary — the ONLY place the count-strip words live. `countStrip`
// below and the CountStrip component both read from here, so the singular forms
// ("a la espera" is invariant) cannot drift from the unit test.
export const COUNT_LABELS: Record<
  keyof LoopCounts,
  { one: string; many: string }
> = {
  overdue: { one: "vencido", many: "vencidos" },
  dueSoon: { one: "vence pronto", many: "vencen pronto" },
  waiting: { one: "a la espera", many: "a la espera" },
};

const segment = (n: number, key: keyof LoopCounts) =>
  `${n} ${n === 1 ? COUNT_LABELS[key].one : COUNT_LABELS[key].many}`;

/**
 * The D-17 header strip: `{X} vencidos · {Y} vencen pronto · {Z} a la espera`
 * with the UI-SPEC singular forms `1 vencido`, `1 vence pronto`, `1 a la espera`.
 */
export function countStrip(counts: LoopCounts): string {
  return [
    segment(counts.overdue, "overdue"),
    segment(counts.dueSoon, "dueSoon"),
    segment(counts.waiting, "waiting"),
  ].join(" · ");
}
