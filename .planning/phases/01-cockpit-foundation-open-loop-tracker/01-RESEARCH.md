# Phase 1: Cockpit Foundation & Open-Loop Tracker - Research

**Researched:** 2026-09-08
**Domain:** Next.js 16.2.4 App Router authenticated surface + dual-mode Blob JSON store + pure urgency-grouping logic
**Confidence:** HIGH (every pattern is a direct read of an existing repo file or the bundled Next.js 16.2.4 docs; no external/unverified sources needed)

## Summary

This phase adds a **fourth authenticated surface** (`/community-president`) to an existing Next.js 16.2.4 App Router monolith. Nothing here is novel infrastructure — the auth-gated `layout.tsx` pattern, the Blob-or-local JSON store, the strict cookie check, the "client component `fetch()`s an API route then calls `router.refresh()`" mutation loop, and Server-Components-read-stores-directly are all already in the codebase and were read directly for this research. The job is to **copy four existing files into a `community/` namespace**, add one pure function, one shared auth helper, and a UI built to the approved `01-UI-SPEC.md`.

The only genuinely new engineering is the **urgency grouping/sort function** (`lib/community/urgency.ts`) implementing locked decisions D-01…D-06, and it is a pure, isomorphic, unit-testable function with zero framework coupling.

Next.js 16 specifics that matter here and differ from older App Router training data: `cookies()`/`headers()`/`params` are **async-only** (sync access fully removed in v16); `middleware.ts` is renamed to `proxy.ts` (not needed this phase); `revalidateTag` now takes a second arg (not needed — this project does **not** use Cache Components / `cacheComponents`, so the "previous" caching model applies and Route Handlers + `cookies()`-gated pages are dynamic by default); Turbopack is the default builder. The existing `app/cv/layout.tsx` pattern **is** current for 16.2.4 — it already `await`s `cookies()`.

**Primary recommendation:** Copy `lib/cv/versions-store.ts` → `lib/community/open-loops-store.ts`, `app/cv/layout.tsx` → `app/community-president/layout.tsx`; factor the `contracts-chat` route's strict cookie check into `lib/community/require-auth.ts`; put grouping in a pure `lib/community/urgency.ts`; drive all mutations through `app/api/community/open-loops/[...]` Route Handlers called from client components that then `router.refresh()`. Do not introduce Server Actions (PLAT-02 mandates `/api/community/*` routes), a database, a component library, or any new npm dependency.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 … D-18 — verbatim)

**Urgency Ranking & Grouping**
- **D-01:** The cockpit groups all non-terminal loops into three buckets — **Overdue**, **Due-soon**, **Waiting-on-others** — plus a **No date set** section beneath them.
- **D-02:** Overdue is comprehensive. A loop past its `due` date appears in Overdue *even when the next move is someone else's*; it carries a tag showing who it is waiting on. No loop is ever hidden from the Overdue bucket ("show in both").
- **D-03:** "Due-soon" = `due` within the next **14 calendar days** and not yet overdue.
- **D-04:** A loop counts as **waiting-on-others** when `status == waiting_on_other` **OR** `owner != me` (either condition).
- **D-05:** Loops with no `due` date go in their own **No date set** section at the bottom — visible, but never treated as urgent.
- **D-06:** Sort within every group is **by date only**: Overdue = most overdue first (oldest `due` at top); Due-soon = soonest first; No date set = most recently updated first.
- **D-07:** `done` and `dropped` loops are hidden from the cockpit view. `blocked` is expected to surface alongside waiting-on-others (confirm in planning).

**Capture Flow**
- **D-08:** Create and edit both open in a **right-hand slide-over panel**; the grouped cockpit stays visible behind it.
- **D-09:** Minimum required to save a new loop: **title + kind + next action**. `status` defaults to `open`, `owner` defaults to `me`, `due` is optional.
- **D-10:** Enum vocabularies are **locked for v1** exactly as in the data-model sketch:
  - `kind`: `commitment` | `incidencia` | `obra` | `follow_up` | `permiso`
  - `status`: `open` | `waiting_on_other` | `blocked` | `done` | `dropped`
  - `owner`: `me` | `neighbour` | `administrador` | `provider` | `junta`
- **D-11:** `owner_detail` is a free-text field, shown only when `owner` is `neighbour` or `provider`.
- **D-12:** Cockpit cards carry **inline quick actions** — mark done, mark waiting, bump due date. Any other edit goes through the slide-over.

**Cockpit View & Layout**
- **D-13:** The cockpit renders as a **kanban-style board**: three columns — Overdue / Due-soon / Waiting-on-others — with **No date set** as a collapsed section below the board.
- **D-14:** **No drag-and-drop.** The columns are a read-only view; loops change state through the inline row actions or the slide-over.
- **D-15:** On mobile the columns **stack vertically**, becoming the group sections top-to-bottom by priority. Mobile must work — this surface deliberately does not inherit the dashboard's zero-mobile-support.
- **D-16:** A loop card shows **title + relative due date** (e.g. "3 days overdue") **+ an owner chip**. `next_action` and `kind` are visible only in the slide-over.
- **D-17:** The cockpit header shows a **count strip**: `X overdue · Y due soon · Z waiting`.
- **D-18:** Empty / first-run state: a short explainer plus a prominent **"Add your first loop"** button. No seed / demo data ships in `data/community-open-loops.json` (empty array).

### Claude's Discretion
- Due-date input mechanics (calendar picker vs relative presets like "in 2 weeks"), validation / error copy, and the field layout inside the slide-over. — **UI-SPEC resolved:** native `<input type="date">` + preset chips (`En 1 semana` / `En 2 semanas` / `En 1 mes`) + `Sin fecha` clear; single-column field order fixed.
- Exact placement of `blocked`-status loops (expected: grouped with waiting-on-others). — **This research recommends: yes, `blocked` → Waiting-on-others bucket.**
- Whether `done`/`dropped` loops get an "all loops" / archive view within Phase 1 or a later phase. — **Deferred (out of scope for Phase 1); board simply hides them.**
- Whether the LPH-aware `OpenLoop` fields (`acuerdo_id`, `impugnacion_deadline`, etc.) are declared now as nullable/optional or added in Phase 3 — pick whichever keeps the type clean without a Phase 3 rewrite. — **UI-SPEC + this research recommend: declare them all optional (`?:`) now, render none in Phase 1.**
- Naming of the shared auth helper module (`lib/community/require-auth.ts` or similar). — **This research recommends `lib/community/require-auth.ts` exporting `requireAuth(request)`.**

### Deferred Ideas (OUT OF SCOPE)
- Visual palette / design tokens for the new surface — resolved in `01-UI-SPEC.md` (portfolio `neutral-*` on `#fafafa`, NOT the dashboard `stone-*`).
- "All loops" / archive view for `done` and `dropped`.
- Sidebar placeholder entries for future surfaces (Documents, Juntas, Q&A) — keep Phase 1 sidebar minimal (single `Panel` item).
- Drag-and-drop between columns — explicitly rejected.
- Dedicated loop detail page — slide-over only for Phase 1.
- Everything under REQUIREMENTS.md "v2 Requirements" and "Out of Scope": AI extraction, reminders/cron digest, pricing scraper, `Building` entity, neighbour portal, `/api/cv/*` weak-auth cleanup, root `middleware.ts`/`proxy.ts`, document upload (Phase 2), presupuestos (Phase 2), juntas/LPH engine (Phase 3), email ingestion (Phase 5).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **PLAT-01** | Standalone `app/community-president/` surface with its own `layout.tsx` auth gate (mirroring `app/cv/layout.tsx`) and its own sidebar | `app/cv/layout.tsx` read verbatim (async server component, `await cookies()`, strict compare, `redirect("/dashboard/login")`). New `CommunitySidebar` mirrors `app/components/dashboard/Sidebar.tsx` but on the `neutral-*` palette per UI-SPEC. Layout returns a `<div>` (NOT `<html>/<body>` — those live in the inherited root `app/layout.tsx`). |
| **PLAT-02** | Every `/api/community/*` route enforces auth via a shared `requireAuth()` doing a strong `=== DASHBOARD_TOKEN` comparison | `app/api/dashboard/contracts-chat/route.ts` line 60-63 is the exact strict form to factor out: `const c = request.cookies.get("dashboard_auth"); if (!c?.value \|\| c.value !== process.env.DASHBOARD_TOKEN) return 401`. Route Handlers are **not cached** by default in Next 16 (confirmed in bundled docs). |
| **PLAT-03** | Keep `OpenLoop` and a future `Submission` separate — president-internal fields (LPH data, owner routing, presupuestos) only on `OpenLoop`; `OpenLoop.source` supports `neighbour_form` | Data-model sketch defines the split. This research specifies the `OpenLoop` interface + a stub `Submission` interface with only neighbour-safe fields, both under a new `// ── Smart Community President ──` banner in `lib/types.ts`. `source` union includes `"neighbour_form"`. |
| **LOOP-01** | Create and edit an `OpenLoop` with kind / status / owner / next action / soft due date | `POST /api/community/open-loops` (create) + `PATCH /api/community/open-loops/[id]` (edit + quick actions). Whole-file rewrite via `getOpenLoops()` / `saveOpenLoops()` copied from `versions-store.ts`. Server assigns `id` (`crypto.randomUUID()`), `created_at`, `updated_at`. |
| **LOOP-04** | Passive cockpit view grouped by due / overdue / waiting-on-others, sorted by urgency, on opening the surface | Pure `groupLoopsByUrgency(loops, now)` in `lib/community/urgency.ts` (spec below). Server component `app/community-president/page.tsx` reads the store directly (like `app/dashboard/page.tsx` reads `getBillsData()`) — no client fetch, no skeleton on first paint (UI-SPEC row confirms). |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth gate for the surface (redirect unauthenticated) | Frontend Server (`layout.tsx` Server Component) | — | Existing pattern: `app/cv/layout.tsx` awaits `cookies()` and `redirect()`s. Layout render forces the whole segment dynamic. |
| Auth check for mutations | API / Backend (Route Handler) | — | PLAT-02: `requireAuth(request)` on every `/api/community/*`. Cookie is `httpOnly` so only the server can read it. |
| OpenLoop persistence (read/write JSON) | API / Backend (`lib/community/open-loops-store.ts`) | Database / Storage (Vercel Blob private, or local `data/*.json`) | Copy `versions-store.ts` dual-mode fork verbatim. Single-user single-writer, whole-file rewrite. |
| Initial board data read | Frontend Server (`page.tsx` Server Component calling the store) | — | Matches `app/dashboard/page.tsx`. No API round-trip for first render. |
| Urgency grouping + sort | Pure logic (`lib/community/urgency.ts`), runs on server for first paint, re-runs on client after optimistic mutation | — | Isomorphic pure function. No framework, no I/O — unit testable. |
| Slide-over, inline quick actions, optimistic UI, `router.refresh()` | Browser / Client (`"use client"` island) | API / Backend (fetch → Route Handler) | State + effects + router require `"use client"`. Mirrors `app/components/dashboard/SyncButton.tsx`. |
| Relative-date formatting ("hace 3 días") | Browser / Client (presentational) OR pure helper | — | Fixed Spanish vocabulary from UI-SPEC; a pure `formatRelativeDue(due, now)` helper keeps it testable. |

### System Architecture Diagram

```
                          ┌─────────────────────────────────────────────┐
   Browser (Nicola)       │  Next.js 16.2.4 App Router (Vercel, Node)    │
                          │                                             │
  GET /community-president │  app/community-president/layout.tsx         │
  ───────────────────────▶│   └─ await cookies() ─ dashboard_auth       │
                          │        │  value !== DASHBOARD_TOKEN         │
                          │        ├─ no ──▶ redirect("/dashboard/login")│
                          │        └─ yes ─▶ render <CommunitySidebar/>  │
                          │                 + page.tsx (Server Comp.)    │
                          │                   └─ getOpenLoops() ─────────┼──▶ Vercel Blob (private)
                          │                   └─ groupLoopsByUrgency()   │    "community-open-loops.json"
                          │                        │                    │        │ (or data/community-
                          │                        ▼                    │        │  open-loops.json in dev)
                          │                 <Cockpit loops={...}/>       │        │
   HTML (grouped board)   │                  (client island)            │        │
  ◀───────────────────────┤                                             │        │
                          │                                             │        │
  create / edit / quick   │  POST   /api/community/open-loops           │        │
  action (fetch, JSON)    │  PATCH  /api/community/open-loops/[id]      │        │
  ───────────────────────▶│   └─ requireAuth(request) ─ 401 | null      │        │
                          │   └─ parse+validate body ─ 400              │        │
                          │   └─ getOpenLoops() → mutate array → ───────┼────────┘ saveOpenLoops()
                          │        saveOpenLoops()                       │
   { ...loop } 200/201    │   └─ return NextResponse.json(loop)         │
  ◀───────────────────────┤                                             │
  router.refresh() ──────▶│  re-run layout + page (Server) → fresh board│
                          └─────────────────────────────────────────────┘
```

Data flow for the primary use case (open the cockpit): request → layout auth gate → page Server Component reads the whole JSON document → `groupLoopsByUrgency` splits it into 4 arrays → client `<Cockpit>` renders 3 columns + collapsed "Sin fecha" → done. No loading state, no client fetch on first paint.

## Standard Stack

### Core — all already in `package.json`, no installs required

| Library | Version (package.json) | Purpose | Why Standard (here) |
|---------|------------------------|---------|---------------------|
| `next` | `16.2.4` (exact) | App Router, Route Handlers, `layout.tsx` auth gate, `redirect`, `cookies` | The app framework. |
| `react` / `react-dom` | `19.2.4` (exact) | Server + Client Components | — |
| `@vercel/blob` | `^2.4.1` | Private JSON persistence in production | Every existing store uses it; `versions-store.ts` is the template. |
| `date-fns` | `^4` | `differenceInCalendarDays` for the 14-day window + relative-date math | Already a dependency; used by the dashboard. Avoids hand-rolled date math. |
| `lucide-react` | `^0.500` | Icons (`Check`, `Clock`/`PauseCircle`, `CalendarClock`, `Plus`, `X`, `PanelLeft`) | Repo-standard icon set. |
| `framer-motion` | `^12.40.0` | `FadeUp` board mount (`app/components/FadeUp.tsx` exists) + slide-over transform transition | Repo-standard; reuse `FadeUp`, don't hand-roll. |
| `tailwindcss` / `@tailwindcss/postcss` | `^4` | Styling via inline utility classes, tokens in `app/globals.css` | No `tailwind.config.js`; `--cta-accent` / `--background` already defined. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/font/google` (Geist, Geist Mono) | bundled | Fonts | Already wired in root `app/layout.tsx` as `--font-geist-sans` / `--font-mono`; inherited. |
| Node `fs` (`readFileSync`/`writeFileSync`) + `path` `join` | Node builtin | Local-mode store fallback | Inside `open-loops-store.ts` only, exactly as `versions-store.ts`. |
| `crypto.randomUUID()` | Node global | OpenLoop `id` | Already used at handler top-level in `app/api/cv/versions/route.ts`. |
| `node:test` (`node --test`) | Node builtin | Optional unit test for `urgency.ts` | See Validation section — lightest possible, zero new deps. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff / Why NOT here |
|------------|-----------|------------------------|
| Route Handlers for mutations | Server Actions (`"use server"`) — fully supported in Next 16 | **PLAT-02 mandates `/api/community/*` routes with `requireAuth()`** and success criterion 4 tests a route rejecting a bad token. Server Actions also can't be probed by an external POST test the same way. Stick to Route Handlers + the existing `fetch()` + `router.refresh()` loop (SyncButton pattern). |
| `router.refresh()` after mutation | `revalidatePath('/community-president')` / `updateTag` | Those APIs are for **cached** routes. This project has no `cacheComponents` and the layout's `cookies()` call makes the segment dynamic — there is nothing to revalidate. `router.refresh()` re-runs the Server Component tree and is the established repo pattern. |
| Hand-rolled `Date` arithmetic | `date-fns` `differenceInCalendarDays` | `date-fns` is already installed; calendar-day (not 24h) semantics matter for D-03. |
| A component library (shadcn/Radix) | inline Tailwind utilities | Repo convention (CONVENTIONS.md, UI-SPEC "Registry Safety": none). `shadcn_initialized: false`. Do not add one. |
| A real DB (Neon/Postgres) | Vercel Blob JSON | PROJECT.md constraint: "No database in v1." The single-writer constraint only breaks at the neighbour portal (v2). |
| `zod` for body validation | hand-written type guards | Not a dependency; repo validates inline (`Record<string, unknown>` + narrowing). Adding `zod` is scope creep — write small explicit guards. (If the planner wants schema validation, that is a deliberate new-dependency decision requiring a `checkpoint:human-verify`.) |

**Installation:** none. `npm install` only needs to have been run once in the app directory (see Environment Availability — note the `node_modules` location quirk).

## Package Legitimacy Audit

> This phase installs **no external packages**. Every library used is already present in `package.json` with a committed `package-lock.json`.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| next `16.2.4` | npm | mature | very high | github.com/vercel/next.js | OK (pre-existing) | Approved — no change |
| react / react-dom `19.2.4` | npm | mature | very high | github.com/facebook/react | OK (pre-existing) | Approved — no change |
| @vercel/blob `^2.4.1` | npm | mature | high | github.com/vercel/storage | OK (pre-existing) | Approved — no change |
| date-fns `^4` | npm | mature | very high | github.com/date-fns/date-fns | OK (pre-existing) | Approved — no change |
| lucide-react `^0.500` | npm | mature | high | github.com/lucide-icons/lucide | OK (pre-existing) | Approved — no change |
| framer-motion `^12.40.0` | npm | mature | very high | github.com/motiondivision/motion | OK (pre-existing) | Approved — no change |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.
**New packages requiring a `checkpoint:human-verify`:** none — unless the planner elects to add `zod` (then: gate it).

## Architecture Patterns

### Recommended Project Structure

```
app/
├── community-president/
│   ├── layout.tsx              # async Server Component: await cookies() → strict check → redirect;
│   │                           #   renders <CommunitySidebar/> + <main>; export const metadata
│   └── page.tsx                # async Server Component: getOpenLoops() → <Cockpit loops={loops}/>
├── components/
│   └── community/              # NEW directory (does not exist yet)
│       ├── CommunitySidebar.tsx    # "use client" (usePathname/logout) — mirrors dashboard/Sidebar.tsx, neutral palette
│       ├── Cockpit.tsx             # "use client" — owns slide-over + optimistic state, calls groupLoopsByUrgency
│       ├── LoopColumn.tsx          # presentational (bucket header + count + scroll body)
│       ├── LoopCard.tsx            # presentational — title + relative-date pill + owner chip + quick actions
│       ├── QuickActions.tsx        # "use client" — 3 icon buttons (done / waiting / bump due)
│       ├── LoopSlideOver.tsx       # "use client" — create/edit form panel, focus trap, Esc/backdrop close
│       ├── NoDateSection.tsx       # collapsed <details>-style "Sin fecha" section
│       ├── CountStrip.tsx          # "X vencidos · Y vencen pronto · Z a la espera" (Spanish plural)
│       └── EmptyState.tsx          # first-run explainer + "Añadir tu primer bucle"
├── api/
│   └── community/
│       └── open-loops/
│           ├── route.ts            # GET (list), POST (create)
│           └── [id]/
│               └── route.ts        # PATCH (edit + quick actions).  await ctx.params (async in v16)
lib/
├── community/
│   ├── open-loops-store.ts     # copy of lib/cv/versions-store.ts, renamed
│   ├── require-auth.ts         # strict cookie check → NextResponse(401) | null
│   ├── urgency.ts              # PURE: groupLoopsByUrgency(loops, now) + sort comparators
│   ├── relative-date.ts        # PURE: formatRelativeDue(dueYmd, now) → Spanish string (UI-SPEC vocab)
│   ├── loop-defaults.ts        # PURE: applyCreateDefaults(body) / validateLoopInput(body)
│   └── urgency.test.ts         # OPTIONAL — node --test
└── types.ts                    # + "// ── Smart Community President ──" section: enums, OpenLoop, Submission
data/
└── community-open-loops.json   # NEW committed seed = []   (D-18: no demo data)
```

### Pattern 1: Auth-gated nested layout (PLAT-01)

```tsx
// app/community-president/layout.tsx
// Source: mirrors app/cv/layout.tsx (read verbatim 2026-09-08); cookies() is async in Next 16
//         (bundled docs: 01-app/02-guides/upgrading/version-16.md "Async Request APIs").
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CommunitySidebar from "@/app/components/community/CommunitySidebar";

export const metadata: Metadata = { title: "Presidente — Comunidad" };

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get("dashboard_auth")?.value;

  // NOTE the extra `!process.env.DASHBOARD_TOKEN` guard — see Pitfall 1 (fail-open hole).
  if (!token || !process.env.DASHBOARD_TOKEN || token !== process.env.DASHBOARD_TOKEN) {
    redirect("/dashboard/login");
  }

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <CommunitySidebar />
      <main className="flex-1 min-w-0 md:ml-60">{children}</main>
    </div>
  );
}
```

- `redirect()` throws `NEXT_REDIRECT` — call it **outside** any `try/catch` (bundled docs `redirect.md` line 50-52). In a layout there is no try/catch, so this is fine as written.
- Reading `cookies()` makes `/community-president/*` **dynamically rendered** — exactly what we want (board always fresh).
- Do **not** render `<html>`/`<body>` — the root `app/layout.tsx` owns those; this is a nested layout (bundled docs `03-layouts-and-pages.md`).

### Pattern 2: Shared strict auth helper (PLAT-02)

```ts
// lib/community/require-auth.ts
// Source: extracted from app/api/dashboard/contracts-chat/route.ts lines 60-63 (the strict form).
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Returns a 401 NextResponse to return early, or null when the request is authorised. */
export function requireAuth(request: NextRequest): NextResponse | null {
  const token = request.cookies.get("dashboard_auth")?.value;
  if (!token || !process.env.DASHBOARD_TOKEN || token !== process.env.DASHBOARD_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
```

```ts
// usage at the top of every app/api/community/*/route.ts handler
export async function POST(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;
  // ... parse body in try/catch → 400, do work in try/catch → 500
}
```

- `request.cookies.get()` on `NextRequest` is **synchronous** (it is not the `next/headers` `cookies()` async API). This matches every existing route.

### Pattern 3: Dual-mode JSON store (LOOP-01 / LOOP-04)

```ts
// lib/community/open-loops-store.ts
// Source: verbatim structural copy of lib/cv/versions-store.ts (read 2026-09-08).
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { get, put } from "@vercel/blob";
import type { OpenLoop } from "@/lib/types";

const BLOB_PATHNAME = "community-open-loops.json";
const LOCAL_PATH = join(process.cwd(), "data/community-open-loops.json");

export async function getOpenLoops(): Promise<OpenLoop[]> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      // useCache: false — stable pathname would otherwise serve the pre-write CDN copy.
      const result = await get(BLOB_PATHNAME, { access: "private", useCache: false });
      if (result) return JSON.parse(await new Response(result.stream).text()) as OpenLoop[];
    } catch {
      // fall through to local
    }
  }
  try {
    return JSON.parse(readFileSync(LOCAL_PATH, "utf-8"));
  } catch {
    return [];
  }
}

export async function saveOpenLoops(loops: OpenLoop[]): Promise<void> {
  const json = JSON.stringify(loops, null, 2);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(BLOB_PATHNAME, json, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } else {
    writeFileSync(LOCAL_PATH, json);
  }
}
```

- `data/community-open-loops.json` must be **created and committed** containing exactly `[]` (D-18, and so `getOpenLoops()` local-mode read succeeds in dev).
- **Do NOT** copy any `@vercel/blob` doc example that uses `access: "public"` — PROJECT.md notes this regressed silently once.

### Pattern 4: Mutation Route Handler (whole-file rewrite)

```ts
// app/api/community/open-loops/route.ts  (GET list + POST create)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/community/require-auth";
import { getOpenLoops, saveOpenLoops } from "@/lib/community/open-loops-store";
import { validateLoopInput, applyCreateDefaults } from "@/lib/community/loop-defaults";
import type { OpenLoop } from "@/lib/types";

export async function GET(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;
  return NextResponse.json(await getOpenLoops());
}

export async function POST(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const err = validateLoopInput(body, { create: true }); // checks title + kind + next_action + enum membership + length caps
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    const now = new Date().toISOString();
    const loop: OpenLoop = {
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      ...applyCreateDefaults(body as Record<string, unknown>), // status:"open", owner:"me", source:"manual"
    };
    const loops = await getOpenLoops();
    loops.push(loop);
    await saveOpenLoops(loops);
    return NextResponse.json(loop, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Failed to save loop: ${msg}` }, { status: 500 });
  }
}
```

```ts
// app/api/community/open-loops/[id]/route.ts  (PATCH edit + quick actions)
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/community/open-loops/[id]">) {
  const denied = requireAuth(request);
  if (denied) return denied;
  const { id } = await ctx.params;              // params is a Promise in Next 16

  let patch: unknown;
  try { patch = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const err = validateLoopInput(patch, { create: false });
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    const loops = await getOpenLoops();
    const i = loops.findIndex((l) => l.id === id);
    if (i === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    loops[i] = { ...loops[i], ...(patch as Partial<OpenLoop>), id, updated_at: new Date().toISOString() };
    await saveOpenLoops(loops);
    return NextResponse.json(loops[i]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Failed to update loop: ${msg}` }, { status: 500 });
  }
}
```

- `RouteContext<'/api/community/open-loops/[id]'>` is a **globally available generated type** (Next 16, generated by `next dev`/`next build`/`next typegen`) — bundled docs `15-route-handlers.md` line 187-198. If typegen has not run, fall back to `{ params }: { params: Promise<{ id: string }> }`.
- Quick actions (D-12) are just PATCH bodies: `{ status: "done" }`, `{ status: "waiting_on_other" }`, `{ due: "<newYmd>" }`. No separate endpoints needed.

### Pattern 5: Client mutation + refresh (mirrors `SyncButton.tsx`)

```tsx
// inside app/components/community/Cockpit.tsx ("use client")
const router = useRouter();
async function mutate(url: string, method: "POST" | "PATCH", body: unknown) {
  setPending(true);
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { setError("No se ha podido guardar el bucle. Revisa tu conexión e inténtalo de nuevo."); return; }
    router.refresh();               // re-runs the Server Component tree → fresh board
    closeSlideOver();
  } catch {
    setError("No se ha podido guardar el bucle. Revisa tu conexión e inténtalo de nuevo.");
  } finally {
    setPending(false);
  }
}
```

- Optional: optimistic update the local `loops` state before `router.refresh()` for snappier UX (UI-SPEC "only the affected card enters a disabled/pending state").

### Pattern 6: The urgency function (LOOP-04, D-01…D-07)

```ts
// lib/community/urgency.ts — PURE, isomorphic, no imports from next/* or fs
import { differenceInCalendarDays } from "date-fns";
import type { OpenLoop } from "@/lib/types";

export interface GroupedLoops {
  overdue: OpenLoop[];
  dueSoon: OpenLoop[];
  waiting: OpenLoop[];
  noDate: OpenLoop[];
  counts: { overdue: number; dueSoon: number; waiting: number };
}

const HIDDEN = new Set<OpenLoop["status"]>(["done", "dropped"]); // D-07
const DUE_SOON_DAYS = 14;                                        // D-03

const byDueAsc = (a: OpenLoop, b: OpenLoop) => (a.due ?? "").localeCompare(b.due ?? "");
const byUpdatedDesc = (a: OpenLoop, b: OpenLoop) => b.updated_at.localeCompare(a.updated_at);

export function groupLoopsByUrgency(loops: OpenLoop[], now: Date = new Date()): GroupedLoops {
  const overdue: OpenLoop[] = [], dueSoon: OpenLoop[] = [], waiting: OpenLoop[] = [], noDate: OpenLoop[] = [];

  for (const loop of loops) {
    if (HIDDEN.has(loop.status)) continue;                  // D-07: done/dropped never shown
    if (!loop.due) { noDate.push(loop); continue; }         // D-05: no due date → its own section

    const days = differenceInCalendarDays(parseYmd(loop.due), now);
    if (days < 0) overdue.push(loop);                       // D-02: past due → Overdue (regardless of owner)
    else if (days <= DUE_SOON_DAYS) dueSoon.push(loop);     // D-03: 0..14 calendar days
    else waiting.push(loop);                                // D-01/D-04: everything else with a date
  }

  overdue.sort(byDueAsc);      // D-06: oldest due first (most overdue at top)
  dueSoon.sort(byDueAsc);      // D-06: soonest first
  waiting.sort(byDueAsc);      // D-06: by date
  noDate.sort(byUpdatedDesc);  // D-06: most recently updated first

  return { overdue, dueSoon, waiting, noDate,
           counts: { overdue: overdue.length, dueSoon: dueSoon.length, waiting: waiting.length } };
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);   // local midnight; pairs with a `now` in the same runtime TZ
}
```

**Interpretation notes the planner must know (this is where D-02 / D-04 have a wording ambiguity — see Open Questions):**
- The three buckets are treated as a **disjoint priority cascade** (Overdue → Due-soon → Waiting-on-others → No date). This is the only reading consistent with the D-17 count strip (`X · Y · Z` reads as broken if the sets overlap) and with D-01 saying "three buckets… plus No date set".
- D-04's `status == waiting_on_other OR owner != me` and D-02's "carries a tag showing who it is waiting on" are implemented as a **visual treatment** (the owner chip on the card, D-16), not as extra column membership. The owner chip already tells Nicola who each loop waits on, in whatever column it sits.
- `blocked` loops keep their `due` date logic (they land in Overdue / Due-soon / Waiting / No date by date), which naturally puts most of them alongside Waiting-on-others. This satisfies D-07's "confirm in planning".
- The "Waiting-on-others" column therefore also holds the rare dated, far-future, owner-is-me, still-open loop. In practice Nicola only sets a `due` on things he needs to chase, so this is acceptable; it guarantees **no loop ever disappears from the board**.

### Anti-Patterns to Avoid

- **Server Actions for the CRUD.** PLAT-02 + success criterion 4 require testable `/api/community/*` routes. (Next 16 supports Server Actions; this project's locked decision does not use them here.)
- **`revalidatePath` / `revalidateTag` / `updateTag`.** No `cacheComponents` in this project — nothing is cached; `router.refresh()` is the mechanism.
- **Reading `data/community-open-loops.json` via a static `import`** in a route/page. ARCHITECTURE.md flags this exact anti-pattern — it captures a build-time snapshot, not live Blob state. Always go through `getOpenLoops()`.
- **Inheriting `DashboardShell` / the `stone-*` palette / the dashboard's zero mobile support.** UI-SPEC is explicit: portfolio `neutral-*` on `#fafafa`, mobile required.
- **`dangerouslySetInnerHTML`** anywhere — `title` / `next_action` / `owner_detail` are free text; render as text, React escapes.
- **Hard delete.** D-10 + UI-SPEC: "Descartar" sets `status = "dropped"`; there is no DELETE endpoint in Phase 1.
- **Rendering `<html>`/`<body>` in the community layout** — nested layout, root owns the document.
- **Blocking the board on a client fetch / adding a skeleton** — the page is a Server Component that reads the store directly (UI-SPEC "loading | board first paint" = covered, no skeleton).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar-day difference for the 14-day window | `Math.floor((a-b)/86400000)` | `date-fns` `differenceInCalendarDays` | DST / partial-day / month-boundary correctness; already installed. |
| Blob-or-local persistence fork | a new storage abstraction | copy `lib/cv/versions-store.ts` | Battle-tested; `useCache:false` / `addRandomSuffix:false` / `allowOverwrite:true` are load-bearing and easy to get wrong. |
| Strict cookie auth check | a fresh comparison per route | `lib/community/require-auth.ts` (one helper) | Consistency + the fail-open hole (Pitfall 1) gets fixed once. |
| Slide-over enter/exit animation | manual `setTimeout` + class toggling | `framer-motion` (already a dep) + respect `prefers-reduced-motion` | UI-SPEC mandates the transform transition + reduced-motion. |
| Board mount animation | new IntersectionObserver code | the existing `app/components/FadeUp.tsx` wrapper | Repo-standard, UI-SPEC references it by name. |
| Icons | inline SVG paths | `lucide-react` | Repo standard. |
| Relative-date phrasing | ad-hoc string building scattered in JSX | one pure `formatRelativeDue(dueYmd, now)` in `lib/community/relative-date.ts` | UI-SPEC fixes the exact Spanish vocabulary ("hace {n} días", "vence hoy", "vencía ayer", …) — centralise + testable. |
| Focus trap in the slide-over | custom keydown handling | small, but if desired, follow the WAI-ARIA dialog pattern; no library needed for one panel | UI-SPEC: "Slide-over traps focus while open and restores it to the trigger on close." |

**Key insight:** This phase should produce almost no "clever" code. Every hard part (persistence, auth, dates, animation) already has a repo-blessed answer. The reviewable novelty is `urgency.ts` + the type definitions + the Spanish UI.

## Runtime State Inventory

**Not applicable — this is a greenfield surface, not a rename/refactor/migration.** No existing stored data, live-service config, OS-registered state, secrets, or build artifacts reference anything this phase changes. The one new env-var dependency (`DASHBOARD_TOKEN`) is pre-existing and shared with the dashboard/CV surfaces; this phase adds a *stricter consumer* of it but does not rename or rotate it.

New persistent state introduced: one Blob object `community-open-loops.json` (prod) / `data/community-open-loops.json` (dev seed = `[]`). If the JSON should be mirrored back to git like the CV stores, add its getter to a `/api/community/export` route and `scripts/sync-context.sh` — **optional, can defer** (CONTEXT "Integration Points").

## Common Pitfalls

### Pitfall 1: The layout auth check can fail **open** when `DASHBOARD_TOKEN` is unset
**What goes wrong:** `app/cv/layout.tsx` does `if (token !== process.env.DASHBOARD_TOKEN) redirect(...)`. If the env var is missing, `process.env.DASHBOARD_TOKEN` is `undefined`; a visitor with no cookie has `token === undefined`; `undefined !== undefined` is `false` → **no redirect, surface loads unauthenticated.**
**Why it happens:** the login route (`app/api/auth/route.ts` line 12) falls back to a random UUID cookie when `DASHBOARD_TOKEN` is unset, and the strict route check then fails *closed* — but the *layout* check fails *open*.
**How to avoid:** in both `layout.tsx` and `require-auth.ts`, require the env var explicitly: `if (!token || !process.env.DASHBOARD_TOKEN || token !== process.env.DASHBOARD_TOKEN) …`. And treat "`DASHBOARD_TOKEN` set in every environment (local `.env`, Vercel Preview, Vercel Production)" as a **release checklist item** (STATE.md already lists this as a blocker).
**Warning signs:** the cockpit renders for a logged-out browser; `/api/community/open-loops` returns `401` while the page does not redirect (the mismatch is the tell).

### Pitfall 2: `cookies()` / `params` used synchronously
**What goes wrong:** `cookies().get(...)` or `params.id` without `await` — worked in Next 14, **removed in Next 16** (bundled `version-16.md` "Async Request APIs (Breaking change)").
**How to avoid:** `(await cookies()).get("dashboard_auth")`; `const { id } = await ctx.params`. Note `request.cookies.get()` on `NextRequest` inside a Route Handler stays **sync** — don't confuse the two.
**Warning signs:** TS error "Property 'get' does not exist on type 'Promise<ReadonlyRequestCookies>'"; runtime "cookies() should be awaited".

### Pitfall 3: `redirect()` inside a `try/catch`
**What goes wrong:** `redirect()` works by throwing `NEXT_REDIRECT`; a `catch` swallows it and the redirect silently doesn't happen (bundled `redirect.md` line 50-52).
**How to avoid:** call `redirect()` at the top level of the layout/page, never inside try/catch. (The layout pattern above is already correct.)

### Pitfall 4: Static `import` of the seed JSON
**What goes wrong:** `import loops from "@/data/community-open-loops.json"` in the page or route bakes the empty array in at build time; created loops never appear.
**How to avoid:** always `await getOpenLoops()`. ARCHITECTURE.md "Anti-Patterns" documents this having bitten the dashboard.

### Pitfall 5: Timezone drift on the day boundary
**What goes wrong:** Vercel runs Node in **UTC**; Nicola is in **Europe/Madrid** (UTC+1/+2). A loop due "today" in Madrid can read as "yesterday" (overdue) or vice-versa for a couple of hours around midnight.
**Why it happens:** `differenceInCalendarDays(parseYmd(due), new Date())` compares calendar days in the runtime's timezone.
**How to avoid (v1-acceptable):** store `due` as a plain `"YYYY-MM-DD"` string (no time). Accept the ≤2h edge fuzz for a single-user tool — document it. If it ever matters, compute "today" in `Europe/Madrid` via `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date())` and compare `YYYY-MM-DD` strings lexically (`due < today` = overdue). The repo's existing pattern (`app/api/dashboard/contracts-chat/route.ts` line 93: `new Date().toISOString().slice(0, 10)`) is UTC — consistent, and fine to match.
**Warning signs:** a loop flips between "vence hoy" and "vencía ayer" depending on time of day.

### Pitfall 6: Unbounded Blob growth / large request bodies
**What goes wrong:** every write rewrites the whole JSON; free-text fields with no cap let the document (and each request) grow without limit. Single file, no pagination.
**How to avoid:** server-side length caps in `validateLoopInput` — e.g. `title` ≤ 200, `next_action` ≤ 2000, `owner_detail` ≤ 200; reject non-object / array bodies; reject unknown `kind`/`status`/`owner`/`source` values (enum allow-lists). This is also the V5 (input validation) control.
**Warning signs:** slow board loads; Blob object > a few hundred KB.

### Pitfall 7: Enum drift between `lib/types.ts`, the form, the validator, and the UI labels
**What goes wrong:** four places encode the same locked vocabulary (D-10); one gets out of sync and a value round-trips as a broken chip or fails validation.
**How to avoid:** define the unions **once** in `lib/types.ts` and derive allow-list `Set`s + label maps from `Object.keys` of a single `const` label record per enum. UI-SPEC already gives the exact Spanish labels — encode them as that one record.

### Pitfall 8: `node_modules` is not in the app directory
**What goes wrong:** `Personal_brand/Personal_brand/` (where `package.json`, `.planning/`, and all app code live) has **no `node_modules/`**; it exists one level up at `Personal_brand/node_modules/`. `npm run dev` / `next` / `tsc` / `eslint` will fail from the app dir until deps are installed there.
**How to avoid:** run `npm install` in `Personal_brand/Personal_brand/` (the dir containing `package-lock.json`) before development / verification. Flag for the human if the nesting is unintentional.

## Code Examples

### OpenLoop + Submission types (add to `lib/types.ts` under a new banner)

```ts
// ── Smart Community President ──────────────────────────────────────────────

export type OpenLoopKind = "commitment" | "incidencia" | "obra" | "follow_up" | "permiso";       // D-10
export type OpenLoopStatus = "open" | "waiting_on_other" | "blocked" | "done" | "dropped";        // D-10
export type OpenLoopOwner = "me" | "neighbour" | "administrador" | "provider" | "junta";          // D-10
export type OpenLoopSource = "acta" | "email" | "manual" | "neighbour_form";                      // PLAT-03

export interface OpenLoop {
  id: string;
  title: string;
  kind: OpenLoopKind;
  status: OpenLoopStatus;          // default "open"
  owner: OpenLoopOwner;            // default "me"
  owner_detail?: string;           // shown only when owner is "neighbour" | "provider" (D-11)
  next_action: string;             // required to create (D-09)
  due?: string | null;             // "YYYY-MM-DD" soft deadline, optional (D-09)
  source: OpenLoopSource;          // default "manual"; already accepts "neighbour_form" (PLAT-03 / SC-5)
  source_ref?: string;             // link/id to originating acta or email thread
  created_at: string;              // ISO 8601
  updated_at: string;              // ISO 8601

  // ── LPH-aware fields — declared optional now, populated by Phase 3, rendered by neither Phase 1 nor 2.
  //    (Claude's Discretion resolved: declare now so Phase 3 adds behaviour, not shape.)
  acuerdo_id?: string;
  acta_date?: string;
  majority_type?: "simple" | "doble_simple" | "tres_quintos" | "simple_total" | "un_tercio" | "unanimidad";
  majority_achieved?: boolean;
  ejecutividad_date?: string;
  impugnacion_deadline?: string;
  ausentes_notified_at?: string;
  budget_annual?: number;
  mensualidad_ordinaria?: number;
}

/**
 * Neighbour-portal intake shape (v2). Defined now — empty of president-internals —
 * so PLAT-03 / success-criterion-5 hold: NO LPH data, owner routing, or presupuestos here.
 * An OpenLoop is later created FROM a Submission with `source: "neighbour_form"`.
 */
export interface Submission {
  id: string;
  submitter_name: string;
  submitter_unit: string;
  description: string;
  photos?: string[];
  status: "triage";
  created_at: string;
}
```

### Count strip Spanish pluralisation (D-17 / UI-SPEC)

```ts
// lib/community/relative-date.ts (or a count helper)
const strip = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export const countStrip = (c: { overdue: number; dueSoon: number; waiting: number }) =>
  `${strip(c.overdue, "vencido", "vencidos")} · ${strip(c.dueSoon, "vence pronto", "vencen pronto")} · ${strip(c.waiting, "a la espera", "a la espera")}`;
```

### Relative due date (UI-SPEC vocabulary, pure + testable)

```ts
import { differenceInCalendarDays } from "date-fns";
export function formatRelativeDue(dueYmd: string, now: Date = new Date()): string {
  const [y, m, d] = dueYmd.split("-").map(Number);
  const days = differenceInCalendarDays(new Date(y, m - 1, d), now);
  if (days <= -2) return `hace ${Math.abs(days)} días`;
  if (days === -1) return "vencía ayer";
  if (days === 0) return "vence hoy";
  if (days === 1) return "vence mañana";
  return `vence en ${days} días`;            // 2..14 (and beyond, in the Waiting column)
}
```

## State of the Art

| Old Approach (your training data / Next 14-15) | Current Approach (Next.js 16.2.4) | When Changed | Impact on this phase |
|--------------|------------------|--------------|----------------------|
| `cookies()`, `headers()`, `params`, `searchParams` sync-accessible | **async only** — sync removed | v16 | Every access must `await`. `app/cv/layout.tsx` already does. |
| `middleware.ts` + `middleware` export, edge runtime | renamed to `proxy.ts` / `proxy` export, node runtime only | v16 | Not used this phase (per-route checks + layout gate). Don't add one. |
| `revalidateTag('x')` | `revalidateTag('x', 'max')` (2nd arg required) | v16 | Not used — no `cacheComponents`. |
| `next lint` / `eslint` run by `next build` | `next lint` removed; run ESLint directly; `build` doesn't lint | v16 | `package.json` already has `"lint": "eslint"`. No CI gate — run `npm run lint` + `npx tsc --noEmit` manually before push. |
| `--turbopack` flag needed | Turbopack is the default for `dev` and `build` | v16 | `next.config.ts` uses top-level `turbopack: { root: "." }` (already migrated). |
| `experimental.ppr` / `dynamicIO` | `cacheComponents` flag (opt-in) | v16 | **Not enabled here.** "Previous" caching model applies: Route Handlers uncached; `cookies()` ⇒ dynamic page. |
| `unstable_cacheLife` / `unstable_cacheTag` | stable `cacheLife` / `cacheTag` | v16 | N/A this phase. |

**Deprecated / outdated — do not use:**
- `next/legacy/image`, `images.domains`, `serverRuntimeConfig`/`publicRuntimeConfig`, AMP — all removed in v16 (irrelevant here, listed for completeness).
- Any "App Router auth via `middleware.ts`" tutorial — this project deliberately uses per-route + per-layout checks and defers `middleware`/`proxy` (CONTEXT "Deferred").

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The D-02 "show in both" / D-04 OR-condition are satisfied by the owner **chip** (visual treatment), not by a loop appearing in two columns; buckets are a disjoint priority cascade. | Pattern 6 / Open Questions | Medium — if Nicola expects an overdue-and-waiting loop to literally appear in both the Vencidos and "A la espera" columns, the grouping function and the count strip need rework. Recommended: confirm in `/gsd-discuss` or first UAT. |
| A2 | A dated, far-future, `owner: "me"`, `open` loop belonging in the "Waiting-on-others" column is acceptable (guarantees no loop disappears). | Pattern 6 | Low — cosmetic; the column label slightly overclaims. Alternative is a 4th visible column, which D-01/D-13 forbid. |
| A3 | `due` stored as `"YYYY-MM-DD"` string (no time component). | Types / Pitfall 5 | Low — this is a design recommendation; if the planner stores full ISO timestamps the urgency math still works but Pitfall 5 worsens. |
| A4 | LPH-aware fields declared optional on `OpenLoop` now (not deferred to Phase 3). | Types | Low — UI-SPEC already recommends this; worst case is a few unused optional fields. |
| A5 | `date-fns` v4 exports `differenceInCalendarDays` with the same signature as v2/v3. | multiple | Very low — stable since v1; `date-fns` v4 is a dependency. Verify with `npm ls date-fns` after install. |
| A6 | `RouteContext<'/...'>` global type is available (typegen has run). Fallback `{ params: Promise<{id:string}> }` documented. | Pattern 4 | Very low — fallback is trivial. |
| A7 | The `node_modules` nesting (`Personal_brand/node_modules` vs app dir) is a local environment quirk, not an intentional monorepo layout. | Environment Availability | Low — worst case the dev runs `npm install` in the "wrong" place; flagged for human. |
| A8 | No new npm dependency is wanted (no `zod`). | Standard Stack | Low — if schema validation is desired later, it's an explicit gated decision. |

## Open Questions

1. **Does an overdue loop that is also "waiting on someone else" appear in the Vencidos column only, or in both Vencidos and "A la espera de otros"?**
   - What we know: D-02 says "appears in Overdue even when the next move is someone else's… ('show in both')"; D-04 defines the waiting condition; D-17's count strip `X · Y · Z` implies disjoint sets; D-01/D-13 say exactly three columns.
   - What's unclear: whether "show in both" means "both the Overdue column and the waiting *tag*" (this research's reading, A1) or literal dual-column membership.
   - Recommendation: implement the disjoint cascade + owner chip (A1). Surface this one line to Nicola at first UAT ("your overdue loops that are waiting on the administrador — you see them in Vencidos with an 'Administrador' chip, not also under 'A la espera' — OK?"). If he wants dual-listing, `groupLoopsByUrgency` changes to push into multiple arrays and the count strip switches to "unique loops" wording.

2. **Where exactly do `blocked`-status loops sit?** (D-07 says "confirm in planning".)
   - Recommendation: no special-casing — `blocked` loops flow through the same date logic as any other, which puts dated ones next to Waiting-on-others and dateless ones in "Sin fecha". If Nicola wants all `blocked` loops forced into "A la espera" regardless of date, add one line: `if (loop.status === "blocked" && days >= 0) → waiting`.

3. **Should the OpenLoop JSON be mirrored back to git** (like the CV stores via `scripts/sync-context.sh` + `/api/cv/export`)?
   - Recommendation: defer. Not required by any Phase 1 success criterion. Add later if git-visible history of loops becomes useful.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/dev/runtime | ✓ (local 25.7.0) | ≥ 20.9 required by Next 16 | — (Vercel provides ≥20.9) |
| npm + `package-lock.json` | dependency install | ✓ (lockfile present in app dir) | v3 lockfile | — |
| `node_modules/` in app dir (`Personal_brand/Personal_brand/`) | `next`, `tsc`, `eslint`, `date-fns`, etc. | ✗ (present only in parent `Personal_brand/`) | — | Run `npm install` in the app dir. **Blocks dev/verify until done.** |
| Bundled Next.js docs (`node_modules/next/dist/docs/`) | AGENTS.md mandate | ✓ (read from `../node_modules/next/dist/docs/`, v16.2.4) | 16.2.4 | — |
| `DASHBOARD_TOKEN` env var | layout gate + `requireAuth()` (strict `===`) | ✗ locally by default (`.env` gitignored) | — | **No fallback — fails closed on `/api/community/*`, and MUST be set to avoid the layout fail-open hole (Pitfall 1).** Set in local `.env`, Vercel Preview, Vercel Production. |
| `DASHBOARD_PASSWORD` env var | login route (existing) | (existing) | — | Unchanged by this phase. |
| `BLOB_READ_WRITE_TOKEN` env var | production persistence | auto-injected by Vercel when Blob store linked | — | Absent ⇒ store uses `data/community-open-loops.json` (dev). Works offline. |
| Vercel Blob store (private) | production OpenLoop persistence | assumed linked (CV/dashboard already use it) | @vercel/blob ^2.4.1 | Local JSON file. |

**Missing dependencies with no fallback:**
- `DASHBOARD_TOKEN` must be set in every environment before this surface ships (existing project blocker; now also a fail-open risk — Pitfall 1).

**Missing dependencies with fallback:**
- `node_modules` in the app dir → `npm install` there.
- `BLOB_READ_WRITE_TOKEN` locally → local JSON store (intended dev behaviour).

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: high`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control (this phase) |
|---------------|---------|-------------------------------|
| V1 Architecture | yes | Single trust boundary: the `dashboard_auth` httpOnly cookie. Every `/api/community/*` handler calls `requireAuth()` as its first line; the surface layout re-checks. No new secrets. |
| V2 Authentication | partial | Reuses the existing shared-secret login (`DASHBOARD_PASSWORD` → `DASHBOARD_TOKEN` cookie). This phase does not change auth; it adds a *stricter* consumer. Known weakness (plaintext password compare, static token) is explicitly out of scope (REQUIREMENTS "Out of Scope": `/api/cv/*` weak-auth cleanup). |
| V3 Session Management | partial | Cookie: `httpOnly`, `secure` in prod, `sameSite:"lax"`, `path:"/"`, 30-day `maxAge` — set by the existing `app/api/auth` route, unchanged. `sameSite:"lax"` + no state-changing `GET` = acceptable CSRF posture for a single-user tool; mutations are `POST`/`PATCH` with `Content-Type: application/json` (not simple form posts). |
| V4 Access Control | yes | `requireAuth()` on 100% of `/api/community/*` (success criterion 4). Layout `redirect()` for the pages. Fix the fail-open hole (Pitfall 1). No per-object authz needed — single user owns all loops. |
| V5 Input Validation | yes | `validateLoopInput`: reject non-object/array bodies; enum allow-lists for `kind`/`status`/`owner`/`source`; length caps (`title` ≤ 200, `next_action` ≤ 2000, `owner_detail` ≤ 200); `due` must match `/^\d{4}-\d{2}-\d{2}$/` or be null/absent; ignore/strip unknown keys on PATCH (or allow-list patchable fields). |
| V6 Cryptography | no | No crypto beyond `crypto.randomUUID()` for IDs. No hashing, no encryption at rest beyond Blob's private access. |
| V7 Error Handling & Logging | partial | Follow repo pattern: `catch` → `{ error: "<context>: " + message }` + 4xx/5xx; never leak stack traces to the client beyond `err.message`. No PII in logs (loop text may contain neighbour names — don't `console.log` bodies). |
| V13 API | yes | Route Handlers only; `GET` is read-only; `POST`/`PATCH` mutate; unsupported verbs auto-405 (Next default). Return `401` before any body parsing or store read. |

### Known Threat Patterns for {Next.js Route Handler + Blob JSON store, single-user}

| Pattern | STRIDE | Standard Mitigation (this phase) |
|---------|--------|---------------------------------|
| Unauthenticated access to `/api/community/*` (direct `curl`) | Spoofing / Elevation | `requireAuth()` strict `=== DASHBOARD_TOKEN` first line, before parse/IO (success criterion 4). |
| Layout auth fails open when `DASHBOARD_TOKEN` unset | Elevation | Explicit `!process.env.DASHBOARD_TOKEN` guard in layout + helper (Pitfall 1); env-var-set release checklist. |
| Stored XSS via `title` / `next_action` / `owner_detail` rendered later | Tampering | React text interpolation escapes by default; **no `dangerouslySetInnerHTML`**; no HTML rendering of loop fields. |
| Blob-document bloat / DoS via huge or many fields | Denial of Service | Length caps + object-shape validation in `validateLoopInput`; single-user so no rate limiting needed. |
| Enum / unexpected-value injection corrupting the board | Tampering | Enum allow-list `Set`s derived from the single label record; reject on mismatch. |
| Path traversal into the Blob store | Tampering | Pathname is a hard-coded constant (`"community-open-loops.json"`); no user input in any storage path. |
| Prototype pollution via `{ ...patch }` merge with `__proto__` | Tampering | PATCH merges only allow-listed keys, or guard `if (key === "__proto__" \|\| key === "constructor") reject`. Prefer explicit field allow-list. |
| Private Blob URL leakage | Information Disclosure | `access: "private"` + never hand a Blob URL to the browser (no PDFs this phase; relevant from Phase 2). |
| CSRF on `POST`/`PATCH` | Tampering | JSON `Content-Type` + `sameSite:"lax"` cookie + same-origin `fetch`; acceptable for v1 single-user. (A dedicated CSRF token is a v2 consideration alongside the neighbour portal.) |

**No `high`-severity blockers identified** provided `requireAuth()` is applied to every route and Pitfall 1's guard is added.

## Sources

### Primary (HIGH confidence — exact repo files read 2026-09-08)
- `lib/cv/versions-store.ts` — the store template (dual-mode fork, `useCache:false`, `addRandomSuffix:false`, `allowOverwrite:true`).
- `app/cv/layout.tsx` — the auth-gate layout pattern (async, `await cookies()`, strict `!==` compare, `redirect("/dashboard/login")`).
- `app/components/dashboard/AuthGuard.tsx` — identical gate as an inline component.
- `app/api/cv/versions/route.ts` — gated Route Handler (GET list + POST create), `crypto.randomUUID()`, error shape.
- `app/api/dashboard/contracts-chat/route.ts` — the **strict** cookie check (`!c?.value || c.value !== process.env.DASHBOARD_TOKEN`), `try/catch` JSON → 400, `MAX_HISTORY` trim, `new Date().toISOString().slice(0,10)` date pattern.
- `app/api/auth/route.ts` — cookie set options + the random-UUID fallback that causes the fail-open/fail-closed asymmetry.
- `app/components/dashboard/Sidebar.tsx` — sidebar structure to mirror (nav map, active state, logout via `DELETE /api/auth` + `router.push`).
- `app/components/dashboard/SyncButton.tsx` — client mutation pattern: `fetch` → branch on `res.ok` → `router.refresh()`.
- `app/dashboard/page.tsx` / `app/dashboard/layout.tsx` — Server Component reading a store directly; nested layout with `metadata`.
- `app/globals.css`, `DESIGN.md` — tokens (`--cta-accent #0f172a`, `--background #fafafa`, `neutral-*`).
- `next.config.ts` (top-level `turbopack`, `serverExternalPackages`; **no `cacheComponents`**), `package.json` (exact/floating versions), `.gitignore`, `.planning/config.json`.

### Primary (HIGH/MEDIUM confidence — bundled official Next.js 16.2.4 docs, `node_modules/next/dist/docs/`)
- `01-app/02-guides/upgrading/version-16.md` — Async Request APIs removal, `middleware`→`proxy`, Turbopack default, `revalidateTag` 2nd arg, PPR→`cacheComponents`, `next lint` removal.
- `01-app/01-getting-started/07-mutating-data.md` — Server Functions/Actions vs event-handler mutations, `router` refresh, `revalidatePath`/`redirect` placement.
- `01-app/01-getting-started/09-revalidating.md` + `08-caching.md` — Cache Components model (explicitly "if you're not using Cache Components, see the previous-model guide").
- `01-app/02-guides/caching-without-cache-components.md` — the model that actually applies here; `dynamic`/`revalidate` route config, Route Handlers uncached by default.
- `01-app/01-getting-started/15-route-handlers.md` — Route Handlers not cached by default; `RouteContext` helper; supported verbs / 405.
- `01-app/01-getting-started/03-layouts-and-pages.md` — nested layouts, `params` as Promise, `PageProps`/`LayoutProps`.
- `01-app/03-api-reference/04-functions/redirect.md` — `redirect()` throws `NEXT_REDIRECT`, call outside try/catch.
- `01-app/02-guides/authentication.md` — DIY auth is acceptable; per-request checks in every Server Function / Route Handler.

### Secondary (MEDIUM confidence)
- `.planning/notes/data-model-sketch.md`, `.planning/notes/exploration-findings.md` — `OpenLoop` field candidates, enum origin, `OpenLoop`/`Submission` split.
- `.planning/codebase/{STRUCTURE,CONVENTIONS,STACK,INTEGRATIONS,ARCHITECTURE}.md` — cross-checked against the source files above; all consistent.

### Tertiary (LOW confidence / not used)
- No web search performed. All external-provider flags are disabled in `.planning/config.json` and every question was answerable from the repo + bundled authoritative docs. `date-fns` v4 API signature (`differenceInCalendarDays`) is assumed stable from training knowledge (A5).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library is already in `package.json`; no new packages; templates read verbatim.
- Architecture / patterns: HIGH — all four core patterns are direct copies of working repo files; Next 16 behaviour cross-checked against the bundled docs the AGENTS.md mandate points to.
- Urgency logic (D-01…D-06): MEDIUM-HIGH — the function is fully specified, but D-02/D-04 contain a wording ambiguity resolved by a documented assumption (A1) that should be confirmed at first UAT.
- Pitfalls: HIGH — Pitfall 1 (fail-open) and Pitfalls 2-4 (async APIs, redirect, static import) are verified against source + docs; Pitfall 8 (node_modules) verified by filesystem inspection.
- Security: HIGH for the controls (they're concrete and code-level); the residual CSRF/shared-secret posture is a known, accepted v1 tradeoff per PROJECT.md.

**Research date:** 2026-09-08
**Valid until:** ~2026-10-08 for the Next.js 16 specifics (pin is exact `16.2.4`, low churn risk); indefinite for the repo-internal patterns until those files change.
