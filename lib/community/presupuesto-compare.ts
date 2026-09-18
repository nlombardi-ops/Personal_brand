// PURE, isomorphic module (LOOP-03, D-18/D-19). The ONLY import allowed here
// is the Presupuesto type — no next/*, no fs, no React. The same function
// runs in the Server Component for first paint and in the client component
// on every sort change; a framework import here would break the client
// re-sort.
import type { Presupuesto } from "@/lib/types";

export type PresupuestoSortKey = "total" | "received_at";

export interface ComparisonRow {
  id: string;
  total_cents: number;
  delta_cents: number;
}

export interface ComparisonResult {
  cheapestId: string | null;
  order: ComparisonRow[];
}

// Statuses that are never shown in the comparison (D-06), mirroring
// urgency.ts's HIDDEN_STATUSES filter idiom.
const HIDDEN_STATUSES = new Set<Presupuesto["status"]>(["archived"]);

// Sorts after any real "YYYY-MM-DD" string, so a null/absent received_at
// pushes that column last rather than sorting first (which treating null as
// the empty string would do).
const SENTINEL_LAST = "￿";

/**
 * Filters out archived presupuestos, finds the cheapest by total_cents
 * (ties resolve to the FIRST in input order), builds a delta-from-cheapest
 * row per survivor, then returns a STABLE-sorted copy by the requested key.
 * `cheapestId` is computed BEFORE sorting and is therefore invariant under
 * `sortKey` (D-19) — the highlight never moves when the sort changes. Never
 * mutates the input array.
 */
export function comparePresupuestos(
  list: Presupuesto[],
  sortKey: PresupuestoSortKey = "total",
): ComparisonResult {
  const visible = list.filter((p) => !HIDDEN_STATUSES.has(p.status));

  if (visible.length === 0) {
    return { cheapestId: null, order: [] };
  }

  // One pass, taking the FIRST index that reaches the minimum so ties
  // resolve to input order.
  let cheapestId = visible[0].id;
  let minCents = visible[0].total_cents;
  for (const p of visible) {
    if (p.total_cents < minCents) {
      minCents = p.total_cents;
      cheapestId = p.id;
    }
  }

  const rows: ComparisonRow[] = visible.map((p) => ({
    id: p.id,
    total_cents: p.total_cents,
    // 0 for EVERY co-cheapest quote, not only for the one that got
    // cheapestId — the UI highlights only cheapestId but shows no delta on
    // any zero-delta column.
    delta_cents: p.total_cents - minCents,
  }));

  const receivedById = new Map(visible.map((p) => [p.id, p.received_at ?? null]));

  // Sort a COPY — V8's Array#sort is stable (Node 12+), so equal keys keep
  // input order.
  const order = [...rows];
  if (sortKey === "total") {
    order.sort((a, b) => a.total_cents - b.total_cents);
  } else {
    order.sort((a, b) => {
      const aDate = receivedById.get(a.id) || SENTINEL_LAST;
      const bDate = receivedById.get(b.id) || SENTINEL_LAST;
      return aDate.localeCompare(bDate);
    });
  }

  return { cheapestId, order };
}
