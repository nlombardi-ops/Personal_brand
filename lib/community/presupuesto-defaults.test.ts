// Local-only Node built-in test (node:test). This repo has NO test runner and no
// CI — run manually with `node --test lib/community/presupuesto-defaults.test.ts`.
// Vercel and `next build` never execute it. `npx tsc --noEmit` and `npm run lint`
// still cover it. Native TypeScript type-stripping handles the syntax (local
// Node is 25.x); on Node < 23.6 add `--experimental-strip-types`. Type-only
// imports MUST use the `import type` form so stripping can erase them.
import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_IVA_PCT,
  PATCHABLE_PRESUPUESTO_KEYS,
  applyPresupuestoCreateDefaults,
  applyPresupuestoPatch,
  computeTotalCents,
  parseEurosToCents,
  validatePresupuestoInput,
} from "./presupuesto-defaults.ts";
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
    status: "active",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ── computeTotalCents ───────────────────────────────────────────────────────

test("computeTotalCents: 123456 base at 21% gives exactly 149382", () => {
  assert.equal(computeTotalCents(123456, 21), 149382);
});

test("computeTotalCents: an IVA of zero leaves the base untouched", () => {
  assert.equal(computeTotalCents(100000, 0), 100000);
});

test("computeTotalCents: the reduced 10% Spanish rate for some reformas", () => {
  assert.equal(computeTotalCents(100000, 10), 110000);
});

test("computeTotalCents: rounds half-up at the cent", () => {
  assert.equal(computeTotalCents(50, 1), 51);
});

test("computeTotalCents: sub-cent IVA rounds to the nearest cent, not to zero", () => {
  assert.equal(computeTotalCents(1, 21), 1);
});

test("computeTotalCents: the result is always an integer", () => {
  assert.ok(Number.isInteger(computeTotalCents(333, 7)));
  assert.ok(Number.isInteger(computeTotalCents(999999, 21)));
  assert.ok(Number.isInteger(computeTotalCents(1, 1)));
  assert.ok(Number.isInteger(computeTotalCents(0, 21)));
});

// ── parseEurosToCents ────────────────────────────────────────────────────────

test("parseEurosToCents: dot decimal separator", () => {
  assert.equal(parseEurosToCents("1234.56"), 123456);
});

test("parseEurosToCents: comma decimal separator", () => {
  assert.equal(parseEurosToCents("1234,56"), 123456);
});

test("parseEurosToCents: thousands dot, decimal comma", () => {
  assert.equal(parseEurosToCents("1.234,56"), 123456);
});

test("parseEurosToCents: integer euros with no decimals", () => {
  assert.equal(parseEurosToCents("1234"), 123400);
});

test("parseEurosToCents: a single decimal digit", () => {
  assert.equal(parseEurosToCents("1234,5"), 123450);
});

test("parseEurosToCents: empty string returns null", () => {
  assert.equal(parseEurosToCents(""), null);
});

test("parseEurosToCents: non-numeric text returns null", () => {
  assert.equal(parseEurosToCents("abc"), null);
});

test("parseEurosToCents: negative values return null", () => {
  assert.equal(parseEurosToCents("-5"), null);
});

test("parseEurosToCents: an ambiguous double-separator string returns null", () => {
  assert.equal(parseEurosToCents("1,234.56.7"), null);
});

// ── validatePresupuestoInput ─────────────────────────────────────────────────

test("validatePresupuestoInput: create without loop_id returns a Spanish message", () => {
  const msg = validatePresupuestoInput({ provider: "X" }, { create: true });
  assert.ok(typeof msg === "string" && msg.length > 0);
});

test("validatePresupuestoInput: create without provider returns a Spanish message", () => {
  const msg = validatePresupuestoInput({ loop_id: "loop-1" }, { create: true });
  assert.ok(typeof msg === "string" && msg.length > 0);
});

test("validatePresupuestoInput: base_imponible_cents zero is rejected", () => {
  const msg = validatePresupuestoInput(
    { loop_id: "loop-1", provider: "X", base_imponible_cents: 0 },
    { create: true },
  );
  assert.ok(typeof msg === "string");
});

test("validatePresupuestoInput: base_imponible_cents negative is rejected", () => {
  const msg = validatePresupuestoInput(
    { loop_id: "loop-1", provider: "X", base_imponible_cents: -5 },
    { create: true },
  );
  assert.ok(typeof msg === "string");
});

test("validatePresupuestoInput: base_imponible_cents non-integer is rejected", () => {
  const msg = validatePresupuestoInput(
    { loop_id: "loop-1", provider: "X", base_imponible_cents: 100.5 },
    { create: true },
  );
  assert.ok(typeof msg === "string");
});

test("validatePresupuestoInput: base_imponible_cents one above the one-million-euro cap is rejected", () => {
  const msg = validatePresupuestoInput(
    { loop_id: "loop-1", provider: "X", base_imponible_cents: 100000001 },
    { create: true },
  );
  assert.ok(typeof msg === "string");
});

test("validatePresupuestoInput: base_imponible_cents exactly at the cap is accepted", () => {
  const msg = validatePresupuestoInput(
    { loop_id: "loop-1", provider: "X", base_imponible_cents: 100000000 },
    { create: true },
  );
  assert.equal(msg, null);
});

test("validatePresupuestoInput: iva_pct below 0 is rejected", () => {
  const msg = validatePresupuestoInput(
    { loop_id: "loop-1", provider: "X", iva_pct: -1 },
    { create: true },
  );
  assert.ok(typeof msg === "string");
});

test("validatePresupuestoInput: iva_pct above 100 is rejected", () => {
  const msg = validatePresupuestoInput(
    { loop_id: "loop-1", provider: "X", iva_pct: 101 },
    { create: true },
  );
  assert.ok(typeof msg === "string");
});

test("validatePresupuestoInput: malformed received_at is rejected", () => {
  const msg = validatePresupuestoInput(
    { loop_id: "loop-1", provider: "X", received_at: "01-01-2026" },
    { create: true },
  );
  assert.ok(typeof msg === "string");
});

test("validatePresupuestoInput: null received_at is fine", () => {
  const msg = validatePresupuestoInput(
    { loop_id: "loop-1", provider: "X", received_at: null },
    { create: true },
  );
  assert.equal(msg, null);
});

test("validatePresupuestoInput: absent received_at and valid_until are both fine", () => {
  const msg = validatePresupuestoInput({ loop_id: "loop-1", provider: "X" }, { create: true });
  assert.equal(msg, null);
});

test("validatePresupuestoInput: malformed valid_until is rejected", () => {
  const msg = validatePresupuestoInput(
    { loop_id: "loop-1", provider: "X", valid_until: "not-a-date" },
    { create: true },
  );
  assert.ok(typeof msg === "string");
});

test("validatePresupuestoInput: a body carrying total_cents is not rejected by the validator", () => {
  const msg = validatePresupuestoInput(
    { loop_id: "loop-1", provider: "X", total_cents: 1 },
    { create: true },
  );
  assert.equal(msg, null);
});

test("validatePresupuestoInput: a non-plain-object body is rejected", () => {
  const msg = validatePresupuestoInput("nope", { create: true });
  assert.ok(typeof msg === "string");
});

// ── applyPresupuestoPatch ─────────────────────────────────────────────────────

test("applyPresupuestoPatch: patching base_imponible_cents recomputes total_cents from the merged record", () => {
  const existing = makePresupuesto({
    base_imponible_cents: 100000,
    iva_pct: 21,
    total_cents: 121000,
  });
  const updated = applyPresupuestoPatch(existing, { base_imponible_cents: 200000 });
  assert.equal(updated.total_cents, computeTotalCents(200000, 21));
});

test("applyPresupuestoPatch: patching iva_pct recomputes total_cents", () => {
  const existing = makePresupuesto({
    base_imponible_cents: 100000,
    iva_pct: 21,
    total_cents: 121000,
  });
  const updated = applyPresupuestoPatch(existing, { iva_pct: 10 });
  assert.equal(updated.total_cents, computeTotalCents(100000, 10));
});

test("applyPresupuestoPatch: patching only scope leaves total_cents byte-identical", () => {
  const existing = makePresupuesto({
    base_imponible_cents: 100000,
    iva_pct: 21,
    total_cents: 121000,
  });
  const updated = applyPresupuestoPatch(existing, { scope: "otra cosa" });
  assert.equal(updated.total_cents, existing.total_cents);
});

test("applyPresupuestoPatch: a patch carrying total_cents directly does not change the stored total", () => {
  const existing = makePresupuesto({
    base_imponible_cents: 100000,
    iva_pct: 21,
    total_cents: 121000,
  });
  const updated = applyPresupuestoPatch(existing, { total_cents: 1 });
  assert.equal(updated.total_cents, existing.total_cents);
});

test("applyPresupuestoPatch: a patch carrying id, loop_id or created_at changes none of them", () => {
  const existing = makePresupuesto({
    id: "p-real",
    loop_id: "loop-real",
    created_at: "2026-01-01T00:00:00.000Z",
  });
  const updated = applyPresupuestoPatch(existing, {
    id: "hijacked",
    loop_id: "other-loop",
    created_at: "2000-01-01T00:00:00.000Z",
  });
  assert.equal(updated.id, "p-real");
  assert.equal(updated.loop_id, "loop-real");
  assert.equal(updated.created_at, "2026-01-01T00:00:00.000Z");
});

test("applyPresupuestoPatch never reads a prototype-polluting key as an own property", () => {
  const existing = makePresupuesto();
  const malicious = JSON.parse('{"__proto__": {"polluted": true}, "scope": "ok"}');
  const updated = applyPresupuestoPatch(existing, malicious);
  assert.equal(updated.scope, "ok");
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  assert.equal(Object.getPrototypeOf(updated), Object.prototype);
});

test("applyPresupuestoPatch: status accepts only active and archived", () => {
  const existing = makePresupuesto({ status: "active" });
  const untouched = applyPresupuestoPatch(existing, { status: "bogus" });
  assert.equal(untouched.status, "active");
  const archived = applyPresupuestoPatch(existing, { status: "archived" });
  assert.equal(archived.status, "archived");
});

test("applyPresupuestoPatch: updated_at changes on every patch", () => {
  const existing = makePresupuesto({ updated_at: "2020-01-01T00:00:00.000Z" });
  const updated = applyPresupuestoPatch(existing, { scope: "x" });
  assert.notEqual(updated.updated_at, existing.updated_at);
});

// ── applyPresupuestoCreateDefaults ───────────────────────────────────────────

test("applyPresupuestoCreateDefaults: defaults iva_pct to DEFAULT_IVA_PCT and computes the total", () => {
  const fields = applyPresupuestoCreateDefaults({
    loop_id: "loop-1",
    provider: "Puertas Colmenar",
    base_imponible_cents: 123456,
  });
  assert.equal(fields.iva_pct, DEFAULT_IVA_PCT);
  assert.equal(fields.total_cents, 149382);
  assert.equal(fields.status, "active");
  assert.equal(fields.scope, "");
});

test("applyPresupuestoCreateDefaults: an explicit iva_pct overrides the default", () => {
  const fields = applyPresupuestoCreateDefaults({
    loop_id: "loop-1",
    provider: "X",
    base_imponible_cents: 100000,
    iva_pct: 10,
  });
  assert.equal(fields.iva_pct, 10);
  assert.equal(fields.total_cents, 110000);
});

// ── PATCHABLE_PRESUPUESTO_KEYS ───────────────────────────────────────────────

test("PATCHABLE_PRESUPUESTO_KEYS does not include total_cents", () => {
  assert.ok(!(PATCHABLE_PRESUPUESTO_KEYS as readonly string[]).includes("total_cents"));
});

test("PATCHABLE_PRESUPUESTO_KEYS does not include id, loop_id or created_at", () => {
  const keys = PATCHABLE_PRESUPUESTO_KEYS as readonly string[];
  assert.ok(!keys.includes("id"));
  assert.ok(!keys.includes("loop_id"));
  assert.ok(!keys.includes("created_at"));
});
