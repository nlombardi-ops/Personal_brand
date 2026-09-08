<!-- refreshed: 2026-09-08 -->
# Architecture

**Analysis Date:** 2026-09-08

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      Browser (App Router pages)              │
├──────────────────┬──────────────────┬───────────────────────┤
│  Public portfolio│   /dashboard/*   │      /cv/*            │
│  `app/page.tsx`  │ (finance, auth)  │  (CV builder, auth)  │
│                  │ `app/dashboard/` │  `app/cv/`           │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │ fetch()          │ fetch()            │ fetch()
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Route Handlers  `app/api/**/route.ts`           │
│   auth · dashboard/{sync,contracts-chat} · cv/{...15 routes} │
└──────┬───────────────────┬───────────────────┬──────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────────┐  ┌────────────────────┐
│ lib/*-store  │  │ lib/drive/*      │  │ @anthropic-ai/sdk  │
│ (persistence)│  │ (Google Drive)   │  │ (LLM calls)        │
└──────┬───────┘  └────────┬─────────┘  └────────────────────┘
       │                   │
       ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Vercel Blob (private, stable pathnames)  ⇄  data/*.json     │
│  prod: Blob is source of truth   dev: local data/*.json      │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Public portfolio | Static marketing site, section components | `app/page.tsx`, `app/components/*.tsx` |
| Finance dashboard | Bills/mortgage/insurance/contracts views + charts | `app/dashboard/`, `app/components/dashboard/` |
| CV builder | Job analysis → tailored CV/cover letter → PDF → history/stats | `app/cv/`, `app/components/cv/` |
| Route handlers | HTTP entry points, auth checks, orchestration | `app/api/**/route.ts` |
| Persistence stores | Read/write one JSON document each, Blob-or-local | `lib/cv/*-store.ts`, `lib/drive/sync.ts` |
| Drive integration | OAuth refresh, list/download files, parse bills | `lib/drive/client.ts`, `lib/drive/parsers.ts` |
| PDF rendering | React-PDF documents for CV and cover letter | `lib/cv/render.tsx`, `lib/cv/render-cover-letter.tsx` |
| Shared types | All domain interfaces | `lib/types.ts` |

## Pattern Overview

**Overall:** Next.js 16 App Router monolith with three independent surfaces (portfolio, dashboard, CV builder) sharing one auth cookie and one storage abstraction.

**Key Characteristics:**
- Route Handlers are the only backend; no separate server or service layer.
- Persistence is per-document "store" modules exposing `get*()` / `save*()` pairs. Each store has a `BLOB_PATHNAME` and a `LOCAL_PATH` and branches on `process.env.BLOB_READ_WRITE_TOKEN`.
- Vercel Blob objects use `addRandomSuffix: false` + `allowOverwrite: true` (stable pathnames), and reads pass `useCache: false` to bypass the CDN and avoid serving pre-write copies.
- Server Components read data directly via store functions (e.g. `app/dashboard/page.tsx` calls `getBillsData()`); Client Components fetch API routes.
- LLM work (job analysis, angle, questions, CV generation, cover letter, profile enrichment, contracts chat) goes through `@anthropic-ai/sdk` directly inside route handlers, with cost tracked via `lib/cv/cost.ts`.

## Layers

**Pages / UI (`app/page.tsx`, `app/dashboard/**`, `app/cv/**`):**
- Purpose: render surfaces; gate `/dashboard` and `/cv` behind auth.
- Depends on: components, store functions (server components), API routes (client components).

**Route Handlers (`app/api/**/route.ts`):**
- Purpose: HTTP endpoints. Each re-checks the `dashboard_auth` cookie (cron uses `Bearer ${CRON_SECRET}` instead).
- Depends on: `lib/` stores, `lib/drive`, Anthropic SDK.

**Domain / persistence (`lib/`):**
- Purpose: storage abstraction, Drive sync, PDF generation, types, cost math.
- Depends on: `@vercel/blob`, `fs`, Google OAuth REST API, `@react-pdf/renderer`.

**Storage (Vercel Blob / `data/*.json`):**
- Purpose: state. `data/*.json` are committed seeds and the dev store; Blob is the production store. `scripts/sync-context.sh` pulls Blob back into `data/*.json` via `/api/cv/export` and commits.

## Data Flow

### CV generation path

1. User submits job URL or pasted text on `app/cv/page.tsx`.
2. `POST /api/cv/analyze-job` → Anthropic → `JobAnalysis` (`app/api/cv/analyze-job/route.ts`).
3. `POST /api/cv/angle` and `POST /api/cv/questions` → Anthropic, using `getProfile()`.
4. `POST /api/cv/generate` → Anthropic with structured schema + profile → `CvContent` (`app/api/cv/generate/route.ts`).
5. `POST /api/cv/versions` → `generateCvPdf()` → writes PDF to Blob `cvs/{id}.pdf` (or `public/cvs/` in dev), appends to `cv-versions.json` via `saveVersions()` (`app/api/cv/versions/route.ts`).
6. Private-blob PDFs are served through proxy route `app/api/cv/versions/[id]/pdf/route.ts`.
7. `POST /api/cv/applications` records an `Application` linked to a `cv_version_id`.

### Bills sync path

1. Vercel Cron (`vercel.json`, Mondays 06:00 UTC) → `GET /api/dashboard/sync` (auth: `Bearer ${CRON_SECRET}`), or dashboard `SyncButton` → `POST /api/dashboard/sync` (auth: cookie).
2. `syncBills()` → `DriveClient.create()` refreshes an access token from `GOOGLE_REFRESH_TOKEN` (`lib/drive/client.ts`).
3. Lists three hardcoded Drive folder IDs, downloads PDFs/HTML, parses via `lib/drive/parsers.ts`.
4. `storeBillsData()` writes `bills.json` to Blob (or local).
5. `app/dashboard/page.tsx` (server component) reads via `getBillsData()` on next render.

### Context export path

1. `scripts/sync-context.sh` authenticates via `POST /api/auth`, calls `GET /api/cv/export`.
2. `/api/cv/export` reads profile/applications/versions/voice-samples from their stores (Blob in prod), returns one JSON blob.
3. Script writes `data/{profile,applications,cv-versions,voice-samples}.json` and commits + pushes.

**State Management:** Client surfaces use local `useState` machines (e.g. `AnalyzeState`, `GenerateState` in `app/cv/page.tsx`). No global client store. Server state lives entirely in Blob/JSON.

## Key Abstractions

**Document store module:**
- Purpose: own exactly one JSON document with a Blob/local switch.
- Examples: `lib/cv/versions-store.ts`, `lib/cv/profile-store.ts`, `lib/cv/applications-store.ts`, `lib/cv/voice-store.ts`, `getBillsData`/`storeBillsData` in `lib/drive/sync.ts`.
- Pattern: `if (process.env.BLOB_READ_WRITE_TOKEN) { get/put with useCache:false, addRandomSuffix:false, allowOverwrite:true } else { readFileSync/writeFileSync on data/<name>.json }`.

**Anthropic-backed analysis route:**
- Purpose: one LLM task per route, returns typed JSON.
- Examples: `app/api/cv/analyze-job`, `angle`, `questions`, `generate`, `cover-letter`, `enrich-profile`, `app/api/dashboard/contracts-chat`.
- Pattern: cookie auth check → parse body → `new Anthropic()` → build prompt from `lib/types` shapes + profile → `calcCostUsd()`.

**React-PDF document:**
- Purpose: server-side PDF generation. `serverExternalPackages: ["@react-pdf/renderer"]` in `next.config.ts`.
- Examples: `lib/cv/render.tsx` (`generateCvPdf`), `lib/cv/render-cover-letter.tsx`.

## Entry Points

**Public site:** `app/page.tsx` (root layout `app/layout.tsx`, Geist fonts, Vercel Analytics).

**Dashboard:** `app/dashboard/layout.tsx` → `DashboardShell` (client, hides chrome on `/dashboard/login`); pages gate via `AuthGuard` server component (`app/components/dashboard/AuthGuard.tsx`).

**CV builder:** `app/cv/layout.tsx` — server component, redirects to `/dashboard/login` unless `dashboard_auth` cookie equals `DASHBOARD_TOKEN`; renders `CvSidebar`.

**Auth:** `POST /api/auth` checks `DASHBOARD_PASSWORD`, sets httpOnly `dashboard_auth` cookie to `DASHBOARD_TOKEN`. `DELETE /api/auth` clears it.

**Cron:** `GET /api/dashboard/sync` via `vercel.json` crons.

## Architectural Constraints

- **Threading:** Standard Next.js serverless/Node request model; no worker threads. PDF generation runs inline in the request.
- **Global state:** `app/api/dashboard/contracts-chat/route.ts` imports `data/*.json` at module scope (`rawContracts`, `rawMortgage`, `rawInsurance`) — these are build-time snapshots, not live Blob reads. Same for `app/dashboard/page.tsx` insurance/contracts/mortgage imports.
- **Hardcoded IDs:** Google Drive folder IDs are literals in `lib/drive/sync.ts`.
- **Auth is a shared secret:** every protected route independently compares a cookie to `DASHBOARD_TOKEN`; there is no middleware. Some CV routes only check the cookie is present, not its value (`app/api/cv/versions/route.ts`), while layouts check the value.
- **Dual source of truth:** Blob vs committed `data/*.json` can drift; `scripts/sync-context.sh` is the manual reconciliation.

## Anti-Patterns

### Reading `data/*.json` via static import in a route/page that should reflect live state

**What happens:** `contracts-chat` and parts of `app/dashboard/page.tsx` import JSON at module scope.
**Why it's wrong:** In production the live document is in Blob; the imported copy is whatever was committed at build time.
**Do this instead:** Add/'use a store module (`lib/.../*-store.ts`) with a `get*()` that branches on `BLOB_READ_WRITE_TOKEN`, as `getBillsData()` / `getProfile()` do.

### Inconsistent auth checks

**What happens:** Layouts compare the cookie to `DASHBOARD_TOKEN`; several `/api/cv/*` handlers only check `authCookie?.value` is truthy.
**Why it's wrong:** A handler hit directly accepts any non-empty cookie value.
**Do this instead:** Compare `authCookie.value === process.env.DASHBOARD_TOKEN` in every protected handler (pattern in `app/api/cv/export/route.ts` is still weak — prefer the layout check).

## Error Handling

**Strategy:** try/catch in route handlers returning `NextResponse.json({ error }, { status })`; client helper `extractErrorMessage()` in `app/cv/page.tsx` surfaces the JSON `error` field.

**Patterns:**
- Stores swallow Blob read failures and fall through to local (`catch {}`).
- Drive sync skips unparseable files silently per-file.

## Cross-Cutting Concerns

**Logging:** none structured; errors are returned in responses.
**Validation:** ad hoc in handlers (e.g. category whitelist in `sync`); LLM outputs constrained by JSON schema in `app/api/cv/generate/route.ts`.
**Authentication:** single `dashboard_auth` cookie; `DASHBOARD_PASSWORD` → `DASHBOARD_TOKEN`; cron uses `CRON_SECRET`.

---

*Architecture analysis: 2026-09-08*
