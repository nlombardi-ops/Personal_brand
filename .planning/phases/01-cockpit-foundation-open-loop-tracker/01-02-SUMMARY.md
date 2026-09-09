---
phase: 01-cockpit-foundation-open-loop-tracker
plan: 02
subsystem: ui
tags: [nextjs-16, react-19, date-fns, node-test, spanish-ui, tdd]

requires:
  - phase: 01-01
    provides: "OpenLoop shape, getOpenLoops(), loop-defaults label records, Cockpit stub, page.tsx"
provides:
  - "groupLoopsByUrgency(loops, now) → GroupedLoops — pure isomorphic D-01..D-07 urgency cascade"
  - "formatRelativeDue(dueYmd, now) + countStrip(counts) + COUNT_LABELS — single-source Spanish date/count vocabulary"
  - "lib/community/urgency.test.ts — first test file in the repo (node --test, local only)"
  - "LoopCard / LoopColumn / NoDateSection / CountStrip presentational components"
  - "three-column ranked board + collapsed Sin fecha section + D-17 header count strip on /community-president"
affects: [01-03 edit + quick actions + mobile stacking]

tech-stack:
  added: []
  patterns:
    - "Pure isomorphic domain module (no next/*, no fs, no react) so the same grouping runs server-side for first paint and client-side after a mutation"
    - "Spanish copy vocabulary centralised in one tested module (relative-date.ts) — JSX never re-derives a plural rule"
    - "Local-only Node built-in test (node:test + node:assert/strict, .ts specifiers, import type) — never executed by Vercel or next build"
    - "tsconfig allowImportingTsExtensions so tsc accepts the explicit .ts import specifiers the Node test runner requires"

key-files:
  created:
    - lib/community/urgency.ts
    - lib/community/relative-date.ts
    - lib/community/urgency.test.ts
    - app/components/community/LoopCard.tsx
    - app/components/community/LoopColumn.tsx
    - app/components/community/NoDateSection.tsx
    - app/components/community/CountStrip.tsx
  modified:
    - tsconfig.json
    - app/community-president/page.tsx
    - app/components/community/Cockpit.tsx

decisions:
  - "Beyond-14-days relative label reuses 'vence en {n} días' — UI-SPEC table stops at 14 but specifies no separate copy; the waiting column renders it"
  - "COUNT_LABELS extracted from relative-date.ts so countStrip() and the CountStrip component share one vocabulary; the component renders a sr-only full string via countStrip() and colours numerals per bucket from the same labels"
  - "Card onOpen callback wired to a useState setter now; edit slide-over UI itself is plan 03 (forward-wiring, not dead code)"
  - "allowImportingTsExtensions added to tsconfig (safe under existing noEmit:true) to reconcile Node's .ts-specifier requirement with tsc"

metrics:
  duration: ~35min
  completed: 2026-09-09
  tasks: 3
  files: 10

status: complete
---

# Phase 1 Plan 02: Cockpit Foundation & Open-Loop Tracker (Slice 2 of 3) Summary

**The flat loop list is now the ranked passive cockpit: a tested pure `groupLoopsByUrgency` implementing D-01..D-07, a three-column board (Vencidos / Vencen pronto / A la espera de otros) with a collapsed "Sin fecha" section, relative-date + owner-chip cards, per-column reassurance copy, and the D-17 header count strip — zero clicks, no filtering (ROADMAP SC-3).**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-09-09
- **Tasks:** 3 / 3
- **Files:** 10 (7 new + tsconfig.json, page.tsx, Cockpit.tsx modified)

## Accomplishments

- **`lib/community/urgency.ts`** — `groupLoopsByUrgency(loops, now = new Date()): GroupedLoops`. Pure, isomorphic (imports only `differenceInCalendarDays` from date-fns + the `OpenLoop` type). Module-level `HIDDEN_STATUSES` Set (`done`, `dropped`) and `DUE_SOON_DAYS = 14` constant. Single pass: hidden statuses skipped, dateless loops → `noDate`, otherwise a calendar-day delta places the loop in a **disjoint priority cascade** — `days < 0` → overdue, `0..14` → dueSoon, else → waiting. Overdue/dueSoon/waiting sorted ascending by the raw `due` string (lexical == chronological for zero-padded YMD; V8 stable sort keeps insertion order on ties); `noDate` sorted by `updated_at` desc. `parseYmd` splits y/m/d explicitly into a local-midnight Date, with an in-code comment recording the accepted ≤2h Europe/Madrid vs UTC day-boundary fuzz (RESEARCH Pitfall 5) and its documented fix.
- **`lib/community/relative-date.ts`** — `formatRelativeDue(dueYmd, now)` produces the exact UI-SPEC vocabulary (`hace {n} días` / `vencía ayer` / `vence hoy` / `vence mañana` / `vence en {n} días`). `countStrip(counts)` produces the D-17 strip with correct singular/plural; `COUNT_LABELS` is the shared word source.
- **`lib/community/urgency.test.ts`** — 28 `node:test` cases (RED → GREEN, see TDD section). Uses `node:test` + `node:assert/strict`, explicit `./urgency.ts` / `./relative-date.ts` / `../types.ts` specifiers, `import type` for the type-only import. Deterministic via a pinned `NOW`. Covers: empty input, hidden statuses, the exact 0 / 14 / 15 / -1 / -400 day boundaries, `due` absent vs `null`, administrador-owner and `waiting_on_other` overdue loops staying in exactly one array (every loop counted once), `blocked` flowing through date logic, oldest-first / soonest-first ordering, tie stability, `noDate` updated_at ordering, counts mirroring array lengths, all 6 relative-date rows + a beyond-14 case, and countStrip plural / singular / all-zero forms.
- **`LoopCard.tsx`** — title (`line-clamp-2`, 14/600) + relative-date pill (`font-mono tabular-nums`, red `#b91c1c` overdue / amber `#a16207` due-soon / neutral otherwise, omitted when no `due`) + owner chip (DESIGN.md tag-chip `border-neutral-200 px-2 py-0.5`, label from `OWNER_LABELS`, `owner_detail` appended in parens and truncated at `max-w-[12ch]` only for neighbour/provider per D-11). 2px left border in the urgency colour for overdue/due-soon only. Whole card is a `<button>` calling `onOpen(loop)`. No `next_action`, no loop category, no raw-HTML injection prop.
- **`LoopColumn.tsx`** — transparent column, pinned uppercase Label header + status-coloured count numeral, `overflow-y-auto` body with `lg:max-h-[calc(100vh-16rem)]` bound so columns align. Empty → the caller-supplied reassurance string, never a blank column.
- **`NoDateSection.tsx`** — full-width native `<details>` (default collapsed), section-label summary `Sin fecha · {count}`, muted `tone="noDate"` cards with no date pill. Renders `null` when empty.
- **`CountStrip.tsx`** — three middot-separated segments under the page title, `sr-only` full string from `countStrip()`, visible numerals coloured per bucket (neutral when all-zero). `mb-8` (32px) gap before the board via the header wrapper.
- **`page.tsx`** — Server Component now calls `groupLoopsByUrgency(loops)` and passes `grouped` (plus the raw `loops`) into `<Cockpit>`. First paint is ranked; no client effect.
- **`Cockpit.tsx`** — plan-01 flat stub replaced by `grid grid-cols-1 gap-4 lg:grid-cols-3` board in the load-bearing order Vencidos → Vencen pronto → A la espera de otros, `NoDateSection` beneath, all inside the existing `FadeUp` wrapper. Zero-loops still renders `EmptyState`; an all-dateless board renders the three reassurance columns + populated Sin fecha (not the first-run state). Strictly read-only — no drag-and-drop.

## Task Commits

1. **Task 1: The ranking rules exist and are proven by a runnable test** — `90f456c` (feat)
2. **Task 2: The cockpit renders as a three-column board with a collapsed Sin fecha section** — `57cccfe` (feat)
3. **Task 3: The header count strip gives the at-a-glance state** — `428ec75` (feat)

**Plan metadata:** _(this commit)_ `docs(01-02): complete cockpit-foundation-open-loop-tracker plan`

## TDD Gate Compliance

Task 1 is `tdd="true"` (global TDD_MODE off, so no orchestrator RED-commit gate — but the red/green sequence was followed and is recorded here):

- **RED:** `lib/community/urgency.test.ts` written first. `node --test lib/community/urgency.test.ts` → **FAIL** with `ERR_MODULE_NOT_FOUND` for `.../lib/community/urgency.ts` (implementation did not exist): `ℹ tests 1 / ℹ pass 0 / ℹ fail 1`.
- **GREEN:** `urgency.ts` + `relative-date.ts` implemented → `node --test` reports `ℹ tests 28 / ℹ pass 28 / ℹ fail 0`, exit 0.
- **REFACTOR:** In Task 3 `relative-date.ts` was refactored to extract `COUNT_LABELS`; the 28 tests stayed green (wording unchanged).

Both Task 2 and Task 3 are `tdd="false"` (presentational components; the repo has no React test runner).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `tsc --noEmit` rejected the `.ts` import specifiers required by `node --test`**
- **Found during:** Task 1
- **Issue:** Node's built-in test runner resolves relative ESM imports only with an explicit extension (`./urgency.ts`). `tsc` then failed with `TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled`. The plan requires both `node --test` and `npx tsc --noEmit` to pass.
- **Fix:** Added `"allowImportingTsExtensions": true` to `tsconfig.json` `compilerOptions`. Safe under the repo's existing `"noEmit": true`; it only permits `.ts` in import paths and does not change emit behaviour. Next.js / Turbopack builds are unaffected (the `@/` alias is still used everywhere in app code).
- **Files modified:** `tsconfig.json`
- **Commit:** `90f456c`

### Notes (not scope changes)

1. **`npm run lint` (full) exits 1 on the pre-existing red baseline** documented in `deferred-items.md` (4 errors + 6 warnings in `app/components/Contact.tsx`, `References.tsx`, `app/cv/page.tsx`, `app/dashboard/mortgage/page.tsx`, `lib/cv/render.tsx`). Per this plan's environment note, the lint gate is satisfied by the scoped run: `npx eslint lib/community app/components/community app/community-president` → **0 problems**. Full-lint problem count is unchanged (10) before and after this plan — no new problem in any file this plan created or modified.

## Assumptions Carried Forward (unresolved — for first UAT)

- **A1 (disjoint cascade):** an overdue loop waiting on the administrador appears in **Vencidos only**, with an "Administrador" owner chip — not also under "A la espera de otros". This is what makes the D-17 strip read as `X · Y · Z`. Confirm with Nicola: *"your overdue loops that are waiting on the administrador show up in Vencidos with an Administrador chip, not also under A la espera — OK?"* If he wants dual listing, `groupLoopsByUrgency` pushes into multiple arrays and the strip switches to unique-loop wording.
- **A2:** a dated, far-future, owner-is-me, still-open loop lands in "A la espera de otros", slightly overclaiming that label. Accepted so no loop ever disappears; a fourth column is forbidden by D-01/D-13.

## Backstop Truths (confirm at UAT)

- A store read failure degrades to an empty board (store helpers swallow read errors) rather than an error screen. If unacceptable, a later phase wires the `No se han podido cargar los bucles` copy already in UI-SPEC.
- Every loop is counted exactly once across the four arrays (asserted in the unit test).
- A loop due "today" in Europe/Madrid does not flip between "vence hoy" and "vencía ayer" for the same viewer within a day (≤2h UTC edge fuzz documented in-code).

## Manual Verification Still Pending (human-check)

- Seed one overdue / one due-in-5-days / one due-in-40-days / one dateless / one `done` loop, open `/community-president`: three columns in order Vencidos / Vencen pronto / A la espera de otros, correct card in each (red left border + "hace 3 días" pill on overdue; amber + "vence en 5 días" on due-soon), the `done` loop invisible, "Sin fecha · 1" collapsed, header strip `1 vencido · 1 vence pronto · 1 a la espera`, nothing draggable.
- D-02 / A1: overdue loop owned by the administrador shows in Vencidos with an "Administrador" chip and NOT under "A la espera de otros".

## Known Stubs

- `LoopCard`'s `onOpen` callback is wired to a `useState` setter in `Cockpit` but the **edit slide-over UI is plan 03** — clicking a card currently records the selection and does nothing visible. This is deliberate forward-wiring, documented in the plan's Task 2 `<action>` ("wire the prop now even though edit mode itself lands in plan 03"). Inline quick actions (D-12) and mobile column stacking (D-15) are also plan 03.

## Threat Flags

None. No new endpoints, auth paths, or trust-boundary schema. The two boundaries the plan's `<threat_model>` names (stored free text → DOM; server render → client re-group) are mitigated as specified: all loop free text renders as React children (grep-asserted no raw-HTML injection prop under `app/components/community/`), and grouping is one pure isomorphic function shared by both sides.

## Self-Check: PASSED

- All 7 created files + 3 modified files exist on disk.
- Commits `90f456c`, `57cccfe`, `428ec75` are in `git log`.
- `node --test lib/community/urgency.test.ts` → exit 0, 28/28 pass.
- `npx tsc --noEmit` → exit 0. `npx eslint lib/community app/components/community app/community-president` → exit 0.
- Grep gates: `test(` count 28 (≥15); framework imports in `urgency.ts` = 0; `differenceInCalendarDays` = 3 (≥1); `14` = 3 (≥1, named constant `DUE_SOON_DAYS`); no `dangerouslySetInnerHTML` / drag-and-drop identifiers under `app/components/community/`; `groupLoopsByUrgency` referenced in `page.tsx`; `next_action|kind` in `LoopCard.tsx` = 0; `countStrip` in `CountStrip.tsx` = 2.

---
*Phase: 01-cockpit-foundation-open-loop-tracker*
*Completed: 2026-09-09*
