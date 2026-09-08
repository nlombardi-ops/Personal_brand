# External Integrations

**Analysis Date:** 2026-09-08

## APIs & External Services

**AI — Anthropic:**
- Used for: job-posting analysis, CV tailoring, cover-letter drafting, HR-question generation, profile enrichment, "headhunter angle" analysis, and the household-contracts advisor chatbot.
- SDK/Client: `@anthropic-ai/sdk`, `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`, created per request (no shared singleton).
- Auth: `ANTHROPIC_API_KEY`.
- Routes:
  - `app/api/cv/analyze-job/route.ts` — model `claude-opus-4-8`, structured output (`JOB_ANALYSIS_SCHEMA`). Also does a plain `fetch()` of the job-posting URL with a spoofed browser User-Agent, 10 s `AbortSignal.timeout`, strips HTML, truncates to 25 k chars.
  - `app/api/cv/generate/route.ts` — model `claude-sonnet-4-6`, `client.beta.messages.create` with `output_config.format.type: "json_schema"` + `betas: ["structured-outputs-2025-12-15"]`.
  - `app/api/cv/angle`, `app/api/cv/cover-letter`, `app/api/cv/enrich-profile`, `app/api/cv/questions` — all instantiate Anthropic.
  - `app/api/dashboard/contracts-chat/route.ts` — model `claude-sonnet-4-6`, plain (non-structured) messages, system prompt built from `data/contracts.json` + `data/mortgage.json` + `data/insurance.json` (imported at build time), history trimmed to last 12 turns, multilingual (ES/EN/IT).
- Cost tracking: every AI route returns `_cost_usd` computed by `lib/cv/cost.ts` (`calcCostUsd(model, inputTokens, outputTokens)`), rates table keyed by `claude-opus-4-8` / `claude-sonnet-4-6` / `claude-haiku-4-5`. Not persisted — response-only.

**Google Drive API (v3):**
- Used for: reading bill PDFs/HTML invoices from three known folders, and uploading generated CV PDFs into a `CVs` folder.
- Client: hand-rolled in `lib/drive/client.ts` (no googleapis npm package). `DriveClient.create()` does an OAuth refresh-token exchange against `https://oauth2.googleapis.com/token`, then calls `https://www.googleapis.com/drive/v3/*` and `https://www.googleapis.com/upload/drive/v3/files` (multipart upload, manual boundary).
- Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` (installed-app flow). Routes check all three are present and 500 with "Google Drive is not configured" otherwise.
- Hard-coded Drive folder IDs in `lib/drive/sync.ts` (and duplicated in `scripts/email-organizer/sync_bills.py`):
  - `phone_internet`: `1UKLsmvyQ_1er64dyPHLZJe17xG_Uqeby`
  - `community`: `1b_TuM2oeIwUI1klonWONT1XTTX0ErSUY`
  - `energy`: `1EBzivC0dyH0cRiTlI2tAhwL1AOFDXcY6`
- Consumers: `app/api/dashboard/sync/route.ts` (bill sync), `app/api/cv/drive-upload/route.ts` (CV PDF upload).

**iCloud Mail (IMAP) — local pipeline only, NOT in the deployed app:**
- `scripts/email-organizer/organizer.py` connects to `imap.mail.me.com:993` with an Apple app-specific password (`config.json`), pulls attachments / follows download links / snapshots notification emails, and files them into Google Drive by category + month.
- Providers configured by sender address: MasMovil Luz y Gas (`soycliente@masmovilluzygas.es`), Administraciones Colmenarejo (`attcliente@administracionescolmenarejo.es`), mobile/internet (senders list empty).

## Data Storage

**Databases:**
- None. No SQL/NoSQL database, no ORM.

**Primary store — Vercel Blob (private):**
- Package: `@vercel/blob`. Toggle: `process.env.BLOB_READ_WRITE_TOKEN` — when set, code uses Blob; when unset, it reads/writes local `data/*.json`.
- All objects use `access: "private"`, `addRandomSuffix: false` (stable pathname = the filename), `allowOverwrite: true`, `contentType: "application/json"`.
- Reads use `get(pathname, { access: "private", useCache: false })` then `new Response(result.stream).text()`. `useCache: false` is deliberate and load-bearing: with a stable pathname Vercel's CDN would keep serving the pre-write copy (comment repeated in every store file).
- Blob objects (one JSON file each, pathname = key):
  | Pathname | Store module | Shape |
  |----------|--------------|-------|
  | `profile.json` | `lib/cv/profile-store.ts` | `Profile` object |
  | `applications.json` | `lib/cv/applications-store.ts` | `Application[]` |
  | `cv-versions.json` | `lib/cv/versions-store.ts` | `CvVersion[]` |
  | `voice-samples.json` | `lib/cv/voice-store.ts` | `{ samples: VoiceSample[] }` |
  | `bills.json` | `lib/drive/sync.ts` | `BillsData` (energy/internet/community arrays) |
- Store pattern (reusable): each module exports `getX()` / `saveX()`; `get` falls through to local file on any Blob error; `save` writes Blob-or-local. `app/api/cv/versions/route.ts` also calls `put()` for the rendered CV PDF.
- NOT Blob-backed (read from committed `data/*.json` at build/runtime): `contracts.json`, `mortgage.json`, `insurance.json`, `rates.json`. These are static config edited by hand + committed.

**File Storage:**
- Google Drive (bill source documents + generated CV PDFs, see above).
- Generated CV PDFs also returned inline from `app/api/cv/render/route.ts` and `app/api/cv/versions/[id]/pdf/route.ts` (via `@react-pdf/renderer`), and stored to Blob by the versions route.
- `public/cvs/` — static CV assets committed to the repo.

**Caching:**
- None added. Code actively opts OUT of Vercel's Blob/CDN cache (`useCache: false`).

## Authentication & Identity

**No user accounts / no identity provider.** Single shared-secret gate for the whole `/dashboard` + CV Builder area.

**Login:**
- `POST /api/auth` (`app/api/auth/route.ts`): body `{ password }` compared in plaintext to `process.env.DASHBOARD_PASSWORD`. On success sets cookie `dashboard_auth` = `process.env.DASHBOARD_TOKEN` (or a random UUID if that env var is unset), `httpOnly`, `secure` in production, `sameSite: "lax"`, `path: "/"`, `maxAge` 30 days.
- `DELETE /api/auth` clears the cookie.

**Route protection (per-handler, no middleware — there is no `middleware.ts`):**
- Most CV routes: `request.cookies.get("dashboard_auth")?.value` must merely be truthy.
- Stricter routes (`POST /api/dashboard/sync`, `POST /api/dashboard/contracts-chat`): cookie value must `=== process.env.DASHBOARD_TOKEN`.
- Cron route (`GET /api/dashboard/sync`): `Authorization: Bearer ${process.env.CRON_SECRET}` — no cookie.
- Client-side gate: `app/dashboard/login/` page; dashboard pages check auth client-side. The public marketing site (`app/page.tsx` and `app/components/*`) is unauthenticated.

**Known weaknesses (relevant for Smart Community President):** plaintext password compare, static non-rotating token, truthy-only checks on many routes, secrets read ad hoc from `process.env` with no validation. Reuse the *pattern* but consider hardening.

## Monitoring & Observability

**Error Tracking:** None (no Sentry/Rollbar). Routes catch errors and return `{ error: message }` JSON with a 4xx/5xx status.

**Analytics:** `@vercel/analytics` `<Analytics />` in `app/layout.tsx` (marketing site traffic only).

**Logs:** `console` / Vercel function logs in the app. The Python pipeline writes `scripts/email-organizer/monthly_update.log` (gitignored).

## CI/CD & Deployment

**Hosting:** Vercel. Production URL `https://nl93.vercel.app` (default in `scripts/sync-context.sh`).

**CI Pipeline:** None in-repo (no `.github/workflows`). Deploy = `git push` to `main` → Vercel auto-build. Both ops scripts (`monthly_update.sh`, `sync-context.sh`) `git commit && git push` and rely on that auto-deploy.

## Environment Configuration

**Required env vars (Vercel project):**
- `ANTHROPIC_API_KEY`
- `BLOB_READ_WRITE_TOKEN` (auto-injected when Blob store linked)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
- `DASHBOARD_PASSWORD`, `DASHBOARD_TOKEN`
- `CRON_SECRET`

**Secrets location:**
- Production: Vercel environment variables.
- Local app: `.env*` (gitignored).
- Python pipeline: `scripts/email-organizer/config.json`, `credentials.json`, `token.json` (all gitignored; `config.example.json` is the template).

## Webhooks & Callbacks

**Incoming:**
- `GET /api/dashboard/sync` — Vercel Cron target. Schedule in `vercel.json`: `"0 6 * * 1"` (Mondays 06:00 UTC). Authenticated via `CRON_SECRET` bearer. Runs `syncBills("all")`: pulls all three bill categories from Google Drive, parses them (`lib/drive/parsers.ts` — regex parsers for MasMovil energy, Pepephone/MasMovil internet, Colmenarejo community), writes `bills.json` to Blob.

**Outgoing:**
- Google OAuth token endpoint (`oauth2.googleapis.com/token`), Google Drive API, Anthropic API, and arbitrary job-posting URLs fetched by `analyze-job`. No outbound webhooks to third parties.

## Data Sync Pipelines (reusable infra for Smart Community President)

**1. Bill sync (Drive → Blob), fully in-app:**
- `lib/drive/client.ts` (Drive REST wrapper) + `lib/drive/parsers.ts` (per-provider regex extractors) + `lib/drive/sync.ts` (`syncBills(category)` orchestrator) → `bills.json` Blob.
- Triggered by cron (`GET /api/dashboard/sync`) or manually (`POST /api/dashboard/sync` with `dashboard_auth` = `DASHBOARD_TOKEN`, optional `{ category }`).

**2. Legacy/local bill sync (Python), same job different runtime:**
- `scripts/email-organizer/`: `organizer.py` (IMAP → Drive), `sync_bills.py` (Drive → `data/bills.json` with `pdfplumber`), `monthly_update.sh` (venv + `sync_bills.py all` + commit + push). Predates the in-app version; duplicates the same folder IDs and parser logic.

**3. CV Builder context mirror (Blob → git):**
- `app/api/cv/export/route.ts` (`GET`, `dashboard_auth` required) returns live `profile` + `applications` + `cv_versions` + `voice_samples` as one JSON.
- `scripts/sync-context.sh` authenticates to `POST /api/auth` with `DASHBOARD_PASSWORD`, fetches `/api/cv/export`, writes `data/*.json`, and commits+pushes if changed. Run on demand. Purpose: keep git (and downstream readers) in sync with what's actually in Blob rather than stale seeds. Recent commits ("Sync CV Builder context from Blob") show this running regularly.

**4. CV PDF upload (app → Drive):**
- `app/api/cv/drive-upload/route.ts`: renders `CvContent` to PDF (`lib/cv/render`), finds/creates a `CVs` Drive folder, uploads `cv-<company>-<role>-<date>.pdf`.

---

*Integration audit: 2026-09-08*
