---
phase: quick-260924-nkt
plan: 01
subsystem: ui
tags: [nextjs, react, anthropic-sdk, cv-builder, chat]

requires: []
provides:
  - "POST /api/cv/answer-chat — strong-auth, stateless chat that drafts paste-ready application-form answers grounded in the CV profile"
  - "/cv/answers page — job-context step, length selector, chat with per-reply copy"
  - "Application Q&A entry in the CV sidebar nav (desktop aside + mobile drawer)"
affects: [cv-builder]

tech-stack:
  added: []
  patterns:
    - "Answer-chat route mirrors contracts-chat's guard order (strong cookie check before any private-data read) and cover-letter's context-building style (profileContext/jobContext string blocks, banned-words contract)"
    - "job_analysis arrives from the client and is treated as untrusted reference data — buildJobContext coerces scalars and guards array joins instead of trusting the shape"

key-files:
  created:
    - app/api/cv/answer-chat/route.ts
    - app/cv/answers/page.tsx
  modified:
    - app/components/cv/CvSidebar.tsx

key-decisions:
  - "Strong three-part cookie check (cookie exists AND value === DASHBOARD_TOKEN) used for answer-chat, not the presence-only check some older /api/cv/* routes use, because this route reads the private profile and voice samples"
  - "Chat is fully stateless — no store module, no history endpoint — reloading /cv/answers clears the conversation by design"

requirements-completed: [QUICK-CVQA-01]

coverage:
  - id: D1
    description: "answer-chat route drafts a grounded, paste-ready first-person answer and enforces the strong DASHBOARD_TOKEN check"
    requirement: "QUICK-CVQA-01"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (app/api/cv/answer-chat/route.ts)"
        status: pass
      - kind: manual_procedural
        ref: "human-check in PLAN.md Task 2: chip -> ~150-word reply, Copy button, Short vs Long length difference, job-grounded reply after analysis"
        status: unknown
    human_judgment: true
    rationale: "Reply quality (voice match, groundedness, length tolerance) needs a human to read the actual model output; not asserted by any automated test in this repo (no test infra exists)."
  - id: D2
    description: "/cv/answers renders job-context step, length selector, and chat; stacks with no horizontal scroll at 390px"
    requirement: "QUICK-CVQA-01"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit && npx eslint app/cv/answers"
        status: pass
    human_judgment: true
    rationale: "Visual layout/stacking at 390px and clipboard copy UX require a human to view the rendered page; no UI test infra exists in this repo."
  - id: D3
    description: "Application Q&A sidebar entry appears after Cover Letter, before My Profile, active on /cv/answers, in both desktop aside and mobile drawer"
    requirement: "QUICK-CVQA-01"
    verification:
      - kind: unit
        ref: "grep position + count assertions in PLAN.md Task 3 verify block"
        status: pass
    human_judgment: false

duration: ~15min
completed: 2026-09-24
status: complete
---

# Quick Task 260924-nkt: Application Q&A chat for the CV surface Summary

**New `/cv/answers` page adds a stateless chat, backed by `POST /api/cv/answer-chat`, that drafts paste-ready first-person answers to job-application questions grounded in the owner's CV profile, voice guide and voice samples, with an optional job-context step.**

## Performance

- **Duration:** ~15min
- **Completed:** 2026-09-24T15:07:21Z
- **Tasks:** 3/3 completed
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- Added `app/api/cv/answer-chat/route.ts`: a strong-auth, stateless POST handler that grounds every reply in `getProfile()`, `getVoiceSamples()` and `getVoiceProfileGuide()`, optionally folds in a client-supplied `job_analysis` as labelled reference data, clamps `target_words` into `[50, 400]`, and carries the same `BANNED_WORDS`/`BANNED_PHRASES` anti-AI-fingerprint contract as the cover-letter route.
- Built `app/cv/answers/page.tsx`: a two-panel CV-surface page — job-context (URL or paste, reusing `/api/cv/analyze-job`) and a Short/Medium/Long length selector on the left, a suggestion-chip chat with per-reply Copy-to-clipboard on the right — matching the cover-letter page's stone palette and `md:h-screen md:flex-row` mobile stacking.
- Added an `Application Q&A` entry (`MessageSquare` icon) to `CvSidebar`'s shared `NAV` array, positioned between Cover Letter and My Profile, active on both the desktop aside and the mobile drawer.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the answer-chat API route** - `eac97d6` (feat)
2. **Task 2: Build the /cv/answers page** - `b0ae36b` (feat)
3. **Task 3: Add the sidebar nav entry** - `1c682d9` (feat)

**Plan metadata:** committed separately by the orchestrator (docs-only commit)

## Files Created/Modified

- `app/api/cv/answer-chat/route.ts` - Strong-auth POST handler; builds PROFILE/JOB context blocks and calls `claude-sonnet-4-6` to draft an answer, returns `{ reply, _cost_usd }`
- `app/cv/answers/page.tsx` - Client page: job-context step, length selector, chat with suggestion chips and per-reply copy
- `app/components/cv/CvSidebar.tsx` - `NAV` gains the Application Q&A entry after Cover Letter

## Decisions Made

- Strong three-part cookie check for `/api/cv/answer-chat` (matches contracts-chat, not the weaker presence-only check on some older `/api/cv/*` routes) because this route reads the private profile and voice samples.
- Nothing persisted — the chat is stateless by design; no store module, no history endpoint, reload clears the conversation.

## Deviations from Plan

None — plan executed exactly as written. All three files match the plan's `files_modified` list exactly; no new dependencies were added.

## Issues Encountered

**Repo-wide `npm run lint` fails on four pre-existing errors unrelated to this plan** (`app/components/Contact.tsx`, `app/components/References.tsx`, `app/cv/page.tsx`, plus warnings in `CvPreview.tsx`, `app/dashboard/mortgage/page.tsx`, `lib/cv/render.tsx`). Confirmed via `git stash` before making any change in this session that these failures pre-date this task and live entirely outside this plan's three `files_modified` paths. Per the executor's scope-boundary rule, these were not touched. Logged in full at `.planning/quick/260924-nkt-add-application-q-a-chat-to-cv-surface/deferred-items.md`.

- `npx tsc --noEmit` — clean, full repo.
- `npx eslint app/api/cv/answer-chat` — clean.
- `npx eslint app/cv/answers` — clean.
- `npx eslint app/components/cv/CvSidebar.tsx` — clean.
- `npm run lint` (full repo) — 4 pre-existing errors / 6 pre-existing warnings, none in files this plan touched (verified pre-existing via `git stash`).

## Known Stubs

None — no hardcoded empty values, placeholder text, or unwired data sources introduced. The `/cv/answers` chat is intentionally stateless (no persistence) per the plan's objective, not a stub.

## Threat Flags

None beyond what the plan's own `<threat_model>` already covers (T-QUICK-nkt-01 through 05, SC). No new network endpoints, auth paths, or schema changes outside that register were introduced.

## User Setup Required

None — no new environment variables or external service configuration. Route reuses `ANTHROPIC_API_KEY` and `DASHBOARD_TOKEN`, already required by sibling `/api/cv/*` routes.

## Next Phase Readiness

`/cv/answers` is live behind the existing CV auth gate. Manual smoke verification (chip click, length toggle, job-context grounding, 390px layout, clipboard copy) from the plan's Task 2 `human-check` is still outstanding and should be run by the owner before relying on this in a live application.

---
*Phase: quick-260924-nkt*
*Completed: 2026-09-24*

## Self-Check: PASSED

All created files and task commit hashes verified present on disk / in `git log`.
