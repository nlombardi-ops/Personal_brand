# Testing Patterns

**Analysis Date:** 2026-09-08

## Current State: No Automated Tests

There is **no test framework, no test files, and no test tooling** in this repository as of the analysis date.

Evidence:
- `package.json` `scripts` block contains only `dev`, `build`, `start`, `lint`. No `test` script.
- No `jest`, `vitest`, `@testing-library/*`, `playwright`, `cypress`, `mocha`, or `node:test` usage in `dependencies` or `devDependencies`.
- No config files: no `jest.config.*`, `vitest.config.*`, `playwright.config.*`, `.mocharc*`.
- No `*.test.ts(x)`, `*.spec.ts(x)`, `__tests__/`, or `test/` directories anywhere (`app/`, `lib/`, `scripts/`).
- `.planning/codebase/` contains no prior TESTING doc.

## What Serves As Verification Today

**Runner:** Not applicable.

**Manual / tooling checks in use:**
```bash
npm run lint     # eslint (flat config, eslint-config-next core-web-vitals + typescript)
npm run build    # next build — TypeScript strict typecheck + production build
npm run dev      # next dev — local manual testing
```

- **TypeScript `strict: true`** (`tsconfig.json`) is the main automated safety net. `next build` fails on type errors.
- **ESLint** (`eslint.config.mjs`) catches lint / core-web-vitals issues.
- **`ISSUES.md`** encodes acceptance criteria as manual checkbox lists per work item (e.g. "A dry-run has been verified (script runs, detects no new bills, exits cleanly)"). Verification is HITL, done by running the feature.
- **Deployment smoke:** Vercel auto-deploys on push to `main`; the Vercel Cron job (`vercel.json`, `/api/dashboard/sync` weekly) acts as a recurring integration exercise of the Drive-sync path.
- `scripts/email-organizer/` Python pipeline is verified by dry-run per `SETUP.md` (referenced in `ISSUES.md`, not yet in repo at analysis time).

## Test File Organization

Not established. If introducing tests, no existing convention constrains you. Given the codebase layout, co-locating (`lib/cv/cost.test.ts`) or a top-level `__tests__/` both fit.

## Highest-Value Targets If Tests Are Added

Pure, dependency-free logic — unit-testable with no mocking:
- `lib/cv/cost.ts` — `calcCostUsd` (rate table lookup + fallback math)
- `lib/drive/parsers.ts` — PDF field parsing (`lib/drive/`)
- `app/api/cv/generate/route.ts` — `buildSkillsList`, `profileText` / `jobText` formatting helpers (currently module-private; would need export)
- `app/components/dashboard/SyncButton.tsx` — `fmtMonth` date formatting

Integration-worthy (need mocking of `@vercel/blob` and `fs`):
- `lib/cv/*-store.ts` — the Blob-or-local dual-mode fork and error fallbacks
- API route auth guards (cookie value vs. `DASHBOARD_TOKEN`, cron `Bearer` header)

External-boundary (mock the SDK):
- Anthropic calls in `app/api/cv/generate`, `analyze-job`, `angle`, `cover-letter`, `enrich-profile`, `questions` — mock `@anthropic-ai/sdk` `client.beta.messages.create`, assert schema/prompt construction, test the `JSON.parse` failure → 500 path.

## Recommended Setup (if/when tests are wanted)

- **Vitest** — aligns with the ESM / `esnext` / bundler-resolution config in `tsconfig.json`, supports the `@/*` path alias via `vite-tsconfig-paths`, fast.
- Add `"test": "vitest"` and `"test:watch": "vitest --watch"` to `package.json`.
- Mock strategy: `vi.mock("@vercel/blob")`, `vi.mock("@anthropic-ai/sdk")`, `vi.mock("node:fs")`. Do NOT mock the pure `lib/` utils.
- For route handlers, import the exported `GET`/`POST` and call with a constructed `NextRequest` (`new NextRequest(url, { headers, ... })`); assert on `NextResponse` status and parsed JSON body.
- Coverage: none enforced today; start with the pure-logic modules above before targeting a threshold.

## Mocking

No framework in place. See recommended strategy above.

## Fixtures and Factories

None. Real data samples live in `data/*.json` (bills, CV versions, profile) and could seed fixtures. `docs/voice-profile.md` holds reference content for the CV voice feature.

## Test Types

- **Unit:** none
- **Integration:** none (Vercel Cron `/api/dashboard/sync` is the closest thing to a live integration check)
- **E2E:** none

---

*Testing analysis: 2026-09-08*
