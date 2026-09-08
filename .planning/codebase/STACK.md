# Technology Stack

**Analysis Date:** 2026-09-08

## Languages

**Primary:**
- TypeScript ~5 - All application code (`app/`, `lib/`). `strict: true`, `target: ES2017`, `moduleResolution: bundler`, path alias `@/*` → repo root (`tsconfig.json`).
- TSX/React 19.2.4 - UI components (`app/components/`), PDF renderers (`lib/cv/render.tsx`, `lib/cv/render-cover-letter.tsx`).

**Secondary:**
- Python 3 - Local bill-ingestion pipeline only (`scripts/email-organizer/organizer.py`, `sync_bills.py`). Not deployed; run manually on the owner's machine.
- Bash - Ops scripts (`scripts/sync-context.sh`, `scripts/email-organizer/monthly_update.sh`).
- JavaScript (ESM `.mjs`) - Config (`eslint.config.mjs`, `postcss.config.mjs`) and one manual test script (`scripts/test-jd-fetch.mjs`).

## Runtime

**Environment:**
- Node.js (Vercel serverless / Next.js App Router). No `.nvmrc` or `engines` field; Vercel default Node version applies.
- Next.js API route handlers run on the Node runtime (no `export const runtime = "edge"` anywhere). `pdf-parse` and `@react-pdf/renderer` require Node.

**Package Manager:**
- npm. Lockfile: `package-lock.json` present (v3 lockfile, ~282 KB). README mentions yarn/pnpm/bun as generic options but only `package-lock.json` is committed.

## Frameworks

**Core:**
- Next.js 16.2.4 - App Router (`app/` dir), route handlers under `app/api/**/route.ts`, server components by default. AGENTS.md warns this Next.js major is modified/ahead of training data — consult `node_modules/next/dist/docs/` before relying on API conventions.
- React 19.2.4 / React-DOM 19.2.4.
- Tailwind CSS v4 - via `@tailwindcss/postcss` (`postcss.config.mjs`); no `tailwind.config.js`, configured through CSS in `app/globals.css`.

**Testing:**
- None. No test runner, no `*.test.*` / `*.spec.*` files, no `test` script. `/coverage` is gitignored but unused. `scripts/test-jd-fetch.mjs` is a manual probe, not an automated test.

**Build/Dev:**
- Turbopack - `next.config.ts` sets `turbopack.root: "."`.
- ESLint 9 (flat config) - `eslint.config.mjs` extends `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`.
- `next.config.ts` sets `serverExternalPackages: ["@react-pdf/renderer"]` so the PDF renderer is not bundled.

## Key Dependencies

**Critical:**
- `@anthropic-ai/sdk` ^0.105.0 - All AI features. Instantiated per-request as `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`. Uses the beta structured-outputs API: `client.beta.messages.create({ ..., output_config: { format: { type: "json_schema", schema } }, betas: ["structured-outputs-2025-12-15"] })`. Models referenced: `claude-opus-4-8` (job analysis), `claude-sonnet-4-6` (CV generation, contracts chat), `claude-haiku-4-5` (in cost table only). NOTE: these model IDs and the cost table in `lib/cv/cost.ts` are non-standard — verify against the Anthropic API before reuse.
- `@vercel/blob` ^2.4.1 - Primary persistence layer in production. `get()` / `put()` with `access: "private"`, `addRandomSuffix: false`, `allowOverwrite: true`, and reads with `useCache: false` to defeat CDN staleness on stable pathnames. See INTEGRATIONS.md.
- `@react-pdf/renderer` ^4.5.1 - Server-side PDF generation for CVs and cover letters (`lib/cv/render.tsx`). Marked as an external server package.
- `pdf-parse` ^1.1.1 (+ `@types/pdf-parse`) - Text extraction from uploaded/Drive PDF bills and CVs. Always imported dynamically: `(await import("pdf-parse")).default`.

**Infrastructure:**
- `@vercel/analytics` ^2.0.1 - `<Analytics />` mounted in `app/layout.tsx` via `@vercel/analytics/next`.
- `next/font/google` - Geist + Geist Mono fonts, self-hosted at build.

**UI:**
- `framer-motion` ^12.40.0 - Animation.
- `lucide-react` ^0.500 - Icons.
- `recharts` ^2 - Dashboard charts (bills, mortgage).
- `date-fns` ^4 - Date math.

**Python pipeline (not in package.json):**
- `google-api-python-client`, `google-auth-oauthlib`, `google-auth-httplib2`, `pdfplumber`, `requests` (`scripts/email-organizer/requirements.txt`).

## Configuration

**Environment variables (all via `process.env`, no schema/validation layer):**
- `ANTHROPIC_API_KEY` - required for every AI route; routes 500 with an explicit message if missing.
- `BLOB_READ_WRITE_TOKEN` - presence toggles Blob persistence vs local `data/*.json` fallback. Auto-injected by Vercel when a Blob store is linked.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` - Google Drive OAuth (installed-app refresh-token flow) for bill sync and CV upload.
- `DASHBOARD_PASSWORD` - plaintext compare in `app/api/auth/route.ts`.
- `DASHBOARD_TOKEN` - static cookie value; also the bearer for authenticated `POST /api/dashboard/sync`. If unset, auth falls back to a random per-request UUID (which then fails all cookie checks).
- `CRON_SECRET` - bearer token Vercel Cron injects; checked by `GET /api/dashboard/sync`.
- `NODE_ENV` - only used to set the `secure` cookie flag.

**Config files:**
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `vercel.json` (cron only).
- `.env*` is gitignored. `scripts/email-organizer/config.example.json` is the committed template for the Python pipeline's separate `config.json` (IMAP creds + Drive folder ID); real `config.json`, `credentials.json`, `token.json` are gitignored.

**Build:**
- No custom build step. `npm run build` → `next build`. Vercel auto-deploys on push to `main` (per `monthly_update.sh` comments).

## Platform Requirements

**Development:**
- Node + npm. `npm run dev` (Turbopack) on `http://localhost:3000`.
- Without `BLOB_READ_WRITE_TOKEN`, all stores read/write local `data/*.json` — the repo ships seed copies so the app runs offline (AI routes still need `ANTHROPIC_API_KEY`).
- The Python pipeline additionally needs Python 3, a virtualenv, an iCloud app-specific password, and Google OAuth desktop credentials.

**Production:**
- Vercel. Next.js 16 App Router app + Vercel Blob store + Vercel Cron. Deployed at `https://nl93.vercel.app` (and `https://nl93.vercel.app` / a custom domain per `sync-context.sh` default `SITE_URL`).
- Requires all env vars above set in the Vercel project.

---

*Stack analysis: 2026-09-08*
