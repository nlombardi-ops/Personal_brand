# Phase 1: Cockpit Foundation & Open-Loop Tracker - Context

**Gathered:** 2026-09-08
**Status:** Ready for planning

<domain>
## Phase Boundary

A standalone, authenticated **Community President** surface (`/community-president`)
where Nicola captures every open commitment and incidencia as an `OpenLoop` and, on
opening the surface, sees them ranked by urgency with no manual filtering.

**In scope:** the surface + its auth-gated `layout.tsx` and own sidebar; a shared
strong-token `requireAuth()` for `/api/community/*`; `OpenLoop` CRUD (create / edit /
status change) persisted to a private Blob-or-local JSON store; the passive urgency
cockpit view; the `OpenLoop` / `Submission` model separation with a `source` field that
already accepts `neighbour_form`.

**Not in scope (later phases):** document upload & attachment (Phase 2), presupuestos
(Phase 2), juntas / acuerdos / LPH deadline engine (Phase 3), LPH Q&A + pricing
(Phase 4), email ingestion (Phase 5). Scheduled reminders, AI extraction, a real
database, and the neighbour portal are all v2 / out of scope per REQUIREMENTS.md.

</domain>

<decisions>
## Implementation Decisions

### Urgency Ranking & Grouping
- **D-01:** The cockpit groups all non-terminal loops into three buckets — **Overdue**,
  **Due-soon**, **Waiting-on-others** — plus a **No date set** section beneath them.
- **D-02:** Overdue is comprehensive. A loop past its `due` date appears in Overdue
  *even when the next move is someone else's*; it carries a tag showing who it is
  waiting on. No loop is ever hidden from the Overdue bucket ("show in both").
- **D-03:** "Due-soon" = `due` within the next **14 calendar days** and not yet overdue.
- **D-04:** A loop counts as **waiting-on-others** when `status == waiting_on_other`
  **OR** `owner != me` (either condition).
- **D-05:** Loops with no `due` date go in their own **No date set** section at the
  bottom — visible, but never treated as urgent.
- **D-06:** Sort within every group is **by date only**: Overdue = most overdue first
  (oldest `due` at top); Due-soon = soonest first; No date set = most recently updated
  first.
- **D-07:** `done` and `dropped` loops are hidden from the cockpit view. `blocked` is
  expected to surface alongside waiting-on-others (confirm in planning).

### Capture Flow
- **D-08:** Create and edit both open in a **right-hand slide-over panel**; the grouped
  cockpit stays visible behind it. (New pattern for this app — dashboard/CV have none.)
- **D-09:** Minimum required to save a new loop: **title + kind + next action**.
  `status` defaults to `open`, `owner` defaults to `me`, `due` is optional.
- **D-10:** Enum vocabularies are **locked for v1** exactly as in the data-model sketch:
  - `kind`: `commitment` | `incidencia` | `obra` | `follow_up` | `permiso`
  - `status`: `open` | `waiting_on_other` | `blocked` | `done` | `dropped`
  - `owner`: `me` | `neighbour` | `administrador` | `provider` | `junta`
- **D-11:** `owner_detail` is a free-text field, shown only when `owner` is `neighbour`
  or `provider`.
- **D-12:** Cockpit cards carry **inline quick actions** — mark done, mark waiting,
  bump due date. Any other edit goes through the slide-over.

### Cockpit View & Layout
- **D-13:** The cockpit renders as a **kanban-style board**: three columns —
  Overdue / Due-soon / Waiting-on-others — with **No date set** as a collapsed section
  below the board.
- **D-14:** **No drag-and-drop.** The columns are a read-only view; loops change state
  through the inline row actions or the slide-over.
- **D-15:** On mobile the columns **stack vertically**, becoming the group sections
  top-to-bottom by priority. (Mobile must work — this surface deliberately does not
  inherit the dashboard's zero-mobile-support.)
- **D-16:** A loop card shows **title + relative due date** (e.g. "3 days overdue") **+
  an owner chip**. `next_action` and `kind` are visible only in the slide-over.
- **D-17:** The cockpit header shows a **count strip**: `X overdue · Y due soon ·
  Z waiting`.
- **D-18:** Empty / first-run state: a short explainer plus a prominent **"Add your
  first loop"** button. No seed / demo data ships in `data/community-open-loops.json`
  (empty array).

### Claude's Discretion
- Due-date input mechanics (calendar picker vs relative presets like "in 2 weeks"),
  validation / error copy, and the field layout inside the slide-over.
- Exact placement of `blocked`-status loops (expected: grouped with waiting-on-others).
- Whether `done`/`dropped` loops get an "all loops" / archive view within Phase 1 or a
  later phase.
- Whether the LPH-aware `OpenLoop` fields from the data-model sketch (`acuerdo_id`,
  `impugnacion_deadline`, etc.) are declared now as nullable/optional or added in
  Phase 3 — pick whichever keeps the type clean without a Phase 3 rewrite.
- Naming of the shared auth helper module (`lib/community/require-auth.ts` or similar).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data model & domain
- `.planning/notes/data-model-sketch.md` — candidate `OpenLoop` field list, supporting
  entities (`Document`, `Presupuesto`, `Junta`), the locked enum vocabularies, and the
  `OpenLoop` / `Submission` forward-compatibility split. **Starting point for the type.**
- `.planning/notes/exploration-findings.md` — LPH domain background; origin of the
  owner/kind vocabulary (context, not Phase 1 work).
- `.planning/REQUIREMENTS.md` §"Open Loops" (LOOP-01, LOOP-04) and §"Platform"
  (PLAT-01, PLAT-02, PLAT-03) — acceptance wording these decisions must satisfy.
- `.planning/ROADMAP.md` §"Phase 1" — the five "what must be TRUE" success criteria.
- `.planning/PROJECT.md` §Constraints and §"Key Decisions" — the locked architecture
  decisions (standalone surface, strong `requireAuth()`, passive cockpit, single-writer
  JSON, `OpenLoop`/`Submission` separation).

### Codebase patterns to copy
- `.planning/codebase/STRUCTURE.md` §"Where to Add New Code" — the exact file layout
  for the fourth surface (pages, components, API routes, store, seed, types).
- `.planning/codebase/CONVENTIONS.md` §"Storage Pattern (dual-mode)",
  §"API Route Conventions", §"What a New Feature Module Must Follow".
- `lib/cv/versions-store.ts` — copy this store shape verbatim for
  `lib/community/open-loops-store.ts` (private access, `useCache: false`,
  `addRandomSuffix: false`, `allowOverwrite: true`).
- `app/cv/layout.tsx` — the auth-gate layout to mirror for
  `app/community-president/layout.tsx`.
- `app/components/dashboard/AuthGuard.tsx` — async server-component cookie check +
  `redirect()`.
- `app/api/cv/versions/route.ts` — a gated route that does the *strong*
  `cookie.value === process.env.DASHBOARD_TOKEN` comparison (the form to follow).
- `app/components/dashboard/Sidebar.tsx` — reference for building the new surface's own
  sidebar.
- `node_modules/next/dist/docs/` — **MANDATORY per AGENTS.md** before any
  routing / layout / caching work. Next.js 16.2.4 is ahead of training data.

### Design
- `DESIGN.md` — the portfolio token system. Candidate basis for this surface's visuals;
  the palette/token decision is deferred to the UI spec (`/gsd-ui-phase 1`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/cv/versions-store.ts`: dual-mode Blob/local JSON store — the template for
  `lib/community/open-loops-store.ts` (`BLOB_PATHNAME = "community-open-loops.json"`,
  `LOCAL_PATH = data/community-open-loops.json`).
- `app/cv/layout.tsx` / `app/components/dashboard/AuthGuard.tsx`: async server
  component that awaits `cookies()`, compares to `DASHBOARD_TOKEN`, and `redirect()`s —
  the model for the new surface's auth gate.
- `lucide-react` icons and the `FadeUp` framer-motion wrapper are available for the new
  UI; slide-over and interactive rows will need `"use client"`.

### Established Patterns
- Server Components by default; `"use client"` only for the slide-over panel and the
  interactive cards; always `await cookies()` / `headers()` (async in this Next major).
- Every `/api/community/*` route: strong cookie check first (via the new shared
  `requireAuth()`), then `try/catch` around `request.json()` → `400`, then work in
  `try/catch` → `500` with `err instanceof Error ? err.message : String(err)`.
  Unauthorized → `{ error: "Unauthorized" }`, `401`, before any work.
- Store modules expose `getOpenLoops()` / `saveOpenLoops()`; one JSON document,
  whole-file rewrite (single-user / single-writer — acceptable for v1).
- New domain interfaces go in `lib/types.ts` under a new
  `// ── Smart Community President ──` banner.
- Spanish user-facing copy on this surface (matches the dashboard convention).

### Integration Points
- New route tree `app/community-president/` — a peer of `app/cv/` and `app/dashboard/`.
- New API tree `app/api/community/<action>/route.ts`.
- New store `lib/community/open-loops-store.ts` + committed seed
  `data/community-open-loops.json` (empty `[]`).
- New shared helper `lib/community/require-auth.ts` (strong `=== DASHBOARD_TOKEN`).
- `lib/types.ts` — new `OpenLoop` interface (+ `source` union including
  `neighbour_form`).
- Optional (can defer): register the store in `app/api/cv/export/route.ts` and
  `scripts/sync-context.sh` if the JSON should be mirrored back to git.

</code_context>

<specifics>
## Specific Ideas

- "A board" — kanban columns, not a stacked list: Overdue / Due-soon / Waiting-on-others
  side by side, No date set collapsed beneath.
- Relative due dates on the cards ("3 days overdue", "in 5 days").
- Header count strip phrased exactly like: `X overdue · Y due soon · Z waiting`.
- A friendly first-run state that invites "Add your first loop" rather than showing an
  empty board.
- Concrete `OpenLoop` examples that shaped the model, for planner/UI grounding:
  - "Get three presupuestos for the garage-door motor" — `obra`, owner `me`
  - "Administrador owes me the water-leak insurance claim status" — `follow_up`,
    owner `administrador`, `waiting_on_other`
  - "Neighbour 3ºB reported the portal intercom is dead" — `incidencia`, owner
    `provider`
  - "Promised the junta I'd ask the town hall about the façade permit" — `commitment` /
    `permiso`, owner `me`

</specifics>

<deferred>
## Deferred Ideas

- **Visual palette / design tokens for the new surface** — resolve in the UI spec
  (`/gsd-ui-phase 1`). PROJECT.md warns against inheriting the dashboard's half-done
  light-theme migration.
- **"All loops" / archive view for `done` and `dropped`** — not required by Phase 1
  success criteria; could be a Phase 1 stretch or a later phase.
- **Sidebar placeholder entries for future surfaces** (Documents, Juntas, Q&A) — not
  discussed in depth; keep the Phase 1 sidebar minimal and add entries as each phase
  lands.
- **Drag-and-drop between columns** — explicitly rejected for v1.
- **Dedicated loop detail page** — the slide-over covers Phase 1; a full page may be
  needed once documents / presupuestos / acuerdos attach (Phases 2–3).
- Everything already listed under REQUIREMENTS.md "v2 Requirements" and "Out of Scope"
  stays out (AI extraction, reminders, pricing scraper, `Building` entity, neighbour
  portal, `/api/cv/*` weak-auth cleanup, root `middleware.ts`).

</deferred>

---

*Phase: 1-Cockpit Foundation & Open-Loop Tracker*
*Context gathered: 2026-09-08*
