# Coding Conventions

**Analysis Date:** 2026-09-08

## Project Shape

Next.js 16.2.4 App Router project (`app/` directory), React 19.2.4, TypeScript 5, Tailwind CSS v4. Two feature areas live side by side:
- **Portfolio** — public marketing site (`app/page.tsx`, `app/components/*.tsx`)
- **Dashboard + CV Generator** — password-gated tools (`app/dashboard/**`, `app/cv/**`, `app/api/**`, `lib/**`)

**IMPORTANT (`AGENTS.md`):** This Next.js version has breaking changes vs. training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing framework code. Heed deprecation notices.

## TypeScript Config

`tsconfig.json`:
- `strict: true` (all strict flags on)
- `target: ES2017`, `module: esnext`, `moduleResolution: bundler`
- `noEmit: true`, `isolatedModules: true`, `skipLibCheck: true`
- Path alias: `@/*` → `./*` (repo root). Import shared code as `@/lib/types`, `@/lib/cv/render`.
- No explicit `baseUrl`; alias is the only mapping.

**Type discipline in practice:**
- Shared domain types live in `lib/types.ts` as `interface` declarations, grouped by feature with banner comments (`// ── Dashboard ──`).
- API route bodies are typed inline via destructuring annotation: `const { content, job_url }: { content: CvContent; job_url: string } = await request.json();`
- External/loosely-shaped data uses `Record<string, unknown>` then narrowed with local `as` casts (see `buildSkillsList` in `app/api/cv/generate/route.ts`). Avoid `any`.
- Error narrowing pattern is standard: `const msg = err instanceof Error ? err.message : String(err);`

## ESLint Config

`eslint.config.mjs` — flat config via `eslint/config`:
- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- No custom rules added; `globalIgnores` for `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- Run: `npm run lint` (`eslint`)
- No Prettier config present. Match existing file style manually (2-space indent, double quotes, semicolons, trailing commas in multiline literals).

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` — `Hero.tsx`, `SyncButton.tsx`, `AuthGuard.tsx`, `CvPreview.tsx`
- Route files: Next.js conventions — `app/**/page.tsx`, `app/api/**/route.ts`, dynamic segments `app/api/cv/versions/[id]/route.ts`
- Library modules: kebab-case `.ts` — `versions-store.ts`, `voice-profile.ts`, `render-cover-letter.tsx`
- PDF renderers (React-PDF components) use `.tsx` even in `lib/` — `lib/cv/render.tsx`

**Directories:** lowercase, kebab where multiword — `app/components/dashboard/`, `app/api/dashboard/contracts-chat/`, `scripts/email-organizer/`

**Functions:** camelCase verbs. Store modules expose `getX` / `saveX` pairs (`getVersions`/`saveVersions`, `getProfile`). Cost/util helpers are pure functions (`calcCostUsd`, `buildSkillsList`, `fmtMonth`).

**Components:** default export, named after the file. Props typed via a local `interface Props` or inline `{ ... }: { ... }`.

**Types:** PascalCase interfaces — `CvContent`, `CvVersion`, `JobAnalysis`, `EnergyBill`. Domain prefix (`Cv*`) groups CV-generator types.

**Constants:** SCREAMING_SNAKE_CASE module-level — `TAILORED_CV_SCHEMA`, `RATES`, `BLOB_PATHNAME`, `LOCAL_PATH`.

**Env vars:** SCREAMING_SNAKE — `DASHBOARD_PASSWORD`, `DASHBOARD_TOKEN`, `ANTHROPIC_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, `CRON_SECRET`.

## Component Conventions

- **Server Components by default.** Add `"use client"` only for interactivity (state, effects, router, framer-motion). Examples: `FadeUp.tsx`, `SyncButton.tsx`, `app/dashboard/login/page.tsx`.
- Server-side auth gate is an async Server Component: `AuthGuard.tsx` awaits `cookies()` and calls `redirect()` from `next/navigation`.
- `cookies()` and `headers()` are async in this Next version — always `await` them.
- Icons: `lucide-react` (e.g. `import { Lock, ArrowRight } from "lucide-react"`).
- Animation: `framer-motion` via the shared `FadeUp` wrapper (`initial/whileInView/viewport once`). Reuse it rather than hand-rolling motion.
- Fonts: `next/font/google` (`Geist`, `Geist_Mono`) wired in `app/layout.tsx` as CSS variables `--font-geist-sans` / `--font-geist-mono`.
- Styling: Tailwind utility classes inline. **Follow `DESIGN.md`** for the portfolio (neutral palette, `--cta-accent` tokens, section-label pattern, tag-chip sizing). The dashboard uses a separate `stone-*` palette and `rounded-lg` cards — keep the two visual systems distinct.

## Import Organization

Observed order (not lint-enforced, but consistent):
1. `"use client"` directive (if present)
2. Next / React framework imports (`next/server`, `next/navigation`, `next/headers`, `react`)
3. Third-party (`@anthropic-ai/sdk`, `@vercel/blob`, `framer-motion`, `lucide-react`, node builtins `fs`/`path`)
4. `@/` internal aliases (`@/lib/...`), with `import type { ... }` for type-only

## API Route Conventions

All routes are App Router handlers exporting named HTTP verb functions (`GET`, `POST`, `DELETE`) from `app/api/**/route.ts`.

**Signature:** `export async function POST(request: NextRequest)` → returns `NextResponse.json(...)`.

**Auth — three distinct patterns, pick by caller:**
| Caller | Check | Example |
|--------|-------|---------|
| Browser (dashboard/CV UI) | `request.cookies.get("dashboard_auth")` — newer routes also compare `.value !== process.env.DASHBOARD_TOKEN` | `app/api/cv/versions/route.ts`, `app/api/dashboard/sync/route.ts` POST |
| Vercel Cron | `authorization` header `=== \`Bearer ${process.env.CRON_SECRET}\`` | `app/api/dashboard/sync/route.ts` GET |
| Login itself | compares body `password` to `process.env.DASHBOARD_PASSWORD`, sets `httpOnly` cookie `dashboard_auth` | `app/api/auth/route.ts` |

Unauthorized → `NextResponse.json({ error: "Unauthorized" }, { status: 401 })` (early return, before any work). 20+ routes under `app/api/cv/` and `app/api/dashboard/` follow this. **A new gated route must start with the cookie check.**

Note the inconsistency to follow the *stricter* form of: older routes check only cookie presence (`!authCookie?.value`); newer ones also verify the value equals `DASHBOARD_TOKEN`. New code should verify the value.

**Request body parsing:** wrap `await request.json()` in `try/catch` → `400 { error: "Invalid JSON" }`. Then validate required fields → `400 { error: "Missing X" }`.

**Auth cookie:** `response.cookies.set("dashboard_auth", token, { httpOnly: true, secure: production, sameSite: "lax", path: "/", maxAge: 60*60*24*30 })`.

## Error Handling

- API: try/catch around fallible work; catch block builds `msg = err instanceof Error ? err.message : String(err)` and returns `NextResponse.json({ error: \`...: ${msg}\` }, { status: 500 })`. Sync routes return `{ ok: false, error: msg }`; CV routes return `{ error: msg }`.
- Success shape varies by area: dashboard sync returns `{ ok: true, synced_at, ...result }`; CV routes return the resource directly (sometimes with `_cost_usd` / `_cost` metadata fields prefixed `_`).
- Storage helpers (`lib/cv/*-store.ts`) swallow read errors and fall back: try Blob → catch → try local file → catch → return `[]` / default. Never throw on read.
- Client: `fetch` then branch on `res.ok`; set a local `error` string state and render it (see `login/page.tsx`, `SyncButton.tsx`). Spanish user-facing copy in the dashboard, English in CV/portfolio.

## Storage Pattern (dual-mode)

Every persistence module (`lib/cv/versions-store.ts`, `profile-store.ts`, `applications-store.ts`, `voice-store.ts`) implements the same fork:
- If `process.env.BLOB_READ_WRITE_TOKEN` set → Vercel Blob (`@vercel/blob` `get`/`put`), `access: "private"`, `addRandomSuffix: false`, `allowOverwrite: true`, and **`useCache: false` on reads** (stable pathnames would otherwise serve stale CDN copies).
- Else → local JSON file under `data/` via `fs` `readFileSync`/`writeFileSync`, `JSON.stringify(x, null, 2)`.
- Private blobs are not browser-fetchable → serve through a proxy route (`app/api/cv/versions/[id]/pdf/route.ts`).

A new feature that persists JSON should add a `lib/<area>/<name>-store.ts` following this exact shape.

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

1. Read the Next.js docs in `node_modules/next/dist/docs/` first (`AGENTS.md` mandate).
2. Server Component by default; `"use client"` only where needed; `await cookies()`/`headers()`.
3. New API route → `app/api/<area>/<name>/route.ts`, named verb exports, cookie auth check comparing `dashboard_auth` value to `DASHBOARD_TOKEN` first, `try/catch` JSON parse → 400, work in `try/catch` → 500 with `err instanceof Error` message.
4. Shared types → `lib/types.ts`. Path alias `@/`.
5. Persistence → `lib/<area>/<name>-store.ts` with the Blob-or-local dual mode, `useCache: false` on Blob reads.
6. AI calls → construct `Anthropic` in-handler, module-level JSON schema, `calcCostUsd`, return `_cost_usd`.
7. Styling → portfolio follows `DESIGN.md` tokens; dashboard follows the `stone-*` / `rounded-lg` system. Icons from `lucide-react`, animation via `FadeUp`.
8. `npm run lint` must pass. Match 2-space / double-quote / semicolon / trailing-comma style.
9. Update `TODOS.md` / `ISSUES.md` if the work maps to a tracked item (see below).

## Tracking Docs

- `DESIGN.md` — the portfolio design system. Prescriptive spec (typography, palette with WCAG notes, component patterns, layout grids). Treat as source of truth for any portfolio UI change; update it when a pattern changes.
- `ISSUES.md` — GitHub-issue drafts for the Dashboard Automation + CV Generator workstream. Each block has Type (HITL/etc.), Blocked-by, "What to build", and a checkbox "Acceptance criteria" list. Copy into GitHub or work directly from it.
- `TODOS.md` — branding/portfolio improvement roadmap, tiered by impact (TIER 1/2/…). Each item: What / Why / How (with target file) / Effort. Self-contained tasks.
- `README.md` — stock create-next-app boilerplate, not maintained; ignore for conventions.
- `docs/voice-profile.md` — reference data for the CV voice-matching feature.
- `.planning/` — GSD planning workspace.

---

*Convention analysis: 2026-09-08*
