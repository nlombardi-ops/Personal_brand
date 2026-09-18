---
phase: 02-documents-presupuestos-workflow
plan: 02
subsystem: ui
tags: [nextjs, react, framer-motion, lucide-react, node-test]

# Dependency graph
requires:
  - phase: 02-01
    provides: Document type, dual-mode documents-store.ts, document-defaults.ts (validateDocumentInput/applyDocumentPatch/PATCHABLE_DOCUMENT_KEYS), PATCH /api/community/documents/[id], DocumentUpload/DocumentList/DocumentRow components
provides:
  - documentsForLoop/attachLoopId/detachLoopId pure array helpers (lib/community/document-defaults.ts) — the single loop<->document resolution and wholesale-replace-array builders
  - LoopDetailPanel.tsx — D-17 "detail mode" panel, separate component from LoopSlideOver, 680/880px wide
  - AttachDocumentControl.tsx — attach-from-library, upload-and-auto-attach, and detach, all through the existing PATCH endpoint
  - DocumentRow.tsx document-side loop assignment/unassignment (Bucles line + picker)
  - LoopCard.tsx Detalle affordance + paperclip attachment-count chip
  - Server-side documentsByLoop/libraryDocuments/attachmentCounts resolution in page.tsx
affects: [02-03, any future phase reading loop<->document attachments]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "documentsForLoop is the single loop->documents resolution function — the detail panel list and the board attachment-count chip both call it so they can never disagree"
    - "attachLoopId/detachLoopId dedup-append/remove array builders used symmetrically on both the loop side (AttachDocumentControl) and the document side (DocumentRow) before PATCHing the complete new linked_loop_ids array"
    - "A second, separate motion-wrapper component (LoopDetailPanel) sharing only the framer-motion shell + focus-trap with LoopSlideOver, instead of forking LoopSlideOver with a mode prop (RESEARCH A4)"

key-files:
  created:
    - app/components/community/LoopDetailPanel.tsx
    - app/components/community/AttachDocumentControl.tsx
  modified:
    - lib/community/document-defaults.ts
    - lib/community/document-defaults.test.ts
    - app/components/community/Cockpit.tsx
    - app/components/community/LoopCard.tsx
    - app/components/community/LoopColumn.tsx
    - app/components/community/NoDateSection.tsx
    - app/components/community/DocumentRow.tsx
    - app/components/community/DocumentList.tsx
    - app/community-president/page.tsx
    - app/community-president/documentos/page.tsx

key-decisions:
  - "AttachDocumentControl centralizes BOTH the attach and detach PATCH calls and renders the attached-document rows itself (title/type/size/Ver/Quitar); LoopDetailPanel only renders the DOCUMENTOS section label and the zero-attachments empty state before mounting the control. This avoids duplicating the PATCH fetch logic across two components while satisfying the plan's per-file grep gates (AttachDocumentControl.tsx alone shows 2+ linked_loop_ids occurrences: one attach, one detach)."
  - "The Detalle button sits inside the existing quick-actions row (the pointer-events-auto z-20 cluster next to QuickActions), not literally inside the pointer-events-none content layer — the plan's own description ('re-enables its own pointer events and stops propagation') matches exactly how that row already works for QuickActions' children."
  - "Task 2's AttachDocumentControl empty-library dead end is replaced by mounting DocumentUpload inline (loopId set) rather than a link to the Documentos section, per D-01 — a loop with zero library documents still has a one-step way forward."

patterns-established:
  - "documentsForLoop is the single source of truth for loop->document resolution; any future attachment count or list on the community surface must call it rather than re-filtering the raw documents array."

requirements-completed: [LOOP-02]

coverage:
  - id: D1
    description: "From any OpenLoop, Nicola opens a wider detail panel (separate component from the quick-edit slide-over) that lists the loop's non-archived, newest-first documents and opens each inline via the existing authenticated proxy; from that panel he attaches a document picked from the library (presupuesto-typed sorted first) and detaches one, both through a single whole-array PATCH."
    requirement: "LOOP-02"
    verification:
      - kind: unit
        ref: "lib/community/document-defaults.test.ts#documentsForLoop / attachLoopId / detachLoopId suite (11 new tests, 35/35 total passing)"
        status: pass
      - kind: other
        ref: "grep gates: no attach/detach/link endpoint, no dangerouslySetInnerHTML, no <form> in LoopDetailPanel, min-h-0 + overflow-y-auto present, desktop width >420px, LoopSlideOver Props unchanged — all pass; npx tsc --noEmit and the path-scoped eslint both exit 0"
        status: pass
      - kind: manual_procedural
        ref: "PLAN 02-02 Task 1 human-check: open Detalle on a loop, attach/view/detach a document, verify idempotent double-attach, verify 390px layout"
        status: unknown
    human_judgment: true
    rationale: "Live UI interaction (panel slide-in animation, inline document preview in a new tab, mobile layout at 390px/1440px) needs visual confirmation with a running dev server and a Blob token — not available in this execution environment. Automated coverage (unit tests + grep/tsc/eslint gates) proves the resolution logic and the structural/security invariants; the human-check items are UAT."
  - id: D2
    description: "Nicola uploads a new file straight from a loop's detail panel (auto-attaches in one action, D-01) and manages the same links from the document's side in Documentos (assign/unassign loops on a document row, same endpoint, same helpers)."
    requirement: "LOOP-02"
    verification:
      - kind: other
        ref: "grep gates: DocumentUpload mounted with loopId in AttachDocumentControl, no raw upload() call, attachLoopId/detachLoopId used in DocumentRow, getOpenLoops read in documentos/page.tsx, still zero attach/detach/link endpoints — all pass; tsc/eslint clean"
        status: pass
      - kind: manual_procedural
        ref: "PLAN 02-02 Task 2 human-check: upload from a loop's panel and confirm it appears attached without visiting Documentos; assign/unassign a document to two loops from its Documentos row"
        status: unknown
    human_judgment: true
    rationale: "Requires a live Vercel Blob token and a running dev server to exercise the actual upload path and visually confirm both surfaces reflect the same link state after router.refresh() — not available in this execution environment."
  - id: D3
    description: "The board shows a paperclip + count chip on any loop with at least one non-archived attachment, derived from the same documentsForLoop resolution the panel uses, purely informational (not clickable, no zero-chip)."
    requirement: "LOOP-02"
    verification:
      - kind: other
        ref: "grep gates: Paperclip imported+used exactly twice, attachmentCount(s) threaded through LoopCard/LoopColumn/NoDateSection/Cockpit/page.tsx, documentsForLoop is the only counting source, no onClick on the chip — all pass; tsc/eslint clean"
        status: pass
      - kind: manual_procedural
        ref: "PLAN 02-02 Task 3 human-check: attach/archive documents and confirm the chip count updates and disappears at zero; confirm clicking the chip does nothing and the card body still opens the quick-edit slide-over"
        status: unknown
    human_judgment: true
    rationale: "Visual confirmation of the chip appearance/count/disappearance and click-target isolation needs a running dev server — not available in this execution environment."

duration: 62min
completed: 2026-09-18
status: complete
---

# Phase 2 Plan 2: Loop <-> Document Attachment (LOOP-02) Summary

**A wider "detail mode" panel (separate component from the quick-edit slide-over) that lists and opens a loop's attached documents, attach/upload/detach in both directions through one whole-array PATCH endpoint, and a paperclip count chip on the board.**

## Performance

- **Duration:** ~62 min
- **Completed:** 2026-09-18
- **Tasks:** 3
- **Files modified:** 12 (2 created, 10 modified)

## Accomplishments

- `documentsForLoop`/`attachLoopId`/`detachLoopId` pure helpers in `lib/community/document-defaults.ts` — the single loop-to-document resolution and the single wholesale-replace-array builders every attach/detach call site (loop side and document side) uses
- `LoopDetailPanel.tsx` — a new, separate D-17 "detail mode" panel (680px/880px wide vs the 420px quick-edit slide-over), sharing only the framer-motion wrapper + focus-trap with `LoopSlideOver`, showing next action/due and the loop's resolved, non-archived, newest-first documents with a Spanish empty state
- `AttachDocumentControl.tsx` — attach from a library picker (presupuesto-typed documents sorted first), upload-and-auto-attach via the existing `DocumentUpload` component (one action, D-01), and detach — all PATCHing the complete new `linked_loop_ids` array to the single existing `PATCH /api/community/documents/[id]` endpoint; no new endpoint anywhere
- `DocumentRow.tsx` gains the document side of D-05: a "Bucles" line listing the loops a document is linked to (with per-loop Quitar) and an "Asignar a un bucle" picker; an unlinked document reads "Sin bucle asignado" as a normal state, never a warning
- `LoopCard.tsx` gains a "Detalle" affordance (opens the panel) and, when a loop has one or more non-archived attachments, a small paperclip + count chip in the existing meta row — purely informational, not clickable, disappears entirely at zero
- `lib/community/document-defaults.test.ts`: 35/35 `node --test` assertions passing (24 pre-existing + 11 new for `documentsForLoop`/`attachLoopId`/`detachLoopId`)

## Task Commits

Each task was committed atomically, with Task 1 split into a RED test commit and a GREEN implementation commit per its `tdd="true"` marking:

1. **Task 1 (RED): failing tests for documentsForLoop/attachLoopId/detachLoopId** - `a5fd3be` (test)
2. **Task 1 (GREEN): open a loop's detail panel, list its documents, attach one from the library** - `efba31c` (feat)
3. **Task 2: upload a new file straight from a loop, and manage the same links from the document side** - `cba103c` (feat)
4. **Task 3: the board shows at a glance which loops have paperwork** - `517a1e7` (feat)

## Files Created/Modified

- `lib/community/document-defaults.ts` — added `documentsForLoop`, `attachLoopId`, `detachLoopId`
- `lib/community/document-defaults.test.ts` — 11 new tests for the three helpers above
- `app/components/community/LoopDetailPanel.tsx` (new) — the D-17 detail-mode panel
- `app/components/community/AttachDocumentControl.tsx` (new) — pick-from-library / upload-and-auto-attach / detach, both entry points from D-05
- `app/components/community/Cockpit.tsx` — `detailLoop` state, `openDetail`/`closeDetail`, mounts `LoopDetailPanel` as a sibling of `LoopSlideOver`, threads `documentsByLoop`/`libraryDocuments`/`attachmentCounts`
- `app/components/community/LoopCard.tsx` — `Detalle` button + paperclip attachment-count chip
- `app/components/community/LoopColumn.tsx` / `NoDateSection.tsx` — thread `onOpenDetail` and `attachmentCounts` to `LoopCard`
- `app/components/community/DocumentRow.tsx` — `Bucles` assignment/unassignment section (document side of D-05), exports the `LoopSummary` type
- `app/components/community/DocumentList.tsx` — forwards the new `loops` prop
- `app/community-president/page.tsx` — Server Component now also reads `getDocuments()`, resolves `documentsByLoop`/`libraryDocuments`/`attachmentCounts` server-side for first paint
- `app/community-president/documentos/page.tsx` — also reads `getOpenLoops()`, passes a lightweight `{id, title, kind, status}` loop list to `DocumentList` (T-02-19: never the full `OpenLoop`)

## Decisions Made

- `AttachDocumentControl` owns both the attach and detach PATCH calls and renders the attached-document row list itself; `LoopDetailPanel` only renders the section label and the empty-state text. This keeps the single mutation path in one file and satisfies the plan's `AttachDocumentControl`-scoped grep gates without duplicating fetch logic.
- The `Detalle` button lives in the existing quick-actions row (`pointer-events-auto z-20`) rather than literally inside the `pointer-events-none` content layer — that row already implements exactly the "re-enable pointer events, stop propagation" behavior the plan describes for the button.
- Task 2's "no documents in the library" dead end is replaced by mounting `DocumentUpload` inline (with `loopId` set) rather than pointing the user at the Documentos section — a loop with an empty library still has a one-step way forward (D-01).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed stale duplicate `.next/types/*` files blocking `tsc --noEmit`**
- **Found during:** Task 1 verification
- **Issue:** `.next/types/cache-life.d 2.ts`, `routes.d 2.ts`, `validator 2.ts` — older, macOS-duplicate-style (` 2`) build artifacts left over from a prior build, conflicting with the current generated `.next/types/*.ts` files and causing `TS6200`/`TS2428`/`TS2717` errors unrelated to any source change in this plan.
- **Fix:** Deleted the three stale duplicate files (gitignored build output, not tracked, safe to remove; newer generated copies without the ` 2` suffix remained).
- **Files modified:** none (build output only, outside git)
- **Verification:** `npx tsc --noEmit` clean afterward.

**2. [Rule 1 - Bug] Reworded two `LoopDetailPanel.tsx` comments that contained the literal substring `<form`**
- **Found during:** Task 1 verification (`grep -c '<form' app/components/community/LoopDetailPanel.tsx` returned 2, expected 0)
- **Issue:** Two explanatory comments used the literal text `<form>` to describe "never nest a form", which the plan's own grep gate (checking for actual JSX `<form` usage) flagged as a false positive — there was no actual `<form>` element in the file.
- **Fix:** Reworded both comments to say "form element" / "wrapping form element" instead of the literal tag text.
- **Files modified:** `app/components/community/LoopDetailPanel.tsx`
- **Verification:** `grep -c '<form' app/components/community/LoopDetailPanel.tsx` now returns 0; no actual `<form>` element was ever present.
- **Committed in:** `efba31c` (Task 1 commit)

### Noted, not fixed — plan-authored grep-count artifacts

Same category of artifact documented in 02-01-SUMMARY.md: three of this plan's grep-count assertions expect an import-count-excluded call count, but the true grep count is always import-count + call-count for a named import used once:

- `grep -c 'getDocuments' app/community-president/page.tsx` — plan expects `1`, actual is `2` (1 import + 1 call in `Promise.all`).
- `grep -c 'getOpenLoops' app/community-president/documentos/page.tsx` — plan expects `1`, actual is `2` (1 import + 1 call).

Not "fixed" for the same reason as 02-01: removing the import statement or avoiding the standard `import { fn } from "..."` pattern to force the grep count down would be strictly worse than the count mismatch. The underlying invariant each gate intends to check (the Server Component reads the store, resolution runs server-side) is independently verified true by the adjacent `documentsForLoop`/`attachmentCount` gates, all of which pass, and by direct inspection.

---

**Total deviations:** 2 auto-fixed (1 blocking build-artifact cleanup, 1 cosmetic grep-false-positive comment reword); 2 noted pre-existing plan-authoring grep-count artifacts (no code change — same class as 02-01's, not implementation defects).
**Impact on plan:** No scope creep. Every security/correctness invariant in the threat register (frozen-key overlay, single mutation endpoint, no raw-HTML injection prop, archived-document exclusion at the one resolution function, minimal loop fields shipped to the Documentos client island) is independently grep- and test-verified and passes cleanly.

## Issues Encountered

None beyond the grep-count artifacts and stale build-artifact cleanup documented above.

## User Setup Required

None - no external service configuration required. (The Blob token requirement from 02-01 already covers the upload path this plan reuses; no new env vars.)

## Next Phase Readiness

- All Slice 2 artifacts Slice 3 (presupuestos) builds on are in place: `LoopDetailPanel`'s body already has an explicit placeholder comment marking where the `obra`-only presupuesto section is inserted as a sibling; `documentsForLoop`/`attachLoopId`/`detachLoopId` are available for a `presupuesto`-typed document's `document_id?` link if Slice 3 needs it.
- The manual UAT items (panel slide-in + inline document view, upload-from-loop auto-attach, chip count updates, mobile layout at 390px/1440px, the "dropped loop's attachments silently disappear" product question for Nicola) are outstanding — they require `npm run dev` with a live Blob token and are explicitly out of scope for this non-interactive execution session. Recorded as `human_judgment: true` in the `coverage:` block above for the verifier to route to UAT.
- No blockers for Slice 3 (Plan 03).

---
*Phase: 02-documents-presupuestos-workflow*
*Completed: 2026-09-18*

## Self-Check: PASSED

All 12 files listed under "Files Created/Modified" verified present on disk. All 4 task commit hashes (`a5fd3be`, `efba31c`, `cba103c`, `517a1e7`) verified present in `git log`.
