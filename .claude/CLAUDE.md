<!-- GSD:project-start source:PROJECT.md -->

## Project

**Smart Community President**

A private intelligence layer for Nicola as president of his comunidad de propietarios,
built as a fourth authenticated surface inside the `Personal_brand` app. It sits on top of
the administrador de fincas — not replacing it — and answers one question at any moment:
*"What did I promise to follow up on, and what is pending my action or a neighbour's /
administrador's response?"* v1 is a single-user cockpit: Nicola feeds it (uploads,
forwarded emails) and acts on its output. No neighbour or administrador access.

**Core Value:** At any moment the president can see every open commitment and incidencia, who it is
waiting on, and which LPH deadline is closing in — without digging through email.

### Constraints

- **Tech stack**: Next.js 16.2.4 App Router, React 19.2.4, TypeScript `strict`, Tailwind
  CSS v4 — this Next.js major is ahead of training data; read `node_modules/next/dist/docs/`
  before any routing/caching work (`AGENTS.md`).

- **Persistence**: Vercel Blob **private** store + committed `data/*.json` seed/dev fallback.
  No database in v1. Copy an already-fixed store (`lib/cv/profile-store.ts`) — never the
  `@vercel/blob` docs' default `access: "public"` examples. Serve private PDFs via a proxy
  route, never a blob URL.

- **Single-user, single-writer**: whole-file JSON rewrites, no locking. Acceptable for v1;
  the constraint breaks at the neighbour portal (→ Neon Postgres then).

- **Anthropic SDK**: repo uses `@anthropic-ai/sdk` via `client.beta.messages.create` with
  `betas: ["structured-outputs-2025-12-15"]` and non-standard model IDs
  (`claude-opus-4-8`, `claude-sonnet-4-6`) — verify model IDs against the Anthropic API
  before use and centralise the client + model IDs + beta flags in one
  `lib/community/anthropic.ts` (or a shared module).

- **LLM on untrusted documents**: acta PDFs and administrador emails are untrusted input to
  a model that can create/modify records — design every extraction path as
  propose-then-confirm, never auto-commit.

- **Auth**: new `/api/community/*` routes must do the strong
  `cookie.value === process.env.DASHBOARD_TOKEN` check via a shared helper. `DASHBOARD_TOKEN`
  must be set in every environment (the login route's random-UUID fallback fails open on
  weak-checked routes and closed on strong-checked ones).

- **Drive integration is currently broken** (`GOOGLE_REFRESH_TOKEN` returns `invalid_grant`).
  v1 ingestion does not depend on it; anything Drive-based needs the OAuth consent flow
  re-run first.

- **No test infrastructure exists** — no runner, no CI. Any testing this project wants must
  be set up from scratch.

- **Deployment**: `git push` to `main` → Vercel auto-build. No CI gate.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript ~5 - All application code (`app/`, `lib/`). `strict: true`, `target: ES2017`, `moduleResolution: bundler`, path alias `@/*` → repo root (`tsconfig.json`).
- TSX/React 19.2.4 - UI components (`app/components/`), PDF renderers (`lib/cv/render.tsx`, `lib/cv/render-cover-letter.tsx`).
- Python 3 - Local bill-ingestion pipeline only (`scripts/email-organizer/organizer.py`, `sync_bills.py`). Not deployed; run manually on the owner's machine.
- Bash - Ops scripts (`scripts/sync-context.sh`, `scripts/email-organizer/monthly_update.sh`).
- JavaScript (ESM `.mjs`) - Config (`eslint.config.mjs`, `postcss.config.mjs`) and one manual test script (`scripts/test-jd-fetch.mjs`).

## Runtime

- Node.js (Vercel serverless / Next.js App Router). No `.nvmrc` or `engines` field; Vercel default Node version applies.
- Next.js API route handlers run on the Node runtime (no `export const runtime = "edge"` anywhere). `pdf-parse` and `@react-pdf/renderer` require Node.
- npm. Lockfile: `package-lock.json` present (v3 lockfile, ~282 KB). README mentions yarn/pnpm/bun as generic options but only `package-lock.json` is committed.

## Frameworks

- Next.js 16.2.4 - App Router (`app/` dir), route handlers under `app/api/**/route.ts`, server components by default. AGENTS.md warns this Next.js major is modified/ahead of training data — consult `node_modules/next/dist/docs/` before relying on API conventions.
- React 19.2.4 / React-DOM 19.2.4.
- Tailwind CSS v4 - via `@tailwindcss/postcss` (`postcss.config.mjs`); no `tailwind.config.js`, configured through CSS in `app/globals.css`.
- None. No test runner, no `*.test.*` / `*.spec.*` files, no `test` script. `/coverage` is gitignored but unused. `scripts/test-jd-fetch.mjs` is a manual probe, not an automated test.
- Turbopack - `next.config.ts` sets `turbopack.root: "."`.
- ESLint 9 (flat config) - `eslint.config.mjs` extends `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`.
- `next.config.ts` sets `serverExternalPackages: ["@react-pdf/renderer"]` so the PDF renderer is not bundled.

## Key Dependencies

- `@anthropic-ai/sdk` ^0.105.0 - All AI features. Instantiated per-request as `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`. Uses the beta structured-outputs API: `client.beta.messages.create({ ..., output_config: { format: { type: "json_schema", schema } }, betas: ["structured-outputs-2025-12-15"] })`. Models referenced: `claude-opus-4-8` (job analysis), `claude-sonnet-4-6` (CV generation, contracts chat), `claude-haiku-4-5` (in cost table only). NOTE: these model IDs and the cost table in `lib/cv/cost.ts` are non-standard — verify against the Anthropic API before reuse.
- `@vercel/blob` ^2.4.1 - Primary persistence layer in production. `get()` / `put()` with `access: "private"`, `addRandomSuffix: false`, `allowOverwrite: true`, and reads with `useCache: false` to defeat CDN staleness on stable pathnames. See INTEGRATIONS.md.
- `@react-pdf/renderer` ^4.5.1 - Server-side PDF generation for CVs and cover letters (`lib/cv/render.tsx`). Marked as an external server package.
- `pdf-parse` ^1.1.1 (+ `@types/pdf-parse`) - Text extraction from uploaded/Drive PDF bills and CVs. Always imported dynamically: `(await import("pdf-parse")).default`.
- `@vercel/analytics` ^2.0.1 - `<Analytics />` mounted in `app/layout.tsx` via `@vercel/analytics/next`.
- `next/font/google` - Geist + Geist Mono fonts, self-hosted at build.
- `framer-motion` ^12.40.0 - Animation.
- `lucide-react` ^0.500 - Icons.
- `recharts` ^2 - Dashboard charts (bills, mortgage).
- `date-fns` ^4 - Date math.
- `google-api-python-client`, `google-auth-oauthlib`, `google-auth-httplib2`, `pdfplumber`, `requests` (`scripts/email-organizer/requirements.txt`).

## Configuration

- `ANTHROPIC_API_KEY` - required for every AI route; routes 500 with an explicit message if missing.
- `BLOB_READ_WRITE_TOKEN` - presence toggles Blob persistence vs local `data/*.json` fallback. Auto-injected by Vercel when a Blob store is linked.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` - Google Drive OAuth (installed-app refresh-token flow) for bill sync and CV upload.
- `DASHBOARD_PASSWORD` - plaintext compare in `app/api/auth/route.ts`.
- `DASHBOARD_TOKEN` - static cookie value; also the bearer for authenticated `POST /api/dashboard/sync`. If unset, auth falls back to a random per-request UUID (which then fails all cookie checks).
- `CRON_SECRET` - bearer token Vercel Cron injects; checked by `GET /api/dashboard/sync`.
- `NODE_ENV` - only used to set the `secure` cookie flag.
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `vercel.json` (cron only).
- `.env*` is gitignored. `scripts/email-organizer/config.example.json` is the committed template for the Python pipeline's separate `config.json` (IMAP creds + Drive folder ID); real `config.json`, `credentials.json`, `token.json` are gitignored.
- No custom build step. `npm run build` → `next build`. Vercel auto-deploys on push to `main` (per `monthly_update.sh` comments).

## Platform Requirements

- Node + npm. `npm run dev` (Turbopack) on `http://localhost:3000`.
- Without `BLOB_READ_WRITE_TOKEN`, all stores read/write local `data/*.json` — the repo ships seed copies so the app runs offline (AI routes still need `ANTHROPIC_API_KEY`).
- The Python pipeline additionally needs Python 3, a virtualenv, an iCloud app-specific password, and Google OAuth desktop credentials.
- Vercel. Next.js 16 App Router app + Vercel Blob store + Vercel Cron. Deployed at `https://nl93.vercel.app` (and `https://nl93.vercel.app` / a custom domain per `sync-context.sh` default `SITE_URL`).
- Requires all env vars above set in the Vercel project.

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Project Shape

- **Portfolio** — public marketing site (`app/page.tsx`, `app/components/*.tsx`)
- **Dashboard + CV Generator** — password-gated tools (`app/dashboard/**`, `app/cv/**`, `app/api/**`, `lib/**`)

## TypeScript Config

- `strict: true` (all strict flags on)
- `target: ES2017`, `module: esnext`, `moduleResolution: bundler`
- `noEmit: true`, `isolatedModules: true`, `skipLibCheck: true`
- Path alias: `@/*` → `./*` (repo root). Import shared code as `@/lib/types`, `@/lib/cv/render`.
- No explicit `baseUrl`; alias is the only mapping.
- Shared domain types live in `lib/types.ts` as `interface` declarations, grouped by feature with banner comments (`// ── Dashboard ──`).
- API route bodies are typed inline via destructuring annotation: `const { content, job_url }: { content: CvContent; job_url: string } = await request.json();`
- External/loosely-shaped data uses `Record<string, unknown>` then narrowed with local `as` casts (see `buildSkillsList` in `app/api/cv/generate/route.ts`). Avoid `any`.
- Error narrowing pattern is standard: `const msg = err instanceof Error ? err.message : String(err);`

## ESLint Config

- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- No custom rules added; `globalIgnores` for `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- Run: `npm run lint` (`eslint`)
- No Prettier config present. Match existing file style manually (2-space indent, double quotes, semicolons, trailing commas in multiline literals).

## Naming Patterns

- React components: PascalCase `.tsx` — `Hero.tsx`, `SyncButton.tsx`, `AuthGuard.tsx`, `CvPreview.tsx`
- Route files: Next.js conventions — `app/**/page.tsx`, `app/api/**/route.ts`, dynamic segments `app/api/cv/versions/[id]/route.ts`
- Library modules: kebab-case `.ts` — `versions-store.ts`, `voice-profile.ts`, `render-cover-letter.tsx`
- PDF renderers (React-PDF components) use `.tsx` even in `lib/` — `lib/cv/render.tsx`

## Component Conventions

- **Server Components by default.** Add `"use client"` only for interactivity (state, effects, router, framer-motion). Examples: `FadeUp.tsx`, `SyncButton.tsx`, `app/dashboard/login/page.tsx`.
- Server-side auth gate is an async Server Component: `AuthGuard.tsx` awaits `cookies()` and calls `redirect()` from `next/navigation`.
- `cookies()` and `headers()` are async in this Next version — always `await` them.
- Icons: `lucide-react` (e.g. `import { Lock, ArrowRight } from "lucide-react"`).
- Animation: `framer-motion` via the shared `FadeUp` wrapper (`initial/whileInView/viewport once`). Reuse it rather than hand-rolling motion.
- Fonts: `next/font/google` (`Geist`, `Geist_Mono`) wired in `app/layout.tsx` as CSS variables `--font-geist-sans` / `--font-geist-mono`.
- Styling: Tailwind utility classes inline. **Follow `DESIGN.md`** for the portfolio (neutral palette, `--cta-accent` tokens, section-label pattern, tag-chip sizing). The dashboard uses a separate `stone-*` palette and `rounded-lg` cards — keep the two visual systems distinct.

## Import Organization

## API Route Conventions

| Caller | Check | Example |
|--------|-------|---------|
| Browser (dashboard/CV UI) | `request.cookies.get("dashboard_auth")` — newer routes also compare `.value !== process.env.DASHBOARD_TOKEN` | `app/api/cv/versions/route.ts`, `app/api/dashboard/sync/route.ts` POST |
| Vercel Cron | `authorization` header `=== \`Bearer ${process.env.CRON_SECRET}\`` | `app/api/dashboard/sync/route.ts` GET |
| Login itself | compares body `password` to `process.env.DASHBOARD_PASSWORD`, sets `httpOnly` cookie `dashboard_auth` | `app/api/auth/route.ts` |

## Error Handling

- API: try/catch around fallible work; catch block builds `msg = err instanceof Error ? err.message : String(err)` and returns `NextResponse.json({ error: \`...: ${msg}\` }, { status: 500 })`. Sync routes return `{ ok: false, error: msg }`; CV routes return `{ error: msg }`.
- Success shape varies by area: dashboard sync returns `{ ok: true, synced_at, ...result }`; CV routes return the resource directly (sometimes with `_cost_usd` / `_cost` metadata fields prefixed `_`).
- Storage helpers (`lib/cv/*-store.ts`) swallow read errors and fall back: try Blob → catch → try local file → catch → return `[]` / default. Never throw on read.
- Client: `fetch` then branch on `res.ok`; set a local `error` string state and render it (see `login/page.tsx`, `SyncButton.tsx`). Spanish user-facing copy in the dashboard, English in CV/portfolio.

## Storage Pattern (dual-mode)

- If `process.env.BLOB_READ_WRITE_TOKEN` set → Vercel Blob (`@vercel/blob` `get`/`put`), `access: "private"`, `addRandomSuffix: false`, `allowOverwrite: true`, and **`useCache: false` on reads** (stable pathnames would otherwise serve stale CDN copies).
- Else → local JSON file under `data/` via `fs` `readFileSync`/`writeFileSync`, `JSON.stringify(x, null, 2)`.
- Private blobs are not browser-fetchable → serve through a proxy route (`app/api/cv/versions/[id]/pdf/route.ts`).

## Anthropic / AI Calls

- SDK: `@anthropic-ai/sdk`, `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` constructed inside the handler.
- Uses the beta client for structured output: `client.beta.messages.create({ ..., output_config: { format: { type: "json_schema", schema: X } }, betas: ["structured-outputs-2025-12-15"] })`.
- Model ids are bare strings (`"claude-sonnet-4-6"`); token cost computed via `calcCostUsd(model, usage.input_tokens, usage.output_tokens)` from `lib/cv/cost.ts` and returned as `_cost_usd`.
- JSON schemas are module-level constants with `additionalProperties: false` and explicit `required`.
- Prompt text: profile/job data is formatted as plain text (not JSON dumps) "cheaper to tokenize" — see comments in `generate/route.ts`. System prompt carries hard constraints (banned words, one-page rule).
- Parse model output with `try { JSON.parse(textBlock.text) } catch` → `500 { error: "Failed to parse response" }`.

## Comments

- Explain *why*, often multi-line, for non-obvious infra decisions: CDN cache bypass, private-blob proxying, cron auth vs. cookie auth. These are load-bearing — keep them when editing.
- Section banners in long files (`// ── Dashboard ──────`).
- No JSDoc/TSDoc anywhere. Don't introduce it.

## Function Design

- Small, single-purpose. Route handlers are the largest units; helper extraction is local (module-scope functions above the handler).
- Pure utils in `lib/` take primitives/objects and return values — no side effects except the `*-store.ts` I/O modules.
- Prefer early return for guard clauses (auth, validation) over nesting.

## Module Design

- Named exports for library code (`export async function getVersions`), default export for React components and route... (routes use named HTTP verbs).
- No barrel/index files. Import directly from the module path.
- `lib/types.ts` is the single shared type module — add new domain interfaces there, grouped under a banner comment.

## What a New Feature Module Must Follow

## Tracking Docs

- `DESIGN.md` — the portfolio design system. Prescriptive spec (typography, palette with WCAG notes, component patterns, layout grids). Treat as source of truth for any portfolio UI change; update it when a pattern changes.
- `ISSUES.md` — GitHub-issue drafts for the Dashboard Automation + CV Generator workstream. Each block has Type (HITL/etc.), Blocked-by, "What to build", and a checkbox "Acceptance criteria" list. Copy into GitHub or work directly from it.
- `TODOS.md` — branding/portfolio improvement roadmap, tiered by impact (TIER 1/2/…). Each item: What / Why / How (with target file) / Effort. Self-contained tasks.
- `README.md` — stock create-next-app boilerplate, not maintained; ignore for conventions.
- `docs/voice-profile.md` — reference data for the CV voice-matching feature.
- `.planning/` — GSD planning workspace.

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

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

- Route Handlers are the only backend; no separate server or service layer.
- Persistence is per-document "store" modules exposing `get*()` / `save*()` pairs. Each store has a `BLOB_PATHNAME` and a `LOCAL_PATH` and branches on `process.env.BLOB_READ_WRITE_TOKEN`.
- Vercel Blob objects use `addRandomSuffix: false` + `allowOverwrite: true` (stable pathnames), and reads pass `useCache: false` to bypass the CDN and avoid serving pre-write copies.
- Server Components read data directly via store functions (e.g. `app/dashboard/page.tsx` calls `getBillsData()`); Client Components fetch API routes.
- LLM work (job analysis, angle, questions, CV generation, cover letter, profile enrichment, contracts chat) goes through `@anthropic-ai/sdk` directly inside route handlers, with cost tracked via `lib/cv/cost.ts`.

## Layers

- Purpose: render surfaces; gate `/dashboard` and `/cv` behind auth.
- Depends on: components, store functions (server components), API routes (client components).
- Purpose: HTTP endpoints. Each re-checks the `dashboard_auth` cookie (cron uses `Bearer ${CRON_SECRET}` instead).
- Depends on: `lib/` stores, `lib/drive`, Anthropic SDK.
- Purpose: storage abstraction, Drive sync, PDF generation, types, cost math.
- Depends on: `@vercel/blob`, `fs`, Google OAuth REST API, `@react-pdf/renderer`.
- Purpose: state. `data/*.json` are committed seeds and the dev store; Blob is the production store. `scripts/sync-context.sh` pulls Blob back into `data/*.json` via `/api/cv/export` and commits.

## Data Flow

### CV generation path

### Bills sync path

### Context export path

## Key Abstractions

- Purpose: own exactly one JSON document with a Blob/local switch.
- Examples: `lib/cv/versions-store.ts`, `lib/cv/profile-store.ts`, `lib/cv/applications-store.ts`, `lib/cv/voice-store.ts`, `getBillsData`/`storeBillsData` in `lib/drive/sync.ts`.
- Pattern: `if (process.env.BLOB_READ_WRITE_TOKEN) { get/put with useCache:false, addRandomSuffix:false, allowOverwrite:true } else { readFileSync/writeFileSync on data/<name>.json }`.
- Purpose: one LLM task per route, returns typed JSON.
- Examples: `app/api/cv/analyze-job`, `angle`, `questions`, `generate`, `cover-letter`, `enrich-profile`, `app/api/dashboard/contracts-chat`.
- Pattern: cookie auth check → parse body → `new Anthropic()` → build prompt from `lib/types` shapes + profile → `calcCostUsd()`.
- Purpose: server-side PDF generation. `serverExternalPackages: ["@react-pdf/renderer"]` in `next.config.ts`.
- Examples: `lib/cv/render.tsx` (`generateCvPdf`), `lib/cv/render-cover-letter.tsx`.

## Entry Points

## Architectural Constraints

- **Threading:** Standard Next.js serverless/Node request model; no worker threads. PDF generation runs inline in the request.
- **Global state:** `app/api/dashboard/contracts-chat/route.ts` imports `data/*.json` at module scope (`rawContracts`, `rawMortgage`, `rawInsurance`) — these are build-time snapshots, not live Blob reads. Same for `app/dashboard/page.tsx` insurance/contracts/mortgage imports.
- **Hardcoded IDs:** Google Drive folder IDs are literals in `lib/drive/sync.ts`.
- **Auth is a shared secret:** every protected route independently compares a cookie to `DASHBOARD_TOKEN`; there is no middleware. Some CV routes only check the cookie is present, not its value (`app/api/cv/versions/route.ts`), while layouts check the value.
- **Dual source of truth:** Blob vs committed `data/*.json` can drift; `scripts/sync-context.sh` is the manual reconciliation.

## Anti-Patterns

### Reading `data/*.json` via static import in a route/page that should reflect live state

### Inconsistent auth checks

## Error Handling

- Stores swallow Blob read failures and fall through to local (`catch {}`).
- Drive sync skips unparseable files silently per-file.

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
