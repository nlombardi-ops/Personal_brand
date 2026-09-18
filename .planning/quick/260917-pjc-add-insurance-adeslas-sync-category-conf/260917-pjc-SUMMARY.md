---
phase: quick-260917-pjc
plan: 01
subsystem: dashboard-bills-sync
tags: [insurance, adeslas, drive-sync, scaffolding]
status: complete
dependency-graph:
  requires: []
  provides:
    - lib/types.ts: InsuranceBill interface, BillsData.insurance (optional)
    - lib/drive/parsers.ts: parseAdeslasBill
    - lib/drive/sync.ts: syncInsurance, FOLDERS.insurance placeholder, widened syncBills/SyncResult
  affects:
    - app/api/dashboard/sync/route.ts (POST category allow-list)
    - app/dashboard/bills/page.tsx (buildRows insurance folding)
    - app/components/dashboard/BillsTable.tsx (Insurance column)
tech-stack:
  added: []
  patterns:
    - "Conservative parser stub: label-anchored regex only, bail to null on ambiguity (no catch-all fallback)"
    - "Optional field on a long-lived stored document type, defaulted with ?? [] at every read site"
key-files:
  created: []
  modified:
    - scripts/email-organizer/config.example.json
    - scripts/email-organizer/sync_bills.py
    - lib/types.ts
    - data/bills.json
    - lib/drive/parsers.ts
    - lib/drive/sync.ts
    - app/api/dashboard/sync/route.ts
    - app/dashboard/bills/page.tsx
    - app/components/dashboard/BillsTable.tsx
decisions:
  - "InsuranceBill kept narrow (month, total, provider, optional policy) — does not mirror InsurancePolicy, a different static-metadata interface reading from data/insurance.json"
  - "FOLDERS.insurance ships as an explicit null placeholder, never a fabricated Drive ID; syncBills only calls syncInsurance when the ID is truthy"
  - "parseAdeslasBill returns null rather than guessing when amount or month is missing — no catch-all 'first euro amount' fallback, since a wrong-but-plausible number is worse than an empty cell"
  - "sync_bills.py (Python) gets a comment-only note, no executable insurance parser — matches its existing precedent of lagging the TS pipeline (it never got an energy parser either)"
metrics:
  duration: "~35min"
  completed: 2026-09-18
---

# Phase quick-260917-pjc Plan 01: Insurance/Adeslas Sync Category Scaffold Summary

Scaffolded a fourth "Insurance" category (SegurCaixa Adeslas) through the email→Drive→dashboard
bill pipeline end to end — config template, type, conservative parser stub, Drive sync branch, and
dashboard column — with the Drive folder ID and real sender address deliberately left as
placeholders so no fabricated data enters the pipeline.

## What Was Built

**Task 1 — Config, type, seed key** (`63bef54`)
- `scripts/email-organizer/config.example.json`: added an `Insurance` provider entry with an
  empty `senders` array (the real Adeslas sender is personal data, kept out of the repo).
- `lib/types.ts`: added `InsuranceBill { month, total, provider, policy? }` and an optional
  `BillsData.insurance?: InsuranceBill[]`, with a comment explaining the optional-ness (the
  production Blob document and the committed seed both predate the field).
- `data/bills.json`: added `"insurance": []` alongside the existing three category arrays.
- `scripts/email-organizer/sync_bills.py`: one comment-only line noting the insurance category
  lives on the TypeScript side only — no executable Python added.

**Task 2 — Parser stub + Drive sync wiring** (`bcc7924`)
- `lib/drive/parsers.ts`: `parseAdeslasBill(text)` — normalizes text, tries three label-anchored
  amount patterns and two month patterns, returns `null` on any ambiguity. No catch-all fallback,
  by design: a template nobody has seen could otherwise have a coverage limit or tax base mistaken
  for the bill total.
- `lib/drive/sync.ts`: `FOLDERS.insurance` is an explicit `null` placeholder (typed
  `string | null`); `syncInsurance(drive, folderId: string)` mirrors `syncEnergy`'s per-file
  try/catch skip pattern; `syncBills` reads `current.insurance ?? []`, only syncs when the folder
  ID is truthy, and reports the count in the widened `SyncResult`.
- `app/api/dashboard/sync/route.ts`: `POST` now accepts `"insurance"` as a targeted sync category.

**Task 3 — Dashboard column** (`a27ef5e`)
- `app/dashboard/bills/page.tsx`: `buildRows()` folds `billsData.insurance` (optional-chained)
  into the shared months set and per-row totals.
- `app/components/dashboard/BillsTable.tsx`: `BillRow` gained `insurance: number`; a rose-colored
  Insurance column was added between Internet and Total in the header, body, and footer. Renders
  as an em dash (`—`) today via the existing `fmt()` helper, and will fill in automatically once
  real bills land. `StatCard` grid (fixed 4-card layout) and `StackedBarChart` were intentionally
  left untouched — a fifth stat card or chart series is only worth adding once real insurance data
  exists.

## Deviations from Plan

None — plan executed exactly as written. One documentation-only addition: a short comment was
added to `BillRow.insurance` in `BillsTable.tsx` naming the field's purpose and provenance
(quick-260917-pjc), consistent with the repo's existing "explain non-obvious decisions" comment
convention.

### Deferred (out of scope)

`npm run lint` across the whole repo reports 4 pre-existing errors and 6 warnings in files this
plan never touched (`app/components/Contact.tsx`, `app/components/References.tsx`,
`app/components/cv/CvPreview.tsx`, `app/cv/page.tsx`, `app/dashboard/mortgage/page.tsx`,
`lib/cv/render.tsx`). Per the scope boundary rule, these were not fixed — logged to
`.planning/quick/260917-pjc-add-insurance-adeslas-sync-category-conf/deferred-items.md`.
`npx eslint` run directly against every file this plan touched (`lib/drive/parsers.ts`,
`lib/drive/sync.ts`, `app/api/dashboard/sync/route.ts`, `app/dashboard/bills/page.tsx`,
`app/components/dashboard/BillsTable.tsx`) returns zero errors/warnings.

## Verification

- `npx tsc --noEmit` — exits 0 (repo-wide, strict mode).
- `npx eslint` on all nine touched files — exits 0, zero output.
- `git diff --stat` across the three task commits — exactly the nine files in `files_modified`,
  134 insertions / 9 deletions, nothing else.
- `grep -n "insurance" lib/drive/sync.ts` — `FOLDERS.insurance` is `null`, never a real-looking ID.
- `grep -n "senders" scripts/email-organizer/config.example.json` — Insurance entry's array is
  empty; no personal sender address committed.
- `git diff` on `scripts/email-organizer/sync_bills.py` — one comment line only.
- `git diff` on `data/bills.json` — one added key (`"insurance": []`), all pre-existing bill
  entries byte-for-byte unchanged.
- Nothing was executed against IMAP, Google Drive, or the network — no `organizer.py`,
  `sync_bills.py`, `monthly_update.sh`, or `POST /api/dashboard/sync` was run.

## Known Stubs

- `parseAdeslasBill` in `lib/drive/parsers.ts` always returns `null` today — its regex patterns
  are unverified guesses (no real Adeslas document exists in the repo). This is the plan's
  intended, documented behaviour, not an oversight: the alternative (a guessing fallback) risks
  writing wrong money into `bills.json`. Resolved once a real sample is captured and the patterns
  are tightened (see the comment block above the function).
- `FOLDERS.insurance` is `null` — the sync is inert until a real Drive folder ID is pasted in.
  Intended and documented.

## Threat Flags

None — all new surface (parser, sync branch, POST category) is covered by the plan's threat
model (T-INS-01 through T-INS-05); no additional surface was introduced beyond what was planned.

## Handoff — Remaining Manual Steps

Four steps remain, all manual and outside this plan's scope (no network/IMAP/Drive calls were
made):

1. Add the real Adeslas sender address to the local, gitignored `config.json` under the
   `Insurance` provider key.
2. Run `organizer.py` once to create the Drive folder (named from the `Insurance` config key)
   and land real emails.
3. Paste the resulting folder ID into `FOLDERS.insurance` in `lib/drive/sync.ts` (replacing
   `null`) — until then the insurance sync stays intentionally inert.
4. Tighten `parseAdeslasBill`'s regex patterns in `lib/drive/parsers.ts` against a real captured
   sample, using `sync_bills.py --peek` to inspect extracted text first.

## Self-Check: PASSED

Created/modified files verified present on disk; all three task commits verified in `git log`.
