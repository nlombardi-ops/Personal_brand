---
phase: 01-cockpit-foundation-open-loop-tracker
verified: 2026-09-09T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Log in at /dashboard/login, open /community-president, click 'Añadir bucle', fill Título + Tipo + Próxima acción, press 'Crear bucle', then hard-reload the page."
    expected: "The slide-over animates in from the right over the still-visible board; on submit the panel closes and the new loop appears; after a full reload the loop is still present. Then edit a loop's title/owner/due, save, reload — all three changes persist. Discard a loop — it leaves the board but stays in data/community-open-loops.json with status dropped."
    why_human: "curl proved the POST/PATCH API and the Server-Component render path only. The create-then-hard-reload round-trip through the browser, the slide-over motion, focus trap/restore, reduced-motion, and Esc/backdrop dismiss are not scriptable here."
  - test: "Open /community-president at a 390px viewport (device toolbar), then re-check at 1440px."
    expected: "390px: top bar with a working hamburger drawer; the three columns stack in priority order Vencidos -> Vencen pronto -> A la espera de otros -> Sin fecha; quick-action buttons are always visible (no hover) with >=44px hit areas; the slide-over is near-full-width with a reachable footer when the keyboard is open. 1440px: three columns, fixed left sidebar, 420px slide-over, no regression."
    why_human: "Responsive rendering and touch-target geometry (D-15) require a real viewport; the breakpoint classes are present in code but their visual result is not verifiable by grep."
  - test: "Create an overdue loop whose owner is 'administrador' (or status waiting_on_other). Confirm with Nicola: 'your overdue loops that are waiting on the administrador show up in Vencidos with an Administrador chip, not also under A la espera - OK?'"
    expected: "Nicola confirms the single-column (disjoint priority cascade) reading of D-02 is acceptable. If he wants dual listing, groupLoopsByUrgency must push into multiple arrays and the count strip switches to unique-loop wording."
    why_human: "RESEARCH assumption A1 / D-02 is a product decision that only Nicola can confirm at first UAT (flagged unresolved in 01-02-PLAN.md)."
  - test: "Before shipping the surface: set DASHBOARD_TOKEN in local .env, Vercel Preview, and Vercel Production."
    expected: "With DASHBOARD_TOKEN set, the layout gate and requireAuth() both pass for a valid cookie. Without it both fail closed (redirect / 401) - the surface is unusable rather than exposed, but it must be set for the phase to actually ship."
    why_human: "Pre-existing STATE.md blocker; .env is not writable from the agent environment and Vercel env vars are out of band."
---

# Phase 1: Cockpit Foundation & Open-Loop Tracker Verification Report

**Phase Goal:** Nicola has a private, authenticated Community President cockpit where he can capture every open commitment and incidencia and see them ranked by urgency the moment he opens it.
**Verified:** 2026-09-09
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria — the contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | Visiting `/community-president` without a valid `dashboard_auth` cookie redirects to the login page; with it, the cockpit + its own sidebar load. | ✓ VERIFIED | `app/community-president/layout.tsx` awaits `cookies()`, applies the three-part fail-closed guard (`!token \|\| !process.env.DASHBOARD_TOKEN \|\| token !== process.env.DASHBOARD_TOKEN`), and calls `redirect("/dashboard/login")` at the top level (not inside try/catch). Renders `<CommunitySidebar />` + `<main>`. `page.tsx` renders the "Bucles abiertos" title via `<Cockpit>`. Visual load path is a human item. |
| SC-2 | Nicola can create an OpenLoop (kind, status, owner, next action, soft due date) and later edit any field; the change survives a reload (private Blob-JSON store). | ✓ VERIFIED | `POST /api/community/open-loops` validates -> `applyCreateDefaults` (explicit field pick, D-09 defaults) -> `crypto.randomUUID()` -> append -> `saveOpenLoops` -> 201. `PATCH /api/community/open-loops/[id]` validates (non-create) -> `applyPatch` allow-list -> 404 on unknown id -> save. `LoopSlideOver` has create + edit modes with all fields; `buildPatch` diffs changed fields. Store = private Blob or local JSON, faithful copy of `lib/cv/profile-store.ts`. Browser round-trip is a human item. |
| SC-3 | On opening the cockpit, OpenLoops split into overdue / due-soon / waiting-on-others, ordered by urgency, no manual filtering. | ✓ VERIFIED | `groupLoopsByUrgency(loops)` runs server-side in `page.tsx` (not a client effect). `lib/community/urgency.test.ts` = 28/28 passing, covering D-01..D-07: the exact 14-day boundary and one step either side, due-today, empty input, hidden `done`/`dropped`, `blocked` flow-through, sort order (oldest-due first / soonest-first / updated_at desc), stable tie-break. `Cockpit.tsx` renders 3 columns in load-bearing order + `NoDateSection` + `CountStrip`. |
| SC-4 | Any `/api/community/*` request with a missing/wrong token is rejected 401 via a shared `requireAuth()` doing a strong `=== DASHBOARD_TOKEN` comparison. | ✓ VERIFIED | `lib/community/require-auth.ts`: exact `===` (no trim/case-fold/prefix), three-part guard, returns `401 {error:"Unauthorized"}`. Called as the literal first statement of `GET`, `POST` (`open-loops/route.ts`) and `PATCH` (`[id]/route.ts`) before body parse / store read. Code review confirmed under adversarial reading. |
| SC-5 | Every stored OpenLoop carries a `source` field that accepts `neighbour_form`; no president-internal field on a shared/neighbour-visible shape. | ✓ VERIFIED | `OpenLoopSource = "acta" \| "email" \| "manual" \| "neighbour_form"`; `OpenLoop.source` required, defaults `"manual"`. `Submission` interface = `id, submitter_name, submitter_unit, description, photos?, status:"triage", created_at` only — zero LPH/owner/presupuesto fields. `grep -rn 'Submission' app/ lib/community/` → no consumer (declared, not wired in v1). |

**Score:** 5/5 must-have criteria verified (code + tests + curl-proven API paths). 0 behavior-unverified.

### Supporting Truth Checks (PLAN must_haves)

| Area | Status | Evidence |
|------|--------|----------|
| LOOP-01 enum vocabularies locked (D-10) | ✓ VERIFIED | `OpenLoopKind/Status/Owner/Source` unions in `lib/types.ts`; Spanish label records in `loop-defaults.ts` are the single source; validation allow-lists derived from `Object.keys` of those records. |
| `validateLoopInput` boundaries | ✓ VERIFIED | title 1–200, next_action 1–2000, owner_detail 0–200, `due` matches `/^\d{4}-\d{2}-\d{2}$/` or null, create requires title+kind+next_action, unknown enum → error string. |
| PATCH mass-assignment / prototype pollution guard | ✓ VERIFIED | `PATCHABLE_KEYS` is `Object.freeze`'d; `applyPatch` builds `{...existing}` then overlays ONLY allow-listed keys via `Object.prototype.hasOwnProperty.call(patch, key)`. Raw body never spread. `id`/`created_at`/`source`/LPH fields structurally unreachable; `__proto__`/`constructor` not on the list. Positive allow-list = conclusive without a runtime test. |
| PATCH 404 writes nothing | ✓ VERIFIED | `findIndex` -1 → `return 404` before `saveOpenLoops`. |
| PATCH idempotent apart from `updated_at` | ✓ VERIFIED | `applyPatch` overlays identical values → identical object except `updated_at` refresh. |
| No hard-delete anywhere in the phase | ✓ VERIFIED | Only `PATCH` exported in `[id]/route.ts`; "Descartar" sets `status:"dropped"`. `grep` for `function DELETE` → none. |
| No drag-and-drop (D-14) | ✓ VERIFIED | `grep -riE 'draggable\|onDragStart\|onDrop\|dnd-kit\|react-beautiful-dnd' app/components/community/` → none. |
| No raw-HTML injection prop | ✓ VERIFIED | `grep -rn 'dangerouslySetInnerHTML' app/components/community/` → none; all free text renders as React children. |
| No new npm dependency (A8) | ✓ VERIFIED | No `package.json` / `package-lock.json` change in any phase commit. |
| D-12 quick actions | ✓ VERIFIED (code) | `QuickActions.tsx` — "Marcar hecho" / "Marcar a la espera" / "Aplazar fecha" aria-labels, each a PATCH to the id-scoped route, `e.stopPropagation()`, 44px hit area, per-card pending state owned by `Cockpit`. Runtime move/vanish behaviour is covered by the slide-over/board human item. |
| D-15 mobile | ⚠️ present, visual check pending | Breakpoint classes present: mobile top bar + drawer in `CommunitySidebar.tsx`, `md:ml-60 pt-14` offset in `layout.tsx`, `w-[calc(100vw-32px)] md:w-[420px]` panel, always-visible quick-action row below `md`. 390px/1440px rendering routed to human verification. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/types.ts` | SCP banner + unions + `OpenLoop` + `Submission` | ✓ VERIFIED | Appended section, `interface` style matches existing banners. |
| `lib/community/open-loops-store.ts` | `getOpenLoops` / `saveOpenLoops`, private, dual-mode | ✓ VERIFIED | Faithful copy of `profile-store.ts` + read-never-throws fallback to `[]`. |
| `lib/community/require-auth.ts` | `requireAuth` strong `===` | ✓ VERIFIED | Three-part guard, exact comparison. |
| `lib/community/loop-defaults.ts` | validate / defaults / labels / PATCHABLE_KEYS / applyPatch | ✓ VERIFIED | All present, allow-lists derived from label records. |
| `lib/community/urgency.ts` + `.test.ts` | pure `groupLoopsByUrgency`, 28 tests | ✓ VERIFIED | `grep -cE "from ['\"](next\|fs\|react)"` → 0 (isomorphic). Tests pass. |
| `lib/community/relative-date.ts` | `formatRelativeDue`, `countStrip` | ✓ VERIFIED | Vocabulary centralised, tested. |
| `app/api/community/open-loops/route.ts` | GET + POST, auth-first | ✓ VERIFIED | requireAuth first statement both verbs. |
| `app/api/community/open-loops/[id]/route.ts` | PATCH only, auth-first, async params | ✓ VERIFIED | `await ctx.params`, only PATCH exported. |
| `app/community-president/layout.tsx` + `page.tsx` | auth gate + server-render board | ✓ VERIFIED | Guard + `redirect`; page reads store + groups server-side. |
| `app/components/community/*` (9 components) | sidebar, cockpit, board, slide-over, quick actions, count strip, empty state | ✓ VERIFIED | All present, wired, lint-clean. |
| `data/community-open-loops.json` | committed `[]` | ✓ VERIFIED | Contains `[]`, tracked in git. |

### Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| `layout.tsx` guard | `redirect('/dashboard/login')` | top-level call, not in try/catch | ✓ WIRED |
| `requireAuth()` | first statement of GET/POST/PATCH | `const denied = requireAuth(request); if (denied) return denied;` | ✓ WIRED |
| `page.tsx` | `getOpenLoops()` -> `groupLoopsByUrgency()` -> `<Cockpit>` | request-time read, server-side group, no static seed import | ✓ WIRED |
| `LoopSlideOver` submit | `fetch POST/PATCH` -> `router.refresh()` -> page re-reads store | `Cockpit.handleCreate` / `patchEditingLoop` | ✓ WIRED |
| `QuickActions` + slide-over | same PATCH endpoint | `/api/community/open-loops/${id}`, one validation path | ✓ WIRED |
| label records | validator allow-lists + slide-over selects | `Object.keys(*_LABELS)` | ✓ WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `Cockpit` / board | `loops`, `grouped` | `page.tsx` -> `await getOpenLoops()` (Blob or `data/community-open-loops.json`) -> `groupLoopsByUrgency` | Yes — real store read at request time; created loops appended by POST, edited by PATCH | ✓ FLOWING (empty by design at first run — D-18) |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| PLAT-01 | 01-01 | Standalone `app/community-president/` surface with own auth-gated layout + sidebar | ✓ SATISFIED | SC-1 |
| PLAT-02 | 01-01, 01-03 | Every `/api/community/*` route enforces shared strong `requireAuth()` | ✓ SATISFIED | SC-4 |
| PLAT-03 | 01-01, 01-03 | `OpenLoop`/`Submission` separation; `source` accepts `neighbour_form` | ✓ SATISFIED | SC-5 |
| LOOP-01 | 01-01, 01-03 | Create + edit an OpenLoop (kind/status/owner/next action/soft due date) | ✓ SATISFIED | SC-2 + enum checks |
| LOOP-04 | 01-02 | Passive cockpit grouped by due/overdue/waiting, sorted by urgency, on open | ✓ SATISFIED | SC-3 + 28-test suite |

All 5 phase requirement IDs appear in at least one PLAN `requirements:` field. REQUIREMENTS.md maps Phase 1 -> {PLAT-01, PLAT-02, PLAT-03, LOOP-01, LOOP-04} with no additional IDs. **No orphaned requirements.**

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Urgency ranking rules (D-01..D-07) | `node --test lib/community/urgency.test.ts` | tests 28 / pass 28 / fail 0 | ✓ PASS |
| Type + build integrity | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Community-scoped lint | `npx eslint app/community-president app/components/community lib/community` | exit 0 | ✓ PASS |
| `urgency.ts` isomorphic | `grep -cE "from ['\"](next\|fs\|react)" lib/community/urgency.ts` | 0 | ✓ PASS |
| Seed committed empty | `cat data/community-open-loops.json` + `git ls-files --error-unmatch` | `[]`, tracked | ✓ PASS |
| Auth 401 / 201 matrix | live `curl` against dev server | (per orchestrator: curl proved API paths green) | ? SKIP — re-confirm at UAT |

### Probe Execution

No probes declared for this phase (MVP UI slices, no migration/tooling probes). N/A.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `lib/community/loop-defaults.ts` | `validateLoopInput` | Required-ness checks (`!title`, `!nextAction`) gated behind `opts.create` — a raw `PATCH {"title":""}` persists an empty title (code review WR-02) | ⚠️ Warning | Not reachable from the UI (`LoopSlideOver.handleSubmit` guards it). The 01-03 must_have truth as written only claims "length caps and enum allow-lists" are re-checked, which IS satisfied. Robustness gap for later untrusted-write phases — recommend follow-up, not a goal blocker. |
| `app/components/community/LoopSlideOver.tsx` / `Cockpit.tsx` / `[id]/route.ts` | edit save path | No-op "Guardar cambios" still issues a full-store write and bumps `updated_at`, reordering the "Sin fecha" bucket (WR-01) | ⚠️ Warning | Cosmetic reordering + a wasted Blob write; single-user tool. Follow-up. |
| `app/components/community/QuickActions.tsx` / `LoopSlideOver.tsx` | date inputs | "Aplazar fecha" and the date input accept past dates — a "postpone" can move a card into Vencidos (WR-03) | ⚠️ Warning | Minor UX; add `min=today`. Follow-up. |
| `lib/community/open-loops-store.ts` | `getOpenLoops` | `JSON.parse(...) as OpenLoop[]` with no `Array.isArray` guard — a malformed non-array doc 500s the surface instead of degrading to empty (IN-02) | ℹ️ Info | Single-writer whole-file rewrite makes this unlikely; cheap hardening. |
| `app/components/community/CommunitySidebar.tsx` | mobile drawer | `role="dialog" aria-modal="true"` without focus trap/restore or scroll lock (IN-04) | ℹ️ Info | Minor a11y gap on secondary nav; Esc-to-close works. |

No blocker-level anti-patterns. No debt markers (`TBD`/`FIXME`/`XXX`) in phase files. Code review: 0 critical, 3 warnings, 5 info.

### Human Verification Required

4 items — see frontmatter `human_verification` for full detail:

1. **Slide-over create/edit/discard round-trip in the browser** — motion, focus trap/restore, reduced-motion, Esc/backdrop dismiss, and the create-then-hard-reload persistence round-trip.
2. **Mobile D-15 at 390px + 1440px no regression.**
3. **D-02 / assumption A1 product confirmation** — overdue loop waiting on someone else shows in Vencidos only (with an owner chip), not dual-listed.
4. **`DASHBOARD_TOKEN` set in local `.env` + Vercel Preview + Vercel Production** before the surface ships (pre-existing STATE.md blocker).

### Gaps Summary

No gaps block the phase goal. All 5 ROADMAP success criteria are met in the committed code:
the authenticated standalone surface exists with its own layout gate and sidebar (PLAT-01),
`requireAuth()` enforces the strong token check as the first statement of every
`/api/community/*` verb (PLAT-02, SC-4), `OpenLoop`/`Submission` are cleanly separated with a
`neighbour_form`-ready `source` union and no `Submission` consumer (PLAT-03, SC-5), create +
allow-listed PATCH edit persist to the private dual-mode JSON store (LOOP-01, SC-2), and the
passive three-column urgency board renders server-side with a 28-test suite proving every
D-01..D-07 boundary (LOOP-04, SC-3).

The three code-review warnings (empty-title PATCH, no-op save write, past-date "aplazar") are
raw-API / cosmetic robustness gaps that the UI already guards against and that do not
compromise the phase goal for a single-user MVP — they belong in a follow-up, not a gap
closure plan.

Status is `human_needed` solely because of the four items above that require a human:
browser interaction/visual checks, a product decision, and an out-of-band deployment
prerequisite.

---

_Verified: 2026-09-09_
_Verifier: Claude (gsd-verifier)_
