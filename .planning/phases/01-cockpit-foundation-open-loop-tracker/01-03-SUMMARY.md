---
phase: 01-cockpit-foundation-open-loop-tracker
plan: 03
subsystem: api
tags: [nextjs-16, app-router, route-handler, react-19, spanish-ui, mobile, auth, prototype-pollution]

requires:
  - phase: 01-01
    provides: "requireAuth(), open-loops store, OpenLoop/Submission split, validateLoopInput, LoopSlideOver create mode, CommunitySidebar, layout gate"
  - phase: 01-02
    provides: "groupLoopsByUrgency, LoopCard/LoopColumn/NoDateSection board, CountStrip, Cockpit board wiring, urgency.test.ts"
provides:
  - "PATCH /api/community/open-loops/[id] — allow-listed, auth-first, 404-on-miss, re-validating edit endpoint (LOOP-01 edit half, PLAT-02)"
  - "PATCHABLE_KEYS frozen allow-list + applyPatch(existing, patch) in loop-defaults.ts — single choke point vs mass assignment + prototype pollution"
  - "LoopSlideOver edit mode (Editar bucle / Guardar cambios) + inline Descartar bucle confirmation (status:dropped, no hard delete)"
  - "QuickActions — three D-12 inline card actions (Marcar hecho / Marcar a la espera / Aplazar fecha) funnelling into the same PATCH endpoint"
  - "per-card quick-action pending/error state owned by Cockpit, keyed by loop id"
  - "mobile top bar + left drawer in CommunitySidebar (single NAV_ITEMS reused); breakpoint-scoped main offset in layout.tsx"
  - "PLAT-03 / SC-5 audit result: neighbour_form retained, Submission free of president-internal fields, zero v1 consumers"
affects: [neighbour-portal-v2, phase-2-document-store, phase-3-lph-deadlines]

tech-stack:
  added: []
  patterns:
    - "PATCH merge via positive frozen key allow-list + applyPatch (never spread the request body) — mass assignment and prototype pollution both blocked structurally"
    - "Dynamic Route Handler: requireAuth(request) first, then `await ctx.params`, then body parse, then store read (Next 16 async params, inline RouteContext fallback)"
    - "Quick-action component performs the fetch + router.refresh(); parent owns the per-id pending/error map via onStart/onSettle callbacks so spinners never bleed across cards"
    - "Card body as an absolute overlay <button> behind pointer-events-none content, so nested action buttons stay valid HTML and never trigger the card-open handler"
    - "Responsive shell: fixed 240px aside (md+) XOR fixed 56px top bar + sheet drawer (<md); one nav array, one NavLinks component"

key-files:
  created:
    - app/api/community/open-loops/[id]/route.ts
    - app/components/community/QuickActions.tsx
  modified:
    - lib/community/loop-defaults.ts
    - app/components/community/LoopSlideOver.tsx
    - app/components/community/Cockpit.tsx
    - app/components/community/LoopCard.tsx
    - app/components/community/LoopColumn.tsx
    - app/components/community/NoDateSection.tsx
    - app/components/community/CommunitySidebar.tsx
    - app/community-president/layout.tsx

key-decisions:
  - "applyPatch normalises string fields (trim, owner_detail empty→delete) mirroring applyCreateDefaults; id/created_at/source/all LPH fields are simply absent from PATCHABLE_KEYS"
  - "Route context typed with the inline `{ params: Promise<{ id: string }> }` fallback (matches app/api/cv/versions/[id]/route.ts) — generated RouteContext global does not know the new path until typegen re-runs"
  - "Slide-over submits only changed fields (buildPatch diff); an empty patch still round-trips (idempotent apart from updated_at)"
  - "QuickActions owns the fetch + router.refresh(); Cockpit owns only the keyed pending/error state via onStart/onSettle — satisfies both 'same PATCH endpoint' and 'Cockpit owns per-card state'"
  - "LoopColumn bounded max-height + overflow made lg-only so stacked mobile columns are not nested scroll traps (D-15)"
  - "Descartar is an inline in-footer confirmation, never a modal (UI-SPEC Destructive action)"

patterns-established:
  - "Pattern: existing-record mutations go through applyPatch's frozen allow-list — never `{ ...existing, ...body }`"
  - "Pattern: the id-scoped route is the ONLY mutation path for an existing loop; quick actions are just smaller PATCH bodies, no second endpoint / validation path"
  - "Pattern: no hard-delete anywhere in the community namespace — discard = status:dropped, hidden by plan-02 grouping"

requirements-completed: [LOOP-01, PLAT-02, PLAT-03]

coverage:
  - id: D1
    description: "PATCH /api/community/open-loops/[id]: requireAuth() first statement, PATCH-only verb, await ctx.params, 404 on unknown id with the document untouched, standard 500 shape, never logs the body"
    requirement: "LOOP-01"
    verification:
      - kind: integration
        ref: "curl matrix on running dev server: no-cookie/empty/wrong/prefix cookie => 401; unknown id => 404; valid token + real id => 200"
        status: pass
      - kind: unit
        ref: "grep -c 'requireAuth(request)' route.ts == 1 (first statement); grep -cE 'export (async )?function (DELETE|PUT|POST)' == 0; grep -c 'await ctx.params' >= 1"
        status: pass
    human_judgment: false
  - id: D2
    description: "applyPatch allow-list blocks mass assignment (id/created_at/source server-owned) and prototype pollution (__proto__ structurally unreachable); PATCH re-validates every field against create's caps + enums; idempotent apart from updated_at"
    requirement: "PLAT-02"
    verification:
      - kind: integration
        ref: "curl: body {id,created_at,source,title} => 200 with original id/created_at/source + new title; {__proto__:{...}} => 200, Object.prototype.polluted undefined, stored loop gains no key; {status:'bogus'} => 400; 2001-char next_action => 400; same body twice => same state bar updated_at"
        status: pass
      - kind: unit
        ref: "grep -c '\\.\\.\\.patch' lib/community/loop-defaults.ts == 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "Slide-over edit mode: title 'Editar bucle', form initialises from the loop (incl. populated Fecha objetivo and D-11 Detalle del responsable), 'Guardar cambios' PATCHes changed fields, failure keeps the panel open with values + inline save-failure copy, success refreshes and closes"
    requirement: "LOOP-01"
    verification:
      - kind: manual_procedural
        ref: "01-03-PLAN.md Task 1 <human-check> — browser: edit title/owner/due, save, hard-reload, confirm all three persist"
        status: unknown
    human_judgment: true
    rationale: "Slide-over form init, framer-motion transition, focus trap/restore, and the edit-then-reload round-trip need a human in a real browser; curl proved the PATCH API but not the client form."
  - id: D4
    description: "Descartar bucle: edit-mode-only destructive text button swaps in an inline confirmation ('¿Descartar este bucle? Dejará de aparecer en el panel.'); confirming PATCHes status:dropped only; the record stays in the JSON, hidden by plan-02 grouping — no DELETE handler anywhere"
    requirement: "LOOP-01"
    verification:
      - kind: unit
        ref: "find app/api/community -name route.ts -exec grep -l 'function DELETE' => empty; find returns exactly open-loops/route.ts + open-loops/[id]/route.ts"
        status: pass
      - kind: manual_procedural
        ref: "01-03-PLAN.md Task 1 <human-check> — discard a loop, confirm it leaves the board and remains in data/community-open-loops.json with status dropped"
        status: unknown
    human_judgment: true
    rationale: "The visual disappear-from-board + still-in-JSON behaviour and the inline (non-modal) confirmation UX need human eyes."
  - id: D5
    description: "QuickActions: three lucide icon buttons with exact aria-labels (Marcar hecho / Marcar a la espera / Aplazar fecha) at 44px hit areas; each a PATCH to the id-scoped route (aplazar via on-card date popover); no drag-and-drop"
    requirement: "LOOP-01"
    verification:
      - kind: unit
        ref: "grep -q the three aria-label strings in QuickActions.tsx; grep -c 'api/community/open-loops' QuickActions.tsx >= 1; grep -riE 'draggable|onDragStart|onDrop' app/components/community/ => empty"
        status: pass
      - kind: manual_procedural
        ref: "01-03-PLAN.md Task 2 <human-check> — each quick action moves/vanishes the right card and updates the count strip; throttled network shows a spinner on the tapped card only"
        status: unknown
    human_judgment: true
    rationale: "Card move/vanish after router.refresh(), count-strip update, isolated per-card spinner under network throttle, and the transient card-level error notice need a real browser."
  - id: D6
    description: "Mobile (D-15): below md the sidebar is a fixed top bar + hamburger drawer (one NAV_ITEMS array, shared NavLinks), main offset breakpoint-scoped (pt-14 / md:ml-60), board stacks Vencidos→Vencen pronto→A la espera→Sin fecha with no nested column scroll, slide-over near-full-width; desktop 1440px unregressed"
    requirement: "LOOP-01"
    verification:
      - kind: unit
        ref: "grep -c 'md:' layout.tsx >= 1; single NAV_ITEMS array literal in CommunitySidebar.tsx; slide-over w-[calc(100vw-32px)] md:w-[420px]; LoopColumn overflow/max-h now lg-only"
        status: pass
      - kind: manual_procedural
        ref: "01-03-PLAN.md Task 3 <human-check> — 390px viewport: top bar + drawer work, columns stack in priority order, quick actions visible & tappable at 44px, slide-over near-full-width with footer reachable; re-check 1440px"
        status: unknown
    human_judgment: true
    rationale: "Responsive layout, drawer open/close on backdrop/Escape/nav, touch-target sizing and the keyboard-open footer reachability are inherently visual/interactive."
  - id: D7
    description: "PLAT-03 / SC-5 audit over the finished type surface: OpenLoopSource keeps neighbour_form and OpenLoop.source is typed with it; Submission carries only neighbour-safe fields (no acuerdo/majority/impugnacion/ejecutividad/ausentes/owner-routing/presupuesto/budget); nothing under app/ or lib/community/ imports Submission"
    requirement: "PLAT-03"
    verification:
      - kind: unit
        ref: "grep -c 'neighbour_form' lib/types.ts == 3; grep 'interface Submission' -A12 shows no forbidden field; grep -rl 'Submission' app/ lib/community/ => empty"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-09-09
status: complete
---

# Phase 1 Plan 03: Cockpit Foundation & Open-Loop Tracker (Slice 3 of 3) Summary

**An allow-listed, auth-first PATCH endpoint plus slide-over edit mode and an inline "Descartar" flow close the LOOP-01 edit half; three D-12 quick actions funnel into the same endpoint with per-card pending/error state; a top-bar-and-drawer sidebar makes the cockpit usable on a phone (D-15); and the PLAT-03 / SC-5 type separation is audited and clean.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-09-09
- **Tasks:** 3 / 3
- **Files:** 10 (2 new + 8 modified)

## Accomplishments

- **`PATCH /api/community/open-loops/[id]`** — the sole mutation path for an existing loop. `requireAuth(request)` is the literal first statement (401 before `ctx.params` is awaited, before body parse, before any store read — verified for no/empty/wrong/prefix cookie); `await ctx.params` for Next 16 async params; `validateLoopInput(body, { create: false })` re-applies every create-time length cap and enum allow-list; unknown id → 404 with the document byte-identical; store section wrapped in try/catch → the repo's standard 500 shape; the request body is never logged. PATCH is the only exported verb (Next returns 405 for the rest).
- **`PATCHABLE_KEYS` + `applyPatch(existing, patch)`** in `loop-defaults.ts` — a module-level `Object.freeze`d allow-list (`title, kind, status, owner, owner_detail, next_action, due`) and a merge that copies the existing loop then reads ONLY those keys as own-properties of the patch, refreshing `updated_at`. It never spreads the raw body, so: `id` / `created_at` / `source` / every LPH field are server-owned and untouchable from the wire; `__proto__` / `constructor` are structurally unreachable (not on the list, not filtered by name); `id` stays stable. Curl-verified: a `{id,created_at,source,title}` body returns 200 with the originals intact and only the title changed; a `{__proto__:{…}}` body returns 200 with `Object.prototype` unpolluted and the stored loop gaining no key.
- **Slide-over edit mode** — `LoopSlideOver` now takes an `editingLoop` prop: null → create ("Nuevo bucle" / "Crear bucle"), a loop → edit ("Editar bucle" / "Guardar cambios"). The form initialises from the loop (populated Fecha objetivo; Detalle del responsable visible only for neighbour/provider per D-11). Submit sends a `buildPatch` diff of only the changed fields; a non-ok response or thrown fetch leaves the panel open with the entered values and shows the exact UI-SPEC save-failure string inline; success calls `router.refresh()` and closes.
- **Discard flow** — an edit-mode-only destructive "Descartar bucle" text button (bottom-left of the footer) swaps in an inline confirmation ("¿Descartar este bucle? Dejará de aparecer en el panel.") with "Descartar" / "Cancelar" — never a modal. Confirming PATCHes `status: "dropped"` and nothing else; the record stays in the JSON document and simply stops rendering (plan-02 grouping hides `dropped`). **No hard-delete path exists anywhere in the phase.**
- **`QuickActions.tsx`** — three lucide icon buttons (`Check` "Marcar hecho", `PauseCircle` "Marcar a la espera", `CalendarClock` "Aplazar fecha") at 44px hit areas / 16px icons. Each is an ordinary PATCH to the id-scoped route (`{status:'done'}`, `{status:'waiting_on_other'}`, `{due:'<ymd>'}` from an on-card date popover) — no second endpoint, no second validation path. Desktop: revealed on card hover/`focus-within`; mobile: always visible as a static row below the card meta. The tapped button shows a spinner; the whole group disables while in flight.
- **Per-card quick-action state** — `Cockpit` owns a `quickState` map keyed by loop id (`{ pendingAction, error }`); `QuickActions` performs the fetch + `router.refresh()` and reports transitions back via `onStart` / `onSettle`. Two cards can never share one spinner. On failure the card reverts and shows the save-failure copy as a transient card-level notice (not a page banner).
- **Card body restructure** — `LoopCard` is now a `<div class="group relative">` with an absolutely-positioned overlay `<button>` (keyboard-focusable, `aria-label="Editar bucle: {title}"`) behind `pointer-events-none` content, so the nested quick-action buttons are valid HTML and a quick-action tap never opens the edit slide-over. Free text still renders as React children only.
- **Mobile shell (D-15)** — `CommunitySidebar` keeps the fixed 240px aside for md+ and adds, below md, a fixed 56px top bar (`#fafafa`, bottom hairline, CP tile + hamburger) that opens a left sheet drawer over a translucent backdrop; the drawer closes on backdrop click, Escape, and navigation. One `NAV_ITEMS` array feeds a shared `NavLinks` component used by both the aside and the drawer. `layout.tsx`'s `<main>` offset is breakpoint-scoped: `pt-14` below md for the top bar, `md:ml-60` from md up. `LoopColumn`'s bounded `max-h` + `overflow-y-auto` are now `lg:`-only so stacked mobile columns grow with content instead of trapping scroll. The board already stacks Vencidos → Vencen pronto → A la espera → Sin fecha; the slide-over is already `w-[calc(100vw-32px)]` below md.
- **PLAT-03 / SC-5 audit** (see dedicated section below) — clean, no drift.

## Task Commits

1. **Task 1: Nicola edits an existing loop in the slide-over and can discard one** — `839e3f9` (feat)
2. **Task 2: Nicola changes a loop's state straight from the card** — `950d913` (feat)
3. **Task 3: The cockpit works on Nicola's phone, and the PLAT-03 promise is audited** — `4b2f3a4` (feat)

**Plan metadata:** _(this commit)_ `docs(01-03): complete cockpit-foundation-open-loop-tracker plan`

## Files Created/Modified

- `app/api/community/open-loops/[id]/route.ts` — NEW: PATCH-only handler, auth-first, `await ctx.params`, 404-on-miss, re-validation, standard 500
- `lib/community/loop-defaults.ts` — MODIFIED: `PATCHABLE_KEYS` frozen allow-list + `applyPatch(existing, patch)`
- `app/components/community/QuickActions.tsx` — NEW: three D-12 inline card actions, PATCH + `router.refresh()`, on-card date popover
- `app/components/community/LoopSlideOver.tsx` — MODIFIED: create/edit modes, `buildPatch` diff, inline Descartar confirmation, `min-h-0` scroll body
- `app/components/community/Cockpit.tsx` — MODIFIED: `editingLoop` state, `patchEditingLoop`/`handleSave`/`handleDiscard`, `quickState` map + `quickStart`/`quickSettle`
- `app/components/community/LoopCard.tsx` — MODIFIED: overlay-button card body, QuickActions slot, busy/error visuals
- `app/components/community/LoopColumn.tsx` — MODIFIED: `QuickState`/`QuickActionHandlers` types, prop pass-through, `lg:`-only overflow
- `app/components/community/NoDateSection.tsx` — MODIFIED: quick-action prop pass-through
- `app/components/community/CommunitySidebar.tsx` — MODIFIED: mobile top bar + drawer, shared `NavLinks`, Escape-to-close
- `app/community-president/layout.tsx` — MODIFIED: breakpoint-scoped `<main>` offset (`pt-14 md:ml-60 md:pt-0`)

## PLAT-03 / SC-5 Audit (the verification path for the flagged assumption)

Run 2026-09-09 over the finished type surface in `lib/types.ts`, now that every file that could have violated the separation exists.

| Check | Result |
|---|---|
| `OpenLoopSource` includes `neighbour_form` | **Pass** — `export type OpenLoopSource = "acta" \| "email" \| "manual" \| "neighbour_form"` (line 257) |
| `OpenLoop.source` typed with `OpenLoopSource` | **Pass** — `source: OpenLoopSource;` (line 266); `SOURCE_LABELS` and the validator allow-list both derive from it |
| `grep -c 'neighbour_form' lib/types.ts` | 3 (type members + the explanatory comments) — ≥ 1 |
| `Submission` free of president-internal fields | **Pass** — the interface (lines 298–306) is `id, submitter_name, submitter_unit, description, photos?, status:"triage", created_at`. No `acuerdo_id`, `majority_type`, `impugnacion_deadline`, `ejecutividad_date`, `ausentes_notified_at`, owner-routing, `presupuesto`/`budget_annual`/`mensualidad`, or `source_ref`. All LPH-aware fields live on `OpenLoop` only. |
| No `Submission` consumer in v1 | **Pass** — `grep -rl 'Submission' app/ lib/community/` returns nothing; the shape is declared in `lib/types.ts` for v2 and wired nowhere |
| No hard-delete path | **Pass** — `find app/api/community -name route.ts -exec grep -l 'function DELETE'` returns nothing; the two route files are `open-loops/route.ts` (GET, POST) and `open-loops/[id]/route.ts` (PATCH) |

**No drift.** Nothing needed to be moved back onto `OpenLoop`. The flagged assumption (`assumptions[].verification: unresolved` in the plan frontmatter) is now **resolved by source assertion + this audit** — as the plan states, there is no runtime test for it in Phase 1.

## Decisions Made

- **Route context typed with the inline `{ params: Promise<{ id: string }> }` fallback**, mirroring `app/api/cv/versions/[id]/route.ts`. The generated `RouteContext<'/api/community/open-loops/[id]'>` global does not recognise the new path until `next typegen`/`next dev` re-runs, so the literal would fail `tsc` in a clean checkout. Plan explicitly permits this fallback.
- **`QuickActions` performs the fetch + `router.refresh()`; `Cockpit` owns only the keyed pending/error state** via `onStart`/`onSettle` callbacks. This satisfies both the plan's "every quick action is a PATCH to the id-scoped route" (the endpoint string lives in `QuickActions.tsx`, per the acceptance grep) and "Cockpit owns the per-card pending/error state keyed by loop id".
- **Slide-over submits a `buildPatch` diff of only the changed fields.** An unchanged submit still sends `{}`, which validates fine and only bumps `updated_at` — matching the idempotency truth.
- **`owner_detail` cleared by sending `""`** (not omitting the key) so `applyPatch` deletes it server-side when the user switches owner away from neighbour/provider.
- **`LoopColumn` bounded height made `lg:`-only** rather than adding a mobile-specific override — simplest expression of "no nested scroll trap on a phone" (D-15).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Card body could not stay a `<button>` once it contains action buttons**
- **Found during:** Task 2 (QuickActions)
- **Issue:** `LoopCard` was a single `<button>` (from plan 02). Nesting the three quick-action `<button>`s and a date `<input>` inside it is invalid HTML and breaks click handling.
- **Fix:** Restructured the card as a `<div class="group relative">` with an absolutely-positioned overlay `<button>` (keyboard-focusable, `aria-label`) behind `pointer-events-none` content; the quick-action layer re-enables pointer events for itself and stops propagation. Keyboard access to "open edit" is preserved.
- **Files modified:** `app/components/community/LoopCard.tsx`
- **Verification:** `npx tsc --noEmit` + scoped `eslint` clean; page renders 200; no `jsx-a11y` regression.
- **Committed in:** `950d913` (Task 2 commit)

**2. [Rule 3 - Blocking] `LoopSlideOver` flex body needed `min-h-0` for the mobile-keyboard footer-reachability requirement (D-15)**
- **Found during:** Task 1 (landed early with the edit-mode change rather than Task 3)
- **Issue:** `flex-1 overflow-y-auto` without `min-h-0` in a column flex prevents the body from scrolling, so the pinned footer can be pushed off-screen when the on-screen keyboard opens.
- **Fix:** Added `min-h-0` to the form element. The panel is already `w-[calc(100vw-32px)]` below md (plan 01), so no width change was needed for Task 3.
- **Files modified:** `app/components/community/LoopSlideOver.tsx`
- **Committed in:** `839e3f9` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking). No scope creep — both are structural prerequisites for planned behaviour.

## Issues Encountered

- **Compound-command false positive during the audit:** `find … -exec grep -l 'function DELETE' … && echo FOUND` printed "FOUND" because `find` exits 0 regardless of matches. Re-checked with `grep -Hn` and `grep -rn 'DELETE' app/api/community/` — genuinely no DELETE handler. The plan's real gate `test -z "$(…)"` passes.

## Deferred / Known Limitations

- **Desktop quick-action date popover can clip** inside a scrolled `LoopColumn` (`lg:overflow-y-auto`) when the card is near the column's bottom edge. Minor; the popover is small and opens directly under its button. Mobile is unaffected (no column overflow there). Not in acceptance criteria — a later polish pass could flip it to open upward or portal it.
- **Full `npm run lint` still exits 1** on the pre-existing red baseline (4 errors + 6 warnings in `Contact.tsx`, `References.tsx`, `app/cv/page.tsx`, `CvPreview.tsx`, `app/dashboard/mortgage/page.tsx`, `lib/cv/render.tsx` — see `deferred-items.md`). Problem count is **unchanged** before/after this plan. Scoped gate `npx eslint app/community-president app/components/community lib/community lib/types.ts app/api/community` → 0 problems.

## User Setup Required

None new. Standing reminder (STATE.md blocker, not introduced here): `DASHBOARD_TOKEN` must be set in local `.env`, Vercel Preview, and Vercel Production before the surface ships — the layout gate and `requireAuth()` both fail closed without it (correct behaviour: unusable, not exposed).

## Known Stubs

None. Every deliverable is wired end to end: the PATCH endpoint persists to the JSON document, the slide-over and quick actions both call it, and the board re-groups on `router.refresh()`.

## Threat Flags

None. No security surface beyond the plan's `<threat_model>` (T-01-14 … T-01-SC). The one new endpoint (`PATCH /api/community/open-loops/[id]`) is exactly as specified: `requireAuth` first, allow-listed merge, 404-on-miss, re-validation, no body logging, no deletion verb. Zero new npm dependencies.

## Next Phase Readiness

- **LOOP-01 is complete** — create (plan 01) + list/rank (plan 02) + edit/discard/quick-actions (plan 03). `OpenLoop` CRUD is closed apart from a deliberate no-delete.
- **SC-2 / SC-4 / SC-5** are met across both route files and audited.
- Phase 2 (Document store) can link an acta to an `OpenLoop` via the existing optional `source_ref` / `acuerdo_id` fields — shape is already in place.
- Phase 3 (LPH deadlines) adds behaviour to the already-declared optional LPH fields on `OpenLoop`; no shape change needed.
- Open question still carried forward (RESEARCH OQ1 / plan-02 A1): overdue-and-waiting loops appear in Vencidos with an owner chip, not dual-listed — confirm at first UAT.

## Self-Check: PASSED

- Both new files exist: `app/api/community/open-loops/[id]/route.ts`, `app/components/community/QuickActions.tsx`.
- All 8 modified files present on disk.
- Commits `839e3f9`, `950d913`, `4b2f3a4` are in `git log`.
- `npx tsc --noEmit` → exit 0. `npx eslint app/community-president app/components/community lib/community lib/types.ts app/api/community` → exit 0. `node --test lib/community/urgency.test.ts` → 28/28 pass.
- PATCH hardening matrix (auth 401 ×4, 404, mass-assignment, prototype-pollution, validation ×2, idempotency) verified against a running dev server; `data/community-open-loops.json` restored to `[]` afterwards.

---
*Phase: 01-cockpit-foundation-open-loop-tracker*
*Completed: 2026-09-09*
