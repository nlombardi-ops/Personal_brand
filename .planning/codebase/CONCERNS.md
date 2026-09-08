# Codebase Concerns

**Analysis Date:** 2026-09-08

Scope: full repo. Focus areas flagged by the orchestrator — auth robustness, Vercel Blob
private-vs-public store handling, secrets, sync-script failure modes, and what a new
"Smart Community President" feature building on this infra must be careful of — are all
covered below.

---

## Tech Debt

### Two different auth checks across API routes — most of the surface is effectively unauthenticated

- **Issue:** There are two inconsistent inline auth patterns and no shared helper / middleware.
  - **Strong check** (`authCookie.value !== process.env.DASHBOARD_TOKEN`): only
    `app/api/dashboard/contracts-chat/route.ts` and the `POST` in
    `app/api/dashboard/sync/route.ts`.
  - **Weak check** (`if (!authCookie?.value)` — passes for *any* non-empty cookie value):
    every `app/api/cv/*` route (~18 handlers) plus `app/api/cv/drive-upload/route.ts`.
  - Server components use a third copy: `app/components/dashboard/AuthGuard.tsx` and
    `app/cv/layout.tsx` both do the strong `=== process.env.DASHBOARD_TOKEN` comparison.
- **Files:**
  `app/api/cv/generate/route.ts:49`, `app/api/cv/profile/route.ts:5,13`,
  `app/api/cv/export/route.ts:16`, `app/api/cv/versions/route.ts:10,22`,
  `app/api/cv/versions/[id]/route.ts:8`, `app/api/cv/versions/[id]/pdf/route.ts:11`,
  `app/api/cv/applications/route.ts:6,14`, `app/api/cv/applications/[id]/route.ts:8`,
  `app/api/cv/stats/route.ts:6`, `app/api/cv/voice-samples/route.ts:6`,
  `app/api/cv/enrich-profile/route.ts:20`, `app/api/cv/questions/route.ts:21`,
  `app/api/cv/analyze-job/route.ts:74`, `app/api/cv/angle/route.ts:26`,
  `app/api/cv/cover-letter/route.ts:10`, `app/api/cv/cover-letter/render/route.ts:7`,
  `app/api/cv/render/route.ts:6`, `app/api/cv/parse-pdf/route.ts:4`,
  `app/api/cv/drive-upload/route.ts:9`.
- **Impact:** Anyone can send `Cookie: dashboard_auth=anything` and read every CV-tool
  endpoint — including `data/profile.json` (full career history, referral names/titles/
  companies), all generated CV versions and their PDFs, the application tracker, and voice
  samples — and can *trigger paid Anthropic API calls* (`/api/cv/generate`,
  `/enrich-profile`, `/analyze-job`, `/angle`, `/cover-letter`, `/questions`) and PDF
  parsing. This is a data-exposure and cost-abuse hole. The `/cv` UI looks gated because
  `app/cv/layout.tsx` does the real check, but the APIs behind it do not.
- **Fix approach:** Add one `lib/auth.ts` `requireDashboardAuth(request)` helper doing the
  strong constant-time comparison against `DASHBOARD_TOKEN`, and call it from every route.
  Better: add a root `middleware.ts` matching `/api/(cv|dashboard)/:path*` and `/dashboard/:path*`
  and `/cv/:path*` so a new route is protected by default (see "Missing Critical Features").

### No middleware — every route re-implements auth

- **Issue:** There is no `middleware.ts` anywhere in the repo. Auth is opt-in per handler.
- **Files:** repo root (absent), all `app/api/**/route.ts`.
- **Impact:** Every new endpoint is unprotected until someone remembers to paste the cookie
  check. The "Smart Community President" feature will add many new routes and inherits this
  trap. Actas, presupuestos and open-loop data are at least as sensitive as CV data.
- **Fix approach:** Introduce `middleware.ts` with a matcher covering the authenticated
  areas; keep a lightweight in-route assertion only where route-specific logic needs it.

### `DASHBOARD_TOKEN` fallback in the login route makes tokens non-verifiable

- **Issue:** `app/api/auth/route.ts:12` sets the cookie to
  `process.env.DASHBOARD_TOKEN || crypto.randomUUID()`. If `DASHBOARD_TOKEN` is unset, each
  login gets a fresh random value that nothing can later verify — `AuthGuard.tsx` and
  `app/cv/layout.tsx` compare against `process.env.DASHBOARD_TOKEN` (undefined), so strong-
  checked pages/routes lock everyone out while weak-checked routes still let everyone in.
- **Files:** `app/api/auth/route.ts:12`, `app/components/dashboard/AuthGuard.tsx:8`,
  `app/cv/layout.tsx:9`.
- **Impact:** Behaviour depends entirely on an env var being set in every environment;
  a missing var fails open on the CV API and closed on the dashboard UI simultaneously.
- **Fix approach:** Require `DASHBOARD_TOKEN` (throw at startup if absent); issue a signed
  session token (JWT / `iron-session`) rather than echoing a shared secret as the cookie
  value.

### `data/*.json`-as-database with dual sources of truth

- **Issue:** Every store (`lib/cv/profile-store.ts`, `versions-store.ts`,
  `applications-store.ts`, `voice-store.ts`, `lib/drive/sync.ts`) reads/writes a Vercel Blob
  when `BLOB_READ_WRITE_TOKEN` is set, otherwise `readFileSync`/`writeFileSync` on
  `data/<name>.json` in the repo working tree. Production state lives only in Blob; the
  committed `data/*.json` is a stale mirror reconciled by hand via `scripts/sync-context.sh`.
- **Files:** `lib/cv/profile-store.ts:9-40`, `lib/cv/versions-store.ts`,
  `lib/cv/applications-store.ts`, `lib/cv/voice-store.ts`, `lib/drive/sync.ts:20-50`,
  `scripts/sync-context.sh`.
- **Impact:**
  - `writeFileSync` on Vercel's serverless filesystem is ephemeral/read-only — any code path
    that hits the local branch in production silently loses the write.
  - Local `next dev` writes into tracked repo files, producing uncommitted diffs that look
    like accidental edits.
  - The committed copies drift: `TODOS.md` D1 notes `data/profile.json`
    `meta.last_updated` is 2026-06-21 and still calls Mottum "current" though it closed
    Aug 2026 — the repo copy is months behind Blob.
  - No file locking: two concurrent writes to the same JSON are last-write-wins over the
    whole document.
- **Fix approach:** Pick one system of record. For the current single-user scale, Blob-only
  (remove the filesystem branch, treat `data/*.json` purely as seed fixtures) plus a
  documented `sync-context.sh` cadence is defensible. Anything multi-writer (neighbour
  portal) needs a real datastore (Postgres/Neon, already available via Vercel marketplace).

### No automated tests, no CI gate

- **Issue:** `package.json` has only `dev`/`build`/`start`/`lint`. No test runner, no
  `.github/workflows`, no pre-commit hooks. The only scripts under `scripts/` that resemble
  tests are `scripts/test-jd-fetch.mjs` (an ad-hoc fetch probe).
- **Impact:** Blob access-mode regressions, auth regressions, and profile-shape breakage are
  only caught in production (the private-store bug — see below — was found by reading
  Vercel runtime logs). Refactors are unguarded.
- **Fix approach:** Add Vitest + a handful of route tests (auth rejection, store
  read/write round-trip against a mocked `@vercel/blob`), wire `npm test` into a GitHub
  Action on PR.

### Bleeding-edge framework and SDK surface

- **Issue:** `next@16.2.4`, `react@19.2.4`, `@anthropic-ai/sdk@^0.105.0` used via
  `client.beta.messages.create({ ..., output_config, betas: ["structured-outputs-2025-12-15"] })`
  and `model: "claude-sonnet-4-6"`. `AGENTS.md` explicitly warns "This is NOT the Next.js
  you know … Read the relevant guide in `node_modules/next/dist/docs/` before writing code."
- **Files:** `package.json`, `app/api/cv/generate/route.ts:150-190`,
  `app/api/cv/questions/route.ts`, `app/api/cv/enrich-profile/route.ts`,
  `app/api/cv/angle/route.ts`, `app/api/cv/cover-letter/route.ts`.
- **Impact:** A minor SDK bump can remove the `beta`/`betas` structured-output path; a Next
  minor can change routing/caching semantics. `^0.105.0` floats the Anthropic SDK.
- **Fix approach:** Pin `@anthropic-ai/sdk` to an exact version; centralise the model id and
  the beta-flag call into `lib/cv/anthropic.ts` so one edit migrates every route; keep a
  note of which `betas` string is load-bearing.

---

## Known Bugs

### `GOOGLE_REFRESH_TOKEN` is dead — Drive integration fully broken

- **Symptoms:** Google Drive uploads/downloads fail with `invalid_grant` from Google's
  token endpoint. Confirmed in commit `fb3f84d` message ("GOOGLE_REFRESH_TOKEN is dead …
  needs the user to redo the OAuth consent flow").
- **Files:** `lib/drive/client.ts:15` (`refresh_token: process.env.GOOGLE_REFRESH_TOKEN!`),
  `app/api/cv/drive-upload/route.ts`, `lib/drive/sync.ts`, `lib/drive/parsers.ts`.
- **Trigger:** Any Drive call — the weekly cron `GET /api/dashboard/sync`
  (`vercel.json` schedule `0 6 * * 1`) and the `/cv` "upload to Drive" action.
- **Workaround:** None in code. Requires the user to re-run the OAuth consent flow and set a
  fresh refresh token. The `!` non-null assertion hides the missing-var case at compile time.

### Weekly bill-sync cron likely failing silently

- **Symptoms:** `GET /api/dashboard/sync` returns 401 unless `CRON_SECRET` is set and
  matches the `Authorization: Bearer` header Vercel injects; if it does authenticate it then
  calls `syncBills("all")` which hits the dead Drive token above.
- **Files:** `app/api/dashboard/sync/route.ts:8-19`, `vercel.json`, `lib/drive/sync.ts`.
- **Trigger:** Every Monday 06:00 UTC.
- **Workaround:** None. There is no sync-log surface (ISSUES.md A3 is unbuilt), no error
  alerting, and the cron result is discarded — a failing weekly job is invisible.
- **Fix approach:** Build A3 (`data/sync-log.json` + `/dashboard/sync` page), and make the
  cron post to a notification channel on non-2xx.

### `client.beta.messages.create` calls are not wrapped — unhandled rejection → bare 500

- **Symptoms:** In `app/api/cv/generate/route.ts` the Anthropic call at ~line 150 is not
  inside try/catch (only the JSON body parse and the response `.text` parse are guarded).
  A network error, rate-limit (429), or schema-refusal throws straight out of the handler.
- **Files:** `app/api/cv/generate/route.ts:150-206`. `enrich-profile`, `questions`, `angle`,
  `cover-letter` do wrap their calls — `generate` is the outlier.
- **Trigger:** Anthropic 429/5xx, or a profile that makes the model refuse the schema.
- **Impact:** User sees an opaque 500; B7's spec wants a "Generation failed — try again"
  banner. No retry/backoff anywhere.
- **Fix approach:** Wrap the call, map `Anthropic.APIError` status to a JSON error body,
  add one bounded retry on 429/5xx.

### Profile-shape casts throw deep in request handlers

- **Issue:** `app/api/cv/generate/route.ts:44-46` (`buildSkillsList`) and the
  `profile.experience as Array<…>` / `profile.referrals as Array<…>` casts assume an exact
  `data/profile.json` structure with no validation. A missing `skills` category or renamed
  field throws a `TypeError` inside the route.
- **Files:** `app/api/cv/generate/route.ts:44-90`, `lib/types.ts`, `lib/cv/profile-store.ts`.
- **Impact:** The profile editor (`/cv/profile`, `PATCH /api/cv/profile`) can write a shape
  that later breaks generation, with no guard rail. Relevant because `TODOS.md` D1–D3 all
  involve hand-editing this file.
- **Fix approach:** Define a Zod schema for `Profile` and validate on both read
  (`getProfile`) and write (`saveProfile`).

---

## Security Considerations

### Personal data exposed through weak-auth CV endpoints

- **Risk:** See "Two different auth checks" above. `data/profile.json` contains full
  employment history and named referrals with title/company; `data/applications.json`
  contains salary figures and application outcomes. All readable with a junk cookie.
- **Files:** `app/api/cv/export/route.ts`, `app/api/cv/profile/route.ts`,
  `app/api/cv/applications/route.ts`, `app/api/cv/versions/route.ts`.
- **Current mitigation:** Only obscurity — the endpoints are undocumented and the UI gates
  correctly.
- **Recommendations:** Strong token check everywhere (or middleware); treat
  `/api/cv/export` (dumps *everything* in one response) as the highest priority.

### Shared-password login with no rate limiting

- **Risk:** `POST /api/auth` compares a single `DASHBOARD_PASSWORD` with `!==` (not
  constant-time) and has no attempt throttling or lockout. Brute-forceable.
- **Files:** `app/api/auth/route.ts:5-9`.
- **Current mitigation:** None.
- **Recommendations:** Add rate limiting (Upstash Redis is already an available marketplace
  integration), use `crypto.timingSafeEqual`, consider a per-user credential model before
  the neighbour portal.

### LLM prompt-injection surface via scraped job pages

- **Risk:** `/api/cv/analyze-job` fetches an arbitrary user-supplied URL and feeds the page
  text to Claude; `/api/cv/generate` then feeds profile data alongside model output. A
  hostile job page can try to steer the model. Also SSRF: the fetch target is user
  controlled.
- **Files:** `app/api/cv/analyze-job/route.ts`, `scripts/test-jd-fetch.mjs`.
- **Current mitigation:** Output is schema-constrained (`json_schema` structured output),
  which limits blast radius.
- **Recommendations:** Block private/link-local IP ranges and non-http(s) schemes on the
  fetch; cap response size; keep the structured-output schema.
- **Smart Community President note:** The same pattern will apply to ingesting acta PDFs and
  administrador emails — untrusted documents into an LLM that can create/modify `OpenLoop`
  records. Design extraction as *propose-then-confirm*, never auto-commit (research Q3 in
  `.planning/research/questions.md` already flags this).

### Secrets handling — mostly sound, two soft spots

- **Good:** `.gitignore` covers `.env*`, `*.pem`, and every email-organizer secret
  (`config.json`, `credentials.json`, `token.json`, `processed.json`, `*.log`,
  `credential.json`); `scripts/email-organizer/config.example.json` documents shape without
  values.
- **Soft spot 1:** `scripts/sync-context.sh` interpolates `$PASSWORD` into a `curl -d`
  JSON string — the password is visible in the process list (`ps`) and shell history while
  the script runs. Prefer `--data @-` with a heredoc or `curl --config`.
- **Soft spot 2:** The repo root lives inside a Google Drive folder (per `.gitignore`
  comment "this folder lives inside Google Drive") — `.env` files and the git working tree
  are being synced to a third-party cloud outside git's control.
- **Files:** `scripts/sync-context.sh:30-33`, `.gitignore:34-49`.

### `next.config.ts` has no security headers

- **Risk:** No CSP, `X-Frame-Options`, `Referrer-Policy`, or HSTS configured. The
  authenticated dashboard is embeddable in an iframe.
- **Files:** `next.config.ts` (only `turbopack.root` and `serverExternalPackages`).
- **Recommendations:** Add a `headers()` block; at minimum `X-Frame-Options: DENY` and a
  baseline CSP for the authenticated areas.

---

## Performance Bottlenecks

### `@react-pdf/renderer` in serverless functions

- **Problem:** PDF rendering (`lib/cv/render.tsx`, `lib/cv/render-cover-letter.tsx`,
  `app/api/cv/render`, `app/api/cv/versions/[id]/pdf`, `app/api/cv/cover-letter/render`) is
  CPU- and memory-heavy and pulls a large dependency flagged in
  `next.config.ts` `serverExternalPackages`.
- **Files:** `next.config.ts:6`, `lib/cv/render.tsx`, `app/api/cv/versions/route.ts:35-41`.
- **Cause:** Font embedding + layout engine on a cold Lambda.
- **Improvement path:** Keep these routes on the Node runtime (not edge), consider caching
  the rendered PDF in Blob (already done for versions) and never re-rendering, monitor
  function duration/memory in Vercel.

### CV generation has no latency budget enforcement

- **Problem:** `POST /api/cv/generate` chains `getProfile()` (Blob round-trip with
  `useCache: false`) → one Sonnet call `max_tokens: 2048` with a large system prompt. B4's
  acceptance criterion is "under 15 seconds"; nothing enforces or measures it.
- **Files:** `app/api/cv/generate/route.ts`.
- **Improvement path:** Add server timing logs, set an explicit client timeout on the
  Anthropic call, consider streaming.

### Every Blob read forces `useCache: false`

- **Problem:** All stores read with `{ access: "private", useCache: false }` to dodge stale
  CDN copies (stable pathname + `allowOverwrite`). Each read is a full origin fetch.
- **Files:** `lib/cv/profile-store.ts:15`, `versions-store.ts:15`,
  `applications-store.ts:15`, `voice-store.ts:15`, `lib/drive/sync.ts:30`.
- **Impact:** Fine at current traffic; a hot path that calls `getProfile()` repeatedly
  (e.g. TODOS item 11's assistants injecting "Mi contexto" per message) will feel it.
- **Improvement path:** Add a short in-memory (per-lambda) TTL cache keyed by pathname, or
  switch to versioned pathnames + normal caching.

---

## Fragile Areas

### Vercel Blob private-vs-public access mode

- **Files:** all of `lib/cv/*-store.ts`, `lib/drive/sync.ts`,
  `app/api/cv/versions/route.ts`, `app/api/cv/versions/[id]/pdf/route.ts`.
- **Why fragile:** The project's Blob store is configured **private**. Commit `fb3f84d`
  fixed four stores that were calling `put()` with `access: "public"` — every write threw
  *"Cannot use public access on a private store"*, and reads must use `get()` (not
  `list()` + `fetch()` of the public URL, because a private blob's URL is not directly
  fetchable). The correct pattern is now:
  - write: `put(path, body, { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType })`
  - read: `get(path, { access: "private", useCache: false })`
  - serving a private file to the browser needs a proxy route (see
    `app/api/cv/versions/[id]/pdf/route.ts`) — you cannot hand the client a blob URL.
- **Safe modification:** Copy an *already-fixed* store
  (`lib/cv/profile-store.ts` is the reference) — never an old snippet or the SDK docs'
  default examples, which show `access: "public"`. Extract the read/write pair into a
  generic `lib/blob-json.ts<T>(pathname)` helper so the access mode is defined once.
- **Test coverage:** None. This regressed silently once already.
- **Smart Community President note:** Acta/presupuesto PDF storage and the open-loop JSON
  store must use this same private pattern + proxy route from day one.

### `lib/drive/client.ts` OAuth token plumbing

- **Files:** `lib/drive/client.ts` (token-based helpers, `DriveClient` singleton),
  `lib/drive/parsers.ts`.
- **Why fragile:** Non-null assertion on `GOOGLE_REFRESH_TOKEN` hides the missing/expired
  case; manual OAuth refresh flow; parsers depend on exact Spanish bill PDF layouts
  (ISSUES.md A4 notes energy bills are commented out because the format/folder is unknown).
- **Safe modification:** Add an explicit "is Drive configured and token valid" probe that
  returns a typed error the routes can surface, instead of asserting.

### `app/dashboard/bills/page.tsx` — mixed dark/light theme

- **Files:** `app/dashboard/bills/page.tsx` (`<h1>` is `text-white`, "Energy Bill Detail"
  card is `bg-neutral-900`), while `DashboardShell`/`Sidebar`/`StatCard` are already
  migrated to `stone-*`.
- **Why fragile:** `TODOS.md` item 10 update (2026-08-03) flags this — the light-theme
  migration is half-done; `text-white` on `bg-stone-50` is invisible. Any dashboard visual
  work must finish this, not build on top of the inconsistent state.

### Dashboard has zero responsive support

- **Files:** `app/components/dashboard/DashboardShell.tsx`,
  `app/components/dashboard/Sidebar.tsx` (fixed `ml-60`, no breakpoints, no hamburger).
- **Why fragile:** `TODOS.md` item 11b — every new dashboard page (and a Smart Community
  President cockpit if it reuses the shell) inherits a broken mobile layout.

---

## Scaling Limits

### Single-user, single-writer assumptions everywhere

- **Current capacity:** One authenticated user (shared password, shared token, whole-file
  JSON rewrites, no locking).
- **Limit:** Breaks with any concurrent writer or per-identity access. The
  `.planning/seeds/neighbour-incidencia-portal.md` explicitly anticipates neighbour
  submissions — that is the point where `data/*.json` + shared-password auth stops working.
- **Scaling path:** Move to Neon Postgres (available via Vercel marketplace), add
  per-owner identity, keep president-internal fields off any neighbour-visible entity (the
  data-model sketch already separates `OpenLoop` from `Submission`).

### Vercel function limits on PDF generation

- **Current capacity:** Occasional single-user PDF renders.
- **Limit:** `@react-pdf/renderer` memory + duration under Hobby/Pro function caps if
  batch-rendering is ever added.
- **Scaling path:** Cache aggressively in Blob; move to a queue/background job if bulk
  export appears.

---

## Dependencies at Risk

### `@anthropic-ai/sdk@^0.105.0` — floating, uses beta APIs

- **Risk:** `^` allows any 0.x minor; code depends on `client.beta.messages.create`,
  `output_config`, and `betas: ["structured-outputs-2025-12-15"]` which are pre-GA.
- **Impact:** A routine `npm update` can break every LLM route at once.
- **Migration plan:** Pin exact version; wrap the client + model id + beta flags in one
  `lib/cv/anthropic.ts`; track the structured-output beta's GA and migrate off the flag.

### `next@16.2.4` / `react@19.2.4` — very new majors

- **Risk:** `AGENTS.md` warns APIs differ from common knowledge; limited community
  troubleshooting for this exact version.
- **Impact:** Framework-level surprises during any upgrade or new-feature work.
- **Migration plan:** Stay on the exact pinned version until a deliberate upgrade phase;
  read `node_modules/next/dist/docs/` before routing/caching changes.

### `pdf-parse@^1.1.1` + `@types/pdf-parse`

- **Risk:** `pdf-parse@1.x` is long-unmaintained and has a known debug-mode file-read
  quirk on import.
- **Impact:** `app/api/cv/parse-pdf/route.ts` and bill parsing depend on it.
- **Migration plan:** Evaluate `unpdf` or `pdfjs-dist` if parsing gets more use.

---

## Missing Critical Features

### No shared auth primitive / middleware

- **Problem:** Covered above — there is no single enforcement point. This is the top
  structural gap.
- **Blocks:** Safe addition of any new authenticated surface, including Smart Community
  President.

### No error monitoring / alerting

- **Problem:** No Sentry or equivalent; the private-store bug was diagnosed by manually
  reading Vercel runtime logs (per `fb3f84d`). The weekly cron's failures are invisible.
- **Blocks:** Knowing when Blob writes, Drive sync, or LLM calls start failing in
  production.

### No sync-run visibility

- **Problem:** ISSUES.md A3 (`data/sync-log.json` + `/dashboard/sync`) is unbuilt; both
  `scripts/email-organizer/monthly_update.sh` and `scripts/sync-context.sh` are on-demand,
  manual, and easy to forget — which is why `data/profile.json` drifted months stale.
- **Blocks:** Trusting that repo data matches production Blob state.

---

## Test Coverage Gaps

Everything is untested. Highest-risk gaps, in priority order:

| # | Untested area | Files | Risk | Priority |
|---|---------------|-------|------|----------|
| 1 | API route authentication | all `app/api/**/route.ts` | Weak-vs-strong check drift already shipped; a regression exposes personal data | High |
| 2 | Blob store read/write round-trip + access mode | `lib/cv/*-store.ts`, `lib/drive/sync.ts` | `access:"public"` on a private store regressed once, silently | High |
| 3 | `Profile` shape validation | `lib/types.ts`, `app/api/cv/profile/route.ts`, `app/api/cv/generate/route.ts` | Hand-edited JSON breaks generation at runtime | High |
| 4 | LLM route error handling | `app/api/cv/generate/route.ts` (unwrapped call) | 429/5xx → bare 500, no retry | Medium |
| 5 | Drive OAuth "is configured" path | `lib/drive/client.ts` | `!` assertion hides dead token | Medium |
| 6 | `analyze-job` URL fetch (SSRF / size) | `app/api/cv/analyze-job/route.ts` | User-controlled fetch target | Medium |
| 7 | `sync-context.sh` diff/commit/push logic | `scripts/sync-context.sh` | `set -euo pipefail` + `git push` in a script; a bad export could commit truncated JSON | Low |

---

*Concerns audit: 2026-09-08*
