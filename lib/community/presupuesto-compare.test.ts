// Local-only Node built-in test (node:test). This repo has NO test runner and no
// CI — run manually with `node --test lib/community/presupuesto-compare.test.ts`.
// Vercel and `next build` never execute it. `npx tsc --noEmit` and `npm run lint`
// still cover it. Native TypeScript type-stripping handles the syntax (local
// Node is 25.x); on Node < 23.6 add `--experimental-strip-types`. Type-only
// imports MUST use the `import type` form so stripping can erase them.
import test from "node:test";
import assert from "node:assert/strict";

import { comparePresupuestos } from "./presupuesto-compare.ts";
import type { Presupuesto } from "../types.ts";

let seq = 0;
function makePresupuesto(overrides: Partial<Presupuesto> = {}): Presupuesto {
  seq += 1;
  return {
    id: `p-${seq}`,
    loop_id: "loop-1",
    provider: `Provider ${seq}`,
    base_imponible_cents: 100000,
    iva_pct: 21,
    total_cents: 121000,
    scope: "",
    received_at: null,
    valid_until: null,
    document_id: null,
    status: "active",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ── empty / single ──────────────────────────────────────────────────────────

test("comparePresupuestos: empty list returns a null cheapestId and an empty order", () => {
  const result = comparePresupuestos([]);
  assert.equal(result.cheapestId, null);
  assert.deepEqual(result.order, []);
});

test("comparePresupuestos: a single presupuesto is the cheapest with a delta of 0", () => {
  const p = makePresupuesto({ total_cents: 149382 });
  const result = comparePresupuestos([p]);
  assert.equal(result.cheapestId, p.id);
  assert.equal(result.order.length, 1);
  assert.equal(result.order[0].delta_cents, 0);
});

// ── cheapest + deltas ────────────────────────────────────────────────────────

test("comparePresupuestos: three quotes — cheapestId is the first cheapest, deltas are correct", () => {
  const a = makePresupuesto({ total_cents: 149382 });
  const b = makePresupuesto({ total_cents: 191000 });
  const c = makePresupuesto({ total_cents: 210000 });
  const result = comparePresupuestos([a, b, c]);
  assert.equal(result.cheapestId, a.id);
  const byId = new Map(result.order.map((r) => [r.id, r]));
  assert.equal(byId.get(a.id)?.delta_cents, 0);
  assert.equal(byId.get(b.id)?.delta_cents, 41618);
  assert.equal(byId.get(c.id)?.delta_cents, 60618);
});

test("comparePresupuestos: two quotes sharing the minimum total — first in input order is cheapest, both have delta 0", () => {
  const a = makePresupuesto({ total_cents: 149382 });
  const b = makePresupuesto({ total_cents: 149382 });
  const c = makePresupuesto({ total_cents: 200000 });
  const result = comparePresupuestos([a, b, c]);
  assert.equal(result.cheapestId, a.id);
  const byId = new Map(result.order.map((r) => [r.id, r]));
  assert.equal(byId.get(a.id)?.delta_cents, 0);
  assert.equal(byId.get(b.id)?.delta_cents, 0);
});

// ── archived exclusion ───────────────────────────────────────────────────────

test("comparePresupuestos: an archived presupuesto is excluded and cannot be cheapest even with the lowest total", () => {
  const cheapButArchived = makePresupuesto({ total_cents: 1000, status: "archived" });
  const active = makePresupuesto({ total_cents: 50000 });
  const result = comparePresupuestos([cheapButArchived, active]);
  assert.equal(result.cheapestId, active.id);
  assert.equal(result.order.length, 1);
  assert.equal(result.order.some((r) => r.id === cheapButArchived.id), false);
});

test("comparePresupuestos: a list where every presupuesto is archived behaves like the empty list", () => {
  const a = makePresupuesto({ status: "archived" });
  const b = makePresupuesto({ status: "archived" });
  const result = comparePresupuestos([a, b]);
  assert.equal(result.cheapestId, null);
  assert.deepEqual(result.order, []);
});

// ── sort: total ──────────────────────────────────────────────────────────────

test("comparePresupuestos: sorting by total orders ascending by total_cents", () => {
  const a = makePresupuesto({ total_cents: 200000 });
  const b = makePresupuesto({ total_cents: 100000 });
  const c = makePresupuesto({ total_cents: 150000 });
  const result = comparePresupuestos([a, b, c], "total");
  assert.deepEqual(
    result.order.map((r) => r.id),
    [b.id, c.id, a.id],
  );
});

test("comparePresupuestos: two quotes with the same total keep input order (stable sort)", () => {
  const a = makePresupuesto({ total_cents: 100000 });
  const b = makePresupuesto({ total_cents: 100000 });
  const c = makePresupuesto({ total_cents: 100000 });
  const result = comparePresupuestos([a, b, c], "total");
  assert.deepEqual(
    result.order.map((r) => r.id),
    [a.id, b.id, c.id],
  );
});

// ── sort: received_at ────────────────────────────────────────────────────────

test("comparePresupuestos: sorting by received_at orders ascending, nulls last regardless of total", () => {
  const later = makePresupuesto({ total_cents: 100000, received_at: "2026-02-01" });
  const sooner = makePresupuesto({ total_cents: 900000, received_at: "2026-01-01" });
  const noDate = makePresupuesto({ total_cents: 1, received_at: null });
  const result = comparePresupuestos([later, sooner, noDate], "received_at");
  assert.deepEqual(
    result.order.map((r) => r.id),
    [sooner.id, later.id, noDate.id],
  );
});

test("comparePresupuestos: an absent received_at also sorts last", () => {
  const dated = makePresupuesto({ received_at: "2026-01-01" });
  // Omit received_at entirely (not just null) to cover "absent" per the spec.
  const undatedPatch = makePresupuesto();
  delete (undatedPatch as { received_at?: string | null }).received_at;
  const result = comparePresupuestos([undatedPatch, dated], "received_at");
  assert.deepEqual(
    result.order.map((r) => r.id),
    [dated.id, undatedPatch.id],
  );
});

test("comparePresupuestos: two quotes with the same received_at keep input order (stable sort)", () => {
  const a = makePresupuesto({ received_at: "2026-01-01" });
  const b = makePresupuesto({ received_at: "2026-01-01" });
  const result = comparePresupuestos([a, b], "received_at");
  assert.deepEqual(
    result.order.map((r) => r.id),
    [a.id, b.id],
  );
});

// ── highlight invariance ──────────────────────────────────────────────────────

test("comparePresupuestos: cheapestId is identical for both sort keys over the same input", () => {
  const a = makePresupuesto({ total_cents: 200000, received_at: "2026-03-01" });
  const b = makePresupuesto({ total_cents: 100000, received_at: "2026-01-01" });
  const c = makePresupuesto({ total_cents: 150000, received_at: "2026-02-01" });
  const byTotal = comparePresupuestos([a, b, c], "total");
  const byDate = comparePresupuestos([a, b, c], "received_at");
  assert.equal(byTotal.cheapestId, b.id);
  assert.equal(byDate.cheapestId, b.id);
  assert.equal(byTotal.cheapestId, byDate.cheapestId);
});

// ── non-mutation ───────────────────────────────────────────────────────────

test("comparePresupuestos does not mutate its input array's order", () => {
  const a = makePresupuesto({ total_cents: 300000 });
  const b = makePresupuesto({ total_cents: 100000 });
  const c = makePresupuesto({ total_cents: 200000 });
  const list = [a, b, c];
  comparePresupuestos(list, "total");
  assert.deepEqual(
    list.map((p) => p.id),
    [a.id, b.id, c.id],
  );
});
