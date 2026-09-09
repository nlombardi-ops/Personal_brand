---
phase: 01-cockpit-foundation-open-loop-tracker
plan: 01
subsystem: api
tags: [nextjs-16, app-router, vercel-blob, framer-motion, date-fns, auth, spanish-ui]

requires:
  - phase: none
    provides: greenfield surface — first plan of the milestone
provides:
  - "/community-president authenticated surface (nested layout gate + own sidebar)"
  - "requireAuth() shared strong-token guard for /api/community/*"
  - "OpenLoop / Submission type split with source union accepting neighbour_form"
  - "dual-mode open-loops JSON store (Blob private / local data file)"
  - "GET list + POST create for OpenLoop through a right-hand slide-over"
  - "loop-defaults: single Spanish label record per enum + validateLoopInput + applyCreateDefaults"
affects: [01-02 grouping/ranking board, 01-03 edit + quick actions, neighbour-portal-v2]

tech-stack:
  added: []
  patterns:
    - "Auth copy-with-hardening: three-part fail-closed guard !token || !env || token !== env in BOTH the layout and the API helper"
    - "Enum single-source-of-truth: label Record per enum, allow-list Sets derived from Object.keys, form selects render from the same records"
    - "Server Component reads store directly; client island mutates via Route Handler + router.refresh() (no revalidatePath — no cacheComponents)"
    - "Slide-over form reset via render-phase state adjustment (open !== prevOpen) instead of a setState-in-effect"

key-files:
  created:
    - lib/community/open-loops-store.ts
    - lib/community/require-auth.ts
    - lib/community/loop-defaults.ts
    - data/community-open-loops.json
    - app/api/community/open-loops/route.ts
    - app/community-president/layout.tsx
    - app/community-president/page.tsx
    - app/components/community/CommunitySidebar.tsx
    - app/components/community/Cockpit.tsx
    - app/components/community/LoopSlideOver.tsx
    - app/components/community/EmptyState.tsx
  modified:
    - lib/types.ts

key-decisions:
  - "LPH-aware OpenLoop fields declared optional now (Phase 3 adds behaviour, not shape) — resolves CONTEXT Claude's Discretion item"
  - "Submission interface ships empty of president-internals (PLAT-03 / SC-5) — no LPH data, responsible-party routing, or presupuesto references"
  - "SOURCE_LABELS record added (not required by UI-SPEC) so the source allow-list derives from Object.keys like the other three enums"
  - "LoopSlideOver resets form state in the render phase, not a useEffect, to satisfy the repo's react-hooks/set-state-in-effect lint rule"
  - "Behaviour tests run with DASHBOARD_TOKEN passed inline to `next dev` because .env files are not writable in this environment"

patterns-established:
  - "Pattern: /api/community/* handlers call requireAuth(request) as their literal first statement, before body parse or store read"
  - "Pattern: community surface uses the portfolio neutral-* palette on #fafafa, never the dashboard stone-* scale"
  - "Pattern: free text (title/next_action/owner_detail) rendered as React children only — dangerouslySetInnerHTML forbidden on this surface"

requirements-completed: [PLAT-01, PLAT-02, PLAT-03, LOOP-01]

coverage:
  - id: D1
    description: "Visiting /community-president with no/invalid dashboard_auth cookie redirects to /dashboard/login; a valid cookie renders the sidebar + 'Bucles abiertos' title (PLAT-01, SC-1)"
    requirement: "PLAT-01"
    verification:
      - kind: integration
        ref: "curl -s -o /dev/null -w '%{http_code} %{redirect_url}' localhost:3123/community-president => 307 http://localhost:3123/dashboard/login; with valid cookie => 200 + 'Bucles abiertos'/'Presidente' in body"
        status: pass
    human_judgment: false
  - id: D2
    description: "requireAuth() rejects with 401 unless dashboard_auth === process.env.DASHBOARD_TOKEN exactly (prefix/superstring/empty/absent all rejected); runs before body parse and store read on both GET and POST (PLAT-02, SC-4)"
    requirement: "PLAT-02"
    verification:
      - kind: integration
        ref: "curl POST /api/community/open-loops: no cookie=>401, wrong value=>401, token prefix=>401, empty cookie=>401; valid GET=>200, valid POST=>201"
        status: pass
      - kind: unit
        ref: "grep -c 'process.env.DASHBOARD_TOKEN' lib/community/require-auth.ts == 2; grep -c 'requireAuth(request)' route.ts == 2"
        status: pass
    human_judgment: false
  - id: D3
    description: "OpenLoop / Submission type split: source union accepts 'neighbour_form'; Submission carries zero president-internal fields (PLAT-03, SC-5)"
    requirement: "PLAT-03"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit exits 0; grep -c 'neighbour_form' lib/types.ts >=1; grep 'interface Submission' -A12 shows no acuerdo_id|majority_type|impugnacion|ejecutividad|owner|presupuesto|budget_annual"
        status: pass
    human_judgment: false
  - id: D4
    description: "POST create appends an OpenLoop with server-assigned crypto.randomUUID id, equal created_at/updated_at, and D-09 defaults (status:open, owner:me, source:manual, due:null); it persists to the JSON document (LOOP-01)"
    requirement: "LOOP-01"
    verification:
      - kind: integration
        ref: "curl POST minimal body => 201 {id, status:'open', owner:'me', source:'manual', due:null, created_at==updated_at}; data/community-open-loops.json contains the object after the call"
        status: pass
    human_judgment: false
  - id: D5
    description: "validateLoopInput enforces title 1-200, next_action 1-2000, owner_detail 0-200, due /^\\d{4}-\\d{2}-\\d{2}$/, required title|kind|next_action on create, enum allow-lists for kind/status/owner/source (LOOP-01 boundary)"
    requirement: "LOOP-01"
    verification:
      - kind: integration
        ref: "curl matrix: 200-char title=>201, 201-char=>400, kind:'bogus'=>400, due:'2026-13-45x'=>400, missing next_action=>400, invalid JSON=>400, array body=>400"
        status: pass
    human_judgment: false
  - id: D6
    description: "Slide-over create flow (D-08/D-09/D-10/D-11/D-18): open from 'Añadir bucle', fill Título+Tipo+Próxima acción, press 'Crear bucle', loop appears and survives a full page reload; failed save keeps the panel open with values; EmptyState first-run; owner-detail field only for neighbour/provider"
    requirement: "LOOP-01"
    verification:
      - kind: manual_procedural
        ref: "01-01-PLAN.md <verify><human-check> for Task 2 — browser: create in slide-over, panel closes, loop shows, hard-reload persists; reduced-motion, focus trap, backdrop/Esc dismiss"
        status: unknown
    human_judgment: true
    rationale: "Slide-over motion, focus trap, reduced-motion, backdrop dismiss, and the visual create-then-reload round-trip need a human in a real browser; curl proved the API and Server-Component render paths but not the client interaction."

duration: 50min
completed: 2026-09-09
status: complete
---

# Phase 1 Plan 01: Cockpit Foundation & Open-Loop Tracker (Slice 1 of 3) Summary

**Standalone auth-gated `/community-president` surface with a hardened three-part token guard, the OpenLoop/Submission type split, a dual-mode JSON store, and a working create-a-bucle round-trip through a right-hand framer-motion slide-over.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-09-09T14:05:00Z (approx)
- **Completed:** 2026-09-09T14:20:00Z (approx, plus SUMMARY/state)
- **Tasks:** 2 / 2
- **Files modified:** 12 (11 new + `lib/types.ts` modified)

## Accomplishments

- `/community-president` is a real authenticated route: nested `layout.tsx` gate redirects to `/dashboard/login` unless `dashboard_auth` matches `process.env.DASHBOARD_TOKEN` exactly, with the extra `!process.env.DASHBOARD_TOKEN` clause that closes the fail-open hole the `app/cv/layout.tsx` analog has (RESEARCH Pitfall 1).
- Shared `requireAuth()` helper is the literal first statement of both `GET` and `POST /api/community/open-loops` — verified 401 for no cookie, wrong value, a token prefix, and an empty cookie; 200/201 with the real token.
- `OpenLoop` + `Submission` interfaces and the four D-10 string unions added under a new `// ── Smart Community President ──` banner in `lib/types.ts`; `source` already accepts `neighbour_form`; `Submission` is empty of president internals (SC-5); LPH-aware fields declared optional now.
- Dual-mode store `lib/community/open-loops-store.ts` is a verbatim structural copy of `versions-store.ts` (private access on read+write, `useCache:false`, `addRandomSuffix:false`, `allowOverwrite:true`, CDN-cache comment kept); committed empty seed `data/community-open-loops.json` = `[]`.
- Create half of `OpenLoop` CRUD works end-to-end: client slide-over → `POST` → `validateLoopInput` / `applyCreateDefaults` → `saveOpenLoops` → `router.refresh()`; server assigns `crypto.randomUUID()` id and equal ISO timestamps; validation boundary matrix (length caps, YMD, enum allow-lists, required fields, invalid JSON, array body) all return the expected 400/201.
- `loop-defaults.ts` holds one Spanish label `Record` per enum; allow-list `Set`s and the slide-over `<select>` options both derive from those same records so the vocabulary cannot drift (Pitfall 7).
- UI on the portfolio `neutral-*` palette: `CommunitySidebar` (single "Panel" nav, "CP" brand tile, Spanish footer), `EmptyState` (D-18 first-run), `LoopSlideOver` (D-08 fixed 420px panel, framer-motion transform transition disabled under reduced-motion, Escape/backdrop/X dismiss, focus trap + restore, date preset chips via `date-fns`).

## Task Commits

1. **Task 1: The authenticated cockpit surface loads and shows its own sidebar** — `c815ebb` (feat)
2. **Task 2: Nicola creates his first bucle in the slide-over and it survives a reload** — `08fdca3` (feat)

**Plan metadata:** _(this commit)_ `docs(01-01): complete cockpit-foundation-open-loop-tracker plan`

## Files Created/Modified

- `lib/types.ts` — MODIFIED: appended Smart Community President banner + `OpenLoopKind/Status/Owner/Source` unions + `OpenLoop` (incl. optional LPH fields) + `Submission`
- `lib/community/open-loops-store.ts` — `getOpenLoops` / `saveOpenLoops`, Blob-private-or-local dual mode
- `lib/community/require-auth.ts` — `requireAuth(request)` strong-token 401 gate
- `lib/community/loop-defaults.ts` — `KIND/STATUS/OWNER/SOURCE_LABELS`, `validateLoopInput`, `applyCreateDefaults`, `OWNER_DETAIL_OWNERS`
- `data/community-open-loops.json` — committed `[]` seed
- `app/api/community/open-loops/route.ts` — `GET` list + `POST` create
- `app/community-president/layout.tsx` — async Server Component auth gate + `<main>` shell
- `app/community-president/page.tsx` — Server Component, `await getOpenLoops()` → `<Cockpit>`
- `app/components/community/CommunitySidebar.tsx` — client sidebar, neutral palette
- `app/components/community/Cockpit.tsx` — client island: slide-over state + POST + `router.refresh()`
- `app/components/community/LoopSlideOver.tsx` — D-08 create panel
- `app/components/community/EmptyState.tsx` — D-18 first-run state

## Decisions Made

- **LPH-aware `OpenLoop` fields declared optional now** (not deferred to Phase 3) — matches the UI-SPEC + RESEARCH recommendation; Phase 3 adds behaviour, not shape.
- **Added a `SOURCE_LABELS` record** even though UI-SPEC lists no source display labels — keeps all four enum allow-lists derived uniformly from `Object.keys`.
- **`LoopSlideOver` resets its form in the render phase** (`if (open !== prevOpen)`) rather than a `useEffect` with setState calls — the repo's ESLint config errors on `react-hooks/set-state-in-effect` and `.claude/CLAUDE.md` requires following repo conventions. DOM focus management stays in effects (legitimate external-system sync).
- **Behaviour tests used `DASHBOARD_TOKEN=… npm run dev`** (inline env) because `.env` / `.env.local` are not writable in this environment. No `.env` file was created or committed.

## Deviations from Plan

None affecting scope — the plan was executed as written. Two implementation notes:

1. **[Rule 3 - Blocking, then out-of-scope] `npm run lint` fails on a pre-existing red baseline.** The plan's `<automated>` verify chains `npm run lint`, which exits 1 due to 4 errors + 6 warnings in files this plan does not touch (`app/components/Contact.tsx`, `app/components/References.tsx`, `app/cv/page.tsx`, `app/dashboard/mortgage/page.tsx`, `lib/cv/render.tsx`). This is pre-existing debt on `main`. Per the scope boundary it was **not fixed**; it is logged in `deferred-items.md`. All Phase 1 new files lint clean — verified with `npx eslint app/community-president app/components/community lib/community lib/types.ts app/api/community` → 0 problems.

## Issues Encountered

- **`.env` files are not writable in this environment** (Read deny rule). Worked around by passing `DASHBOARD_TOKEN` / `DASHBOARD_PASSWORD` inline to `next dev` on port 3123 for the behaviour matrix. Nicola must set `DASHBOARD_TOKEN` in his local `.env` (and Vercel Preview + Production) before the surface is usable — this is the existing STATE.md blocker, not new.
- **`react-hooks/set-state-in-effect` lint error** on the first `LoopSlideOver` draft (form reset in `useEffect`) — resolved by moving the reset to a render-phase state adjustment.

## User Setup Required

None new. Reminder: `DASHBOARD_TOKEN` must be set in local `.env`, Vercel Preview, and Vercel Production (pre-existing blocker). Without it the layout redirects and the API 401s — correct fail-closed behaviour.

## Known Stubs

- `app/components/community/Cockpit.tsx` renders a flat `title · kind · owner` list when loops exist — this is the **deliberate thin stub** for Slice 1. The grouped/ranked kanban board is plan 01-02; edit + quick actions are plan 01-03. Documented in the plan ("the grouped kanban board is plan 02's job and this list is the deliberate thin stub").

## Threat Flags

None. No security surface beyond what the plan's `<threat_model>` already covers (T-01-01..T-01-SC). No new endpoints, auth paths, or trust-boundary schema beyond `POST /api/community/open-loops` as specified.

## TDD Gate Compliance

N/A — both tasks are `tdd="false"` and the phase is not in TDD mode (no test runner exists in this repo per `.claude/CLAUDE.md`).

## Next Phase Readiness

- Ready for **01-02** (grouping/ranking board): `OpenLoop` shape, `getOpenLoops()`, `groupLoopsByUrgency` inputs (`due`, `status`, `updated_at`), and the label records are all in place. `01-02` builds `lib/community/urgency.ts` + `relative-date.ts` and the real board that replaces the Cockpit stub list.
- Ready for **01-03** (edit + quick actions): `validateLoopInput(body, { create: false })` already handles the patch path; `app/api/community/open-loops/[id]/route.ts` (PATCH) and the slide-over edit mode are 01-03's job.
- Open question carried forward (RESEARCH Open Question 1): whether an overdue-and-waiting loop appears in both columns or just Vencidos with an owner chip — surface at first UAT.

## Self-Check: PASSED

All 12 created/modified files exist on disk; both task commits (`c815ebb`, `08fdca3`) are in git history; `data/community-open-loops.json` is tracked and contains `[]`.

---
*Phase: 01-cockpit-foundation-open-loop-tracker*
*Completed: 2026-09-09*
