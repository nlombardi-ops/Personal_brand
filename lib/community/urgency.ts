// PURE, isomorphic module (LOOP-04, D-01…D-07). The ONLY imports allowed here are
// `differenceInCalendarDays` from date-fns and the OpenLoop type — no next/*, no
// fs, no React. The same function runs in the Server Component for first paint
// and in the client island after an optimistic mutation; a framework import here
// would break the client re-group.
import { differenceInCalendarDays } from "date-fns";
import type { OpenLoop } from "@/lib/types";

export interface GroupedLoops {
  overdue: OpenLoop[];
  dueSoon: OpenLoop[];
  waiting: OpenLoop[];
  noDate: OpenLoop[];
  counts: { overdue: number; dueSoon: number; waiting: number };
}

// Statuses that are never shown anywhere on the board (D-07).
const HIDDEN_STATUSES = new Set<OpenLoop["status"]>(["done", "dropped"]);

// "Due-soon" window: due within the next 14 calendar days and not yet overdue
// (D-03). Named constant, not an inline literal in the comparison below.
const DUE_SOON_DAYS = 14;

// `due` is a zero-padded "YYYY-MM-DD" string, so a plain lexical comparison is
// already chronological; V8's Array.sort is stable (Node 12+), so equal dates
// keep their input order.
const byDueAsc = (a: OpenLoop, b: OpenLoop) =>
  (a.due ?? "").localeCompare(b.due ?? "");
const byUpdatedDesc = (a: OpenLoop, b: OpenLoop) =>
  b.updated_at.localeCompare(a.updated_at);

/**
 * Split the loops into the three disjoint priority buckets (Vencidos → Vencen
 * pronto → A la espera) plus the dateless "Sin fecha" section. The buckets are a
 * DISJOINT priority cascade — no loop is ever pushed into two arrays. This is
 * RESEARCH assumption A1: D-02's "show in both" and D-04's OR-condition are
 * satisfied by the owner CHIP on the card, not by dual-column membership, which
 * is the only reading consistent with the D-17 count strip. Flagged in this
 * plan's must_haves for confirmation at first UAT.
 */
export function groupLoopsByUrgency(
  loops: OpenLoop[],
  now: Date = new Date(),
): GroupedLoops {
  const overdue: OpenLoop[] = [];
  const dueSoon: OpenLoop[] = [];
  const waiting: OpenLoop[] = [];
  const noDate: OpenLoop[] = [];

  for (const loop of loops) {
    if (HIDDEN_STATUSES.has(loop.status)) continue; // D-07
    if (loop.due === undefined || loop.due === null) {
      noDate.push(loop); // D-05: no due date → its own section, never urgent
      continue;
    }

    // Calendar-day delta (not 24h): date-fns handles DST / partial days / month
    // boundaries, so a loop cannot drift into a different bucket (edge
    // LOOP-04/precision).
    const days = differenceInCalendarDays(parseYmd(loop.due), now);
    if (days < 0) {
      overdue.push(loop); // D-02: past due → Vencidos, regardless of owner/status
    } else if (days <= DUE_SOON_DAYS) {
      dueSoon.push(loop); // D-03: 0..14 calendar days inclusive
    } else {
      waiting.push(loop); // D-01/D-04: everything else that carries a date
    }
  }

  overdue.sort(byDueAsc); // D-06: oldest due first (most overdue at the top)
  dueSoon.sort(byDueAsc); // D-06: soonest first
  waiting.sort(byDueAsc); // D-06: by date
  noDate.sort(byUpdatedDesc); // D-06: most recently updated first

  return {
    overdue,
    dueSoon,
    waiting,
    noDate,
    counts: {
      overdue: overdue.length,
      dueSoon: dueSoon.length,
      waiting: waiting.length,
    },
  };
}

// Parse "YYYY-MM-DD" into a local-midnight Date via an explicit y/m/d split
// rather than the Date constructor, so it pairs with a `now` in the same runtime
// timezone.
//
// Accepted timezone constraint (RESEARCH Pitfall 5): Vercel runs Node in UTC
// while Nicola is in Europe/Madrid, so for a couple of hours around midnight a
// loop can read as one calendar day off. This ≤2h edge fuzz is accepted for a
// single-user tool. The documented fix if it ever bites: derive "today" as a
// Madrid-local "YYYY-MM-DD" string (Intl.DateTimeFormat "en-CA",
// timeZone "Europe/Madrid") and compare lexically against `due`.
function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}
