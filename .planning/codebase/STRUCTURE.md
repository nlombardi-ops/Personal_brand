# Codebase Structure

**Analysis Date:** 2026-09-08

## Directory Layout

```
Personal_brand/
├── app/                          # Next.js 16 App Router — all routes + UI
│   ├── layout.tsx                # Root layout (fonts, Analytics)
│   ├── page.tsx                  # Public portfolio home
│   ├── globals.css               # Tailwind v4 (@import "tailwindcss") + tokens
│   ├── components/               # Portfolio section components (Nav, Hero, ...)
│   │   ├── cv/                   # CvPreview, CvSidebar
│   │   └── dashboard/            # Shell, Sidebar, AuthGuard, charts, tables
│   ├── cv/                       # CV builder pages (auth-gated by layout.tsx)
│   │   ├── layout.tsx            # Cookie check → redirect to /dashboard/login
│   │   ├── page.tsx              # Generate flow
│   │   ├── cover-letter/  profile/  stats/  versions/
│   ├── dashboard/                # Finance dashboard pages
│   │   ├── layout.tsx            # DashboardShell wrapper
│   │   ├── page.tsx              # Overview (server component, reads stores)
│   │   ├── login/               # Password form
│   │   └── bills/  contracts/  insurance/  mortgage/
│   └── api/                      # Route Handlers (route.ts files only)
│       ├── auth/                 # POST login / DELETE logout
│       ├── dashboard/            # sync (cron+manual), contracts-chat
│       └── cv/                   # 15 routes: analyze-job, angle, questions,
│                                 #  generate, render, versions, applications,
│                                 #  profile, enrich-profile, cover-letter,
│                                 #  parse-pdf, drive-upload, voice-samples,
│                                 #  stats, export
├── lib/
│   ├── types.ts                  # All domain interfaces (dashboard + CV)
│   ├── cv/                       # *-store.ts persistence, render*.tsx, cost.ts,
│   │                             #  voice-profile.ts, photo.ts
│   └── drive/                    # client.ts (OAuth+REST), parsers.ts, sync.ts
├── data/                         # Committed JSON: seeds + dev store + Blob mirror
│   ├── profile.json  cv-versions.json  applications.json  voice-samples.json
│   ├── bills.json  mortgage.json  insurance.json  contracts.json  rates.json
├── public/
│   └── cvs/                      # Dev-only generated CV PDFs
├── scripts/
│   ├── sync-context.sh           # Pull Blob → data/*.json → commit+push
│   ├── test-jd-fetch.mjs
│   └── email-organizer/          # Python bill pipeline (organizer.py, sync_bills.py)
├── docs/voice-profile.md
├── .planning/                    # GSD planning artifacts (this dir)
├── AGENTS.md  CLAUDE.md  DESIGN.md  ISSUES.md  TODOS.md  README.md
├── next.config.ts                # turbopack.root, serverExternalPackages
├── vercel.json                   # crons → /api/dashboard/sync
├── eslint.config.mjs  postcss.config.mjs  tsconfig.json
```

## Directory Purposes

**`app/api/**`:** One `route.ts` per endpoint. `cv/` routes handle the CV builder; `dashboard/` routes handle bills sync and the contracts chatbot; `auth/` handles the shared login cookie. Dynamic segments use `[id]` folders (`app/api/cv/versions/[id]/`, `app/api/cv/applications/[id]/`).

**`app/cv/` and `app/dashboard/`:** Sibling authenticated surfaces. Both gate on the `dashboard_auth` cookie — `app/cv/layout.tsx` and `app/components/dashboard/AuthGuard.tsx` compare it to `DASHBOARD_TOKEN` and `redirect("/dashboard/login")`.

**`lib/cv/`:** Persistence stores (`versions-store.ts`, `profile-store.ts`, `applications-store.ts`, `voice-store.ts`), PDF renderers (`render.tsx`, `render-cover-letter.tsx`), `cost.ts` (token → USD), `voice-profile.ts`, `photo.ts`.

**`lib/drive/`:** `client.ts` — `DriveClient` class, OAuth refresh-token flow, recursive folder listing, download, folder create. `parsers.ts` — PDF/HTML text extraction + provider-specific bill parsers. `sync.ts` — orchestration + `bills.json` store.

**`data/`:** Committed. Serves three roles: (1) initial seed data, (2) the dev-mode store (written by `writeFileSync` when `BLOB_READ_WRITE_TOKEN` is unset), (3) a mirror of production Blob refreshed by `scripts/sync-context.sh`. Not git-ignored.

**`public/cvs/`:** Generated CV PDFs in local dev only; production writes to Blob `cvs/{id}.pdf` and serves via `/api/cv/versions/[id]/pdf`.

## Key File Locations

**Entry Points:**
- `app/page.tsx`: public portfolio
- `app/dashboard/page.tsx`: finance overview
- `app/cv/page.tsx`: CV generator flow
- `app/api/auth/route.ts`: login/logout
- `app/api/dashboard/sync/route.ts`: cron + manual bill sync

**Configuration:**
- `next.config.ts`: `serverExternalPackages: ["@react-pdf/renderer"]`, `turbopack.root`
- `vercel.json`: cron schedule
- `tsconfig.json`: `@/*` → repo root path alias
- `.env` (not committed): `DASHBOARD_PASSWORD`, `DASHBOARD_TOKEN`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`

**Core Logic:**
- `lib/types.ts`: every interface
- `lib/cv/*-store.ts`: Blob/local persistence
- `lib/drive/sync.ts`: bill ingestion
- `lib/cv/render.tsx`: CV PDF

**Testing:** none present (no test runner, no `*.test.*`). `scripts/test-jd-fetch.mjs` is a manual script.

## Naming Conventions

**Files:**
- Route handlers: always `route.ts` inside a named folder
- React components: `PascalCase.tsx` (`CvSidebar.tsx`, `StatCard.tsx`)
- lib modules: `kebab-case.ts` (`profile-store.ts`, `render-cover-letter.tsx`)
- Store modules: `<noun>-store.ts` exporting `get<Noun>()` / `save<Noun>()`
- JSON documents: `kebab-case.json` in `data/`, matching the store's `BLOB_PATHNAME`

**Directories:**
- Route segments: lowercase, kebab where multi-word (`analyze-job`, `cover-letter`, `contracts-chat`)
- Dynamic params: `[id]`

## Where to Add New Code

**New CV-builder or dashboard feature module (e.g. "Smart Community President"):**
It slots in as a fourth peer alongside `cv/` and `dashboard/`, or as a sub-section of `dashboard/` if it belongs to the finance surface. Concretely:

1. **Page(s):** `app/community-president/` with its own `layout.tsx` mirroring `app/cv/layout.tsx` (same `dashboard_auth` cookie check), or `app/dashboard/community/page.tsx` to reuse `DashboardShell` + `Sidebar` (add a nav entry in `app/components/dashboard/Sidebar.tsx`).
2. **Components:** `app/components/community/` (client components fetch API routes; server components may call stores directly).
3. **API routes:** `app/api/community/<action>/route.ts` — one file per action, cookie auth check at top, `new Anthropic()` for any LLM step, `calcCostUsd()` from `lib/cv/cost.ts` for cost tracking.
4. **Persistence:** `lib/community/<thing>-store.ts` following the exact `versions-store.ts` template — `const BLOB_PATHNAME = "community-<thing>.json"`, `const LOCAL_PATH = join(process.cwd(), "data/community-<thing>.json")`, branch on `process.env.BLOB_READ_WRITE_TOKEN`, reads use `useCache: false`, writes use `addRandomSuffix: false` + `allowOverwrite: true`.
5. **Seed file:** create `data/community-<thing>.json` and commit it (dev store + seed).
6. **Types:** add interfaces to `lib/types.ts` under a new `// ── Smart Community President ──` section.
7. **Drive input (if it reads documents):** reuse `DriveClient` from `lib/drive/client.ts`; add folder IDs to a `FOLDERS` map like `lib/drive/sync.ts`.
8. **If it exposes state to the git mirror:** add its store getter to `app/api/cv/export/route.ts` (or a new `/api/community/export`) and to `scripts/sync-context.sh`'s target map.
9. **Scheduled work:** add a cron entry to `vercel.json` pointing at a `GET` handler guarded by `Bearer ${CRON_SECRET}` (see `app/api/dashboard/sync/route.ts`).

**New portfolio section:** add `app/components/<Section>.tsx`, render it in `app/page.tsx`, follow `DESIGN.md` tokens.

**New shared helper:** `lib/<domain>/<name>.ts`; cross-domain utilities can go in `lib/` root next to `types.ts`.

## Special Directories

**`data/`:** Contains state, generated + hand-seeded. Committed. Reconciled with Blob via `scripts/sync-context.sh`.

**`public/cvs/`:** Generated PDFs, dev only. Committed contents should be ignored/transient.

**`scripts/email-organizer/`:** Standalone Python (own `requirements.txt`, `SETUP.md`); credentials git-ignored, `config.example.json` documents shape.

**`.planning/`:** GSD workflow artifacts. Not application code.

---

*Structure analysis: 2026-09-08*
