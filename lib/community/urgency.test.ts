// Local-only Node built-in test (node:test). This repo has NO test runner and no
// CI — run manually with `node --test lib/community/urgency.test.ts`. Vercel and
// `next build` never execute it. `npx tsc --noEmit` and `npm run lint` still cover
// it. Native TypeScript type-stripping handles the syntax (local Node is 25.x);
// on Node < 23.6 add `--experimental-strip-types`. Type-only imports MUST use the
// `import type` form so stripping can erase them.
import test from "node:test";
import assert from "node:assert/strict";

import { groupLoopsByUrgency } from "./urgency.ts";
import { formatRelativeDue, countStrip } from "./relative-date.ts";
import type { OpenLoop } from "../types.ts";

// A fixed "now" so every assertion is deterministic regardless of the wall clock
// or the runtime timezone.
const NOW = new Date(2026, 0, 15, 9, 30, 0);

const pad = (n: number) => String(n).padStart(2, "0");

/** YMD string for NOW shifted by `delta` calendar days. */
function ymd(delta: number): string {
  const d = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + delta);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

let seq = 0;
function makeLoop(overrides: Partial<OpenLoop> = {}): OpenLoop {
  seq += 1;
  return {
    id: `loop-${seq}`,
    title: `Loop ${seq}`,
    kind: "commitment",
    status: "open",
    owner: "me",
    next_action: "Do the thing",
    source: "manual",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ── groupLoopsByUrgency ───────────────────────────────────────────────────

test("empty input returns four empty arrays and zero counts", () => {
  const g = groupLoopsByUrgency([], NOW);
  assert.deepEqual(g.overdue, []);
  assert.deepEqual(g.dueSoon, []);
  assert.deepEqual(g.waiting, []);
  assert.deepEqual(g.noDate, []);
  assert.deepEqual(g.counts, { overdue: 0, dueSoon: 0, waiting: 0 });
});

test("done and dropped loops appear in none of the four arrays (D-07)", () => {
  const done = makeLoop({ status: "done", due: ymd(-3) });
  const dropped = makeLoop({ status: "dropped", due: ymd(5) });
  const g = groupLoopsByUrgency([done, dropped], NOW);
  assert.deepEqual(g.overdue, []);
  assert.deepEqual(g.dueSoon, []);
  assert.deepEqual(g.waiting, []);
  assert.deepEqual(g.noDate, []);
});

test("due today (delta 0) lands in dueSoon (D-03)", () => {
  const g = groupLoopsByUrgency([makeLoop({ due: ymd(0) })], NOW);
  assert.equal(g.dueSoon.length, 1);
  assert.equal(g.overdue.length, 0);
});

test("due in exactly 14 days lands in dueSoon (boundary, D-03)", () => {
  const g = groupLoopsByUrgency([makeLoop({ due: ymd(14) })], NOW);
  assert.equal(g.dueSoon.length, 1);
  assert.equal(g.waiting.length, 0);
});

test("due in 15 days lands in waiting (one step past the boundary)", () => {
  const g = groupLoopsByUrgency([makeLoop({ due: ymd(15) })], NOW);
  assert.equal(g.waiting.length, 1);
  assert.equal(g.dueSoon.length, 0);
});

test("due yesterday (delta -1) lands in overdue (D-02)", () => {
  const g = groupLoopsByUrgency([makeLoop({ due: ymd(-1) })], NOW);
  assert.equal(g.overdue.length, 1);
  assert.equal(g.dueSoon.length, 0);
});

test("due 400 days ago lands in overdue", () => {
  const g = groupLoopsByUrgency([makeLoop({ due: ymd(-400) })], NOW);
  assert.equal(g.overdue.length, 1);
});

test("a loop with due absent lands in noDate only (D-05)", () => {
  const g = groupLoopsByUrgency([makeLoop({ due: undefined })], NOW);
  assert.equal(g.noDate.length, 1);
  assert.equal(g.overdue.length + g.dueSoon.length + g.waiting.length, 0);
});

test("a loop with due: null lands in noDate only (D-05)", () => {
  const g = groupLoopsByUrgency([makeLoop({ due: null })], NOW);
  assert.equal(g.noDate.length, 1);
  assert.equal(g.overdue.length + g.dueSoon.length + g.waiting.length, 0);
});

test("overdue loop owned by administrador appears only in overdue (A1)", () => {
  const loop = makeLoop({ due: ymd(-2), owner: "administrador" });
  const g = groupLoopsByUrgency([loop], NOW);
  assert.equal(g.overdue.length, 1);
  assert.equal(g.dueSoon.length, 0);
  assert.equal(g.waiting.length, 0);
  assert.equal(g.noDate.length, 0);
});

test("overdue loop with status waiting_on_other appears only in overdue (A1)", () => {
  const loop = makeLoop({ due: ymd(-5), status: "waiting_on_other" });
  const g = groupLoopsByUrgency([loop], NOW);
  assert.equal(g.overdue.length, 1);
  assert.equal(g.dueSoon.length + g.waiting.length + g.noDate.length, 0);
});

test("every non-hidden loop is counted exactly once across the four arrays", () => {
  const loops = [
    makeLoop({ due: ymd(-2), owner: "administrador" }),
    makeLoop({ due: ymd(-5), status: "waiting_on_other" }),
    makeLoop({ due: ymd(3) }),
    makeLoop({ due: ymd(40) }),
    makeLoop({ due: null }),
    makeLoop({ status: "done", due: ymd(-1) }),
    makeLoop({ status: "dropped" }),
  ];
  const g = groupLoopsByUrgency(loops, NOW);
  const total =
    g.overdue.length + g.dueSoon.length + g.waiting.length + g.noDate.length;
  assert.equal(total, 5); // 7 input minus the done + dropped
});

test("blocked loop with a future due date lands in the bucket its date implies (D-07)", () => {
  const soon = makeLoop({ status: "blocked", due: ymd(4) });
  const far = makeLoop({ status: "blocked", due: ymd(90) });
  const g = groupLoopsByUrgency([soon, far], NOW);
  assert.equal(g.dueSoon.length, 1);
  assert.equal(g.waiting.length, 1);
});

test("overdue is ordered oldest-due first (D-06)", () => {
  const recent = makeLoop({ due: ymd(-2) });
  const oldest = makeLoop({ due: ymd(-30) });
  const mid = makeLoop({ due: ymd(-10) });
  const g = groupLoopsByUrgency([recent, oldest, mid], NOW);
  assert.deepEqual(
    g.overdue.map((l) => l.id),
    [oldest.id, mid.id, recent.id],
  );
});

test("dueSoon is ordered soonest-first (D-06)", () => {
  const later = makeLoop({ due: ymd(12) });
  const sooner = makeLoop({ due: ymd(1) });
  const g = groupLoopsByUrgency([later, sooner], NOW);
  assert.deepEqual(
    g.dueSoon.map((l) => l.id),
    [sooner.id, later.id],
  );
});

test("two loops sharing the same due retain input order (stable sort)", () => {
  const a = makeLoop({ due: ymd(3) });
  const b = makeLoop({ due: ymd(3) });
  const c = makeLoop({ due: ymd(3) });
  const g = groupLoopsByUrgency([a, b, c], NOW);
  assert.deepEqual(
    g.dueSoon.map((l) => l.id),
    [a.id, b.id, c.id],
  );
});

test("noDate is ordered by updated_at descending (D-06)", () => {
  const old = makeLoop({ due: null, updated_at: "2026-01-02T00:00:00.000Z" });
  const newest = makeLoop({ due: null, updated_at: "2026-03-01T00:00:00.000Z" });
  const mid = makeLoop({ due: null, updated_at: "2026-02-01T00:00:00.000Z" });
  const g = groupLoopsByUrgency([old, newest, mid], NOW);
  assert.deepEqual(
    g.noDate.map((l) => l.id),
    [newest.id, mid.id, old.id],
  );
});

test("counts mirror the lengths of their arrays", () => {
  const loops = [
    makeLoop({ due: ymd(-2) }),
    makeLoop({ due: ymd(-9) }),
    makeLoop({ due: ymd(2) }),
    makeLoop({ due: ymd(30) }),
    makeLoop({ due: ymd(31) }),
    makeLoop({ due: null }),
  ];
  const g = groupLoopsByUrgency(loops, NOW);
  assert.equal(g.counts.overdue, g.overdue.length);
  assert.equal(g.counts.dueSoon, g.dueSoon.length);
  assert.equal(g.counts.waiting, g.waiting.length);
  assert.equal(g.counts.overdue, 2);
  assert.equal(g.counts.dueSoon, 1);
  assert.equal(g.counts.waiting, 2);
});

test("groupLoopsByUrgency defaults `now` to the current date when omitted", () => {
  const g = groupLoopsByUrgency([makeLoop({ due: "2000-01-01" })]);
  assert.equal(g.overdue.length, 1);
});

// ── formatRelativeDue ─────────────────────────────────────────────────────

test("formatRelativeDue: delta <= -2 → 'hace {n} días' with n positive", () => {
  assert.equal(formatRelativeDue(ymd(-3), NOW), "hace 3 días");
  assert.equal(formatRelativeDue(ymd(-20), NOW), "hace 20 días");
});

test("formatRelativeDue: delta -1 → 'vencía ayer'", () => {
  assert.equal(formatRelativeDue(ymd(-1), NOW), "vencía ayer");
});

test("formatRelativeDue: delta 0 → 'vence hoy'", () => {
  assert.equal(formatRelativeDue(ymd(0), NOW), "vence hoy");
});

test("formatRelativeDue: delta 1 → 'vence mañana'", () => {
  assert.equal(formatRelativeDue(ymd(1), NOW), "vence mañana");
});

test("formatRelativeDue: delta 2..14 → 'vence en {n} días'", () => {
  assert.equal(formatRelativeDue(ymd(5), NOW), "vence en 5 días");
  assert.equal(formatRelativeDue(ymd(14), NOW), "vence en 14 días");
});

test("formatRelativeDue: beyond 14 days still reads 'vence en {n} días' (waiting column)", () => {
  assert.equal(formatRelativeDue(ymd(40), NOW), "vence en 40 días");
});

// ── countStrip ────────────────────────────────────────────────────────────

test("countStrip: plural form", () => {
  assert.equal(
    countStrip({ overdue: 3, dueSoon: 2, waiting: 5 }),
    "3 vencidos · 2 vencen pronto · 5 a la espera",
  );
});

test("countStrip: every singular form", () => {
  assert.equal(
    countStrip({ overdue: 1, dueSoon: 1, waiting: 1 }),
    "1 vencido · 1 vence pronto · 1 a la espera",
  );
});

test("countStrip: all-zero form", () => {
  assert.equal(
    countStrip({ overdue: 0, dueSoon: 0, waiting: 0 }),
    "0 vencidos · 0 vencen pronto · 0 a la espera",
  );
});
