---
phase: 02-documents-presupuestos-workflow
plan: 01
subsystem: api
tags: [nextjs, vercel-blob, client-upload, file-storage, node-test]

# Dependency graph
requires:
  - phase: 01-cockpit-foundation-open-loop-tracker
    provides: requireAuth() strong-token helper, community-president surface + sidebar, Blob-or-local JSON store pattern (open-loops-store.ts)
provides:
  - Document type (lib/types.ts) — id/title/type/status/blob_pathname/file_kind/content_type/size_bytes/original_name/linked_loop_ids/doc_date/uploaded_at/updated_at/extracted_text
  - Dual-mode documents-store.ts (getDocuments/saveDocuments, Blob-or-local)
  - document-defaults.ts single source of truth — FILE_TYPES allow-list, classifyFile, MAX_FILE_BYTES, ALLOWED_MIME, serveContentType, formatBytes, sanitizeFilename, validateDocumentInput, applyDocumentPatch, applyDocumentCreateDefaults, PATCHABLE_DOCUMENT_KEYS
  - POST /api/community/blob-upload token broker (client-direct Blob upload, decision A1-client-upload)
  - GET/POST /api/community/documents, PATCH /api/community/documents/[id], GET /api/community/documents/[id]/file (private streaming proxy)
  - Documentos page + sidebar entry + DocumentUpload/DocumentList/DocumentRow components
affects: [02-02, 02-03, slice-2-loop-attach, slice-3-presupuestos]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-direct-to-Blob upload via @vercel/blob/client upload() + a handleUpload token broker, to clear Vercel's 4.5 MB serverless request-body ceiling"
    - "Single classifyFile(name, mime) gate re-run at every enforcement point (browser, token broker allow-list, metadata POST) so the file-type allow-list cannot drift"
    - "Frozen PATCHABLE_*_KEYS + applyPatch overlay (never a body spread) as the mass-assignment / prototype-pollution choke point, now applied to a second resource (Document) alongside OpenLoop"
    - "Server-derived Content-Type via a dedicated serveContentType()/SERVE_CONTENT_TYPE map, never the storage SDK's reported type, for the private-blob inline proxy"

key-files:
  created:
    - lib/community/document-defaults.ts
    - lib/community/document-defaults.test.ts
    - lib/community/documents-store.ts
    - data/community-documents.json
    - app/api/community/blob-upload/route.ts
    - app/api/community/documents/route.ts
    - app/api/community/documents/[id]/route.ts
    - app/api/community/documents/[id]/file/route.ts
    - app/community-president/documentos/page.tsx
    - app/components/community/DocumentUpload.tsx
    - app/components/community/DocumentList.tsx
    - app/components/community/DocumentRow.tsx
  modified:
    - lib/types.ts
    - app/components/community/CommunitySidebar.tsx

key-decisions:
  - "Blob SDK error classes (BlobFileTooLargeError, BlobContentTypeNotAllowedError) mapped to Spanish copy by message-substring match in DocumentUpload.tsx rather than importing the classes for instanceof checks — importing from the server-oriented '@vercel/blob' package into a client bundle (only '@vercel/blob/client' is exported for browser use) was judged an unnecessary bundle-boundary risk for a cosmetic error-message improvement."
  - "Task 1's page.tsx inline list and DocumentList.tsx's per-row pending/error map were deferred to their designated tasks (Task 2, Task 3) exactly as the plan's own task split specifies, rather than pre-wiring unused state/props in Task 1/2 that Task 3 would then modify."

patterns-established:
  - "Second resource (Document) now follows the identical PATCH-only mutation-endpoint + frozen-key-overlay pattern OpenLoop established in Phase 1 — future community resources should copy this rather than re-deriving it."

requirements-completed: [INGEST-01]

coverage:
  - id: D1
    description: "Multi-file drop/select in Documentos uploads bytes browser-direct to a private Vercel Blob object, bypassing Vercel's 4.5 MB request-body ceiling, with a matching Document record created via metadata POST"
    requirement: "INGEST-01"
    verification:
      - kind: unit
        ref: "lib/community/document-defaults.test.ts#classifyFile / MAX_FILE_BYTES / ALLOWED_MIME suite (11 tests)"
        status: pass
      - kind: manual_procedural
        ref: "PLAN 02-01 Task 1 human-check: upload a real acta PDF >5MB, a HEIC photo, and an SVG with npm run dev + a Development Blob token"
        status: unknown
    human_judgment: true
    rationale: "Requires a live Vercel Blob Development-scoped token (user_setup, not available in this execution environment) and visual confirmation of per-file progress/failure isolation — cannot be proven by unit tests alone."
  - id: D2
    description: "A stored document reopens inline in a new tab through GET /api/community/documents/[id]/file — authenticated (401 with no/wrong cookie), Content-Type from serveContentType() not the SDK-reported type, nosniff + sandbox CSP, inline (never attachment) disposition, 404 for missing or archived documents"
    requirement: "INGEST-01"
    verification:
      - kind: unit
        ref: "grep gates: nosniff==1, sandbox==1, attachment==0, result.stream==1, archived branch present — all pass (see Deviations for the one known plan-authored count mismatch)"
        status: pass
      - kind: manual_procedural
        ref: "PLAN 02-01 Task 2 human-check: open a PDF inline in a new tab; hit the same URL from a private window (expect 401)"
        status: unknown
    human_judgment: true
    rationale: "Inline-vs-download browser rendering behaviour needs visual confirmation; the auth-matrix curl checks need a running dev server with DASHBOARD_TOKEN set, not available in this execution environment."
  - id: D3
    description: "Every D-04 field (type, title, doc_date) is editable inline from the document row via PATCH /api/community/documents/[id]; archiving hides the document, 404s its file URL, and keeps both the record and the blob"
    requirement: "INGEST-01"
    verification:
      - kind: unit
        ref: "lib/community/document-defaults.test.ts#applyDocumentPatch / validateDocumentInput suite (9 new tests: trim+refresh, type allow-list, linked_loop_ids wholesale replace, status allow-list, doc_date set/clear, server-owned-key immunity, prototype-pollution immunity, duplicate/over-limit linked_loop_ids)"
        status: pass
      - kind: manual_procedural
        ref: "PLAN 02-01 Task 3 human-check: change type, rename with Escape-revert, set a past doc_date, archive and confirm the file URL 404s"
        status: unknown
    human_judgment: true
    rationale: "Requires a running dev server and visual confirmation of the click-to-edit/Escape-revert UX and the post-archive 404 — not reproducible from unit tests in this execution environment."

duration: 45min
completed: 2026-09-18
status: complete
---

# Phase 2 Plan 1: Documentos Ingestion Summary

**Client-direct-to-Blob multi-file upload (bypassing Vercel's 4.5 MB body limit) into a private Documentos surface, with an authenticated streaming proxy for inline viewing and an allow-listed PATCH endpoint for classify/retitle/date/archive.**

## Performance

- **Duration:** ~45 min (Task 1 resumed from a prior interrupted run — types/store/defaults/routes/tests were already in the working tree; this session verified them, finished the remaining Task 1 files, then executed Tasks 2 and 3 in full)
- **Completed:** 2026-09-18
- **Tasks:** 3
- **Files modified:** 14 (12 created, 2 modified)

## Accomplishments

- `Documentos` sidebar entry and page: drop or select multiple PDF/JPEG/PNG/WebP/HEIC files, each uploads browser-direct to a private Vercel Blob object with per-file progress and per-file failure isolation, with a matching `Document` metadata record
- A stored document reopens inline in a new tab through `GET /api/community/documents/[id]/file` — 401 without a valid session, 404 for missing or archived documents, `Content-Type` always derived from `serveContentType()` (our own allow-list map, never the object's stored media type), `nosniff` + a `default-src 'none'; sandbox` CSP, and an `inline` (never `attachment`) disposition
- Every D-04 field (type, title, document date) is editable inline from the row via the single `PATCH /api/community/documents/[id]` endpoint; archiving hides the document from the list and 404s its file URL while the record and the underlying blob are both kept — no removal endpoint exists anywhere under `app/api/community/`
- `lib/community/document-defaults.test.ts`: 24/24 `node --test` assertions passing (15 file-type-allow-list/formatting tests + 9 `applyDocumentPatch`/`validateDocumentInput` mutation-safety tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Drop files into a new Documentos section and they are stored privately and listed** - `6b2a157` (feat)
2. **Task 2: Open a stored document inline in a new tab through the authenticated proxy** - `87524fc` (feat)
3. **Task 3: Classify, retitle, date and archive a document from its row** - `0840bfe` (feat)

_All three tasks are TDD-marked in the plan; RED (the test file) and the pre-existing store/route implementation were already present at session start for Task 1 (see Deviations), so Task 1's commit carries both together rather than as separate test/feat commits. Task 3 extended the same test file with new failing assertions before implementing the PATCH route, then committed test+feat together for the same reason — the store's tests are local-only (`node --test`, never run by CI) and the plan itself commits Task 1 and Task 3 as single atomic task commits, not split RED/GREEN commits._

## Files Created/Modified

- `lib/types.ts` — `DocumentType`, `DocumentFileKind`, `DocumentStatus`, `Document` interface under the Smart Community President banner
- `lib/community/document-defaults.ts` — the D-04/D-06/D-07/D-08/D-09 single source of truth: `DOCUMENT_TYPE_LABELS`, `FILE_TYPES`, `ALLOWED_MIME`, `MAX_FILE_BYTES`, `classifyFile`, `SERVE_CONTENT_TYPE`/`serveContentType`, `formatBytes`, `sanitizeFilename`, `validateDocumentInput`, `PATCHABLE_DOCUMENT_KEYS`, `applyDocumentPatch`, `applyDocumentCreateDefaults`
- `lib/community/document-defaults.test.ts` — local-only `node --test`, 24 assertions
- `lib/community/documents-store.ts` — `getDocuments`/`saveDocuments`, Blob-or-local dual mode
- `data/community-documents.json` — committed `[]` seed
- `app/api/community/blob-upload/route.ts` — `handleUpload` token broker; `requireAuth` runs inside `onBeforeGenerateToken`, not as the route's first statement, so Vercel's unauthenticated signed upload-completed callback isn't rejected
- `app/api/community/documents/route.ts` — `GET` list, `POST` create-from-blob-metadata; server re-derives `file_kind`/`content_type` via `classifyFile`, never trusts the client
- `app/api/community/documents/[id]/route.ts` — `PATCH` only; frozen-key overlay via `applyDocumentPatch`, no body spread
- `app/api/community/documents/[id]/file/route.ts` — private-blob streaming proxy, inline disposition, `nosniff` + sandbox CSP
- `app/community-president/documentos/page.tsx` — Server Component, filters archived, sorts `uploaded_at` descending
- `app/components/community/DocumentUpload.tsx` — multi-file drop zone, sequential per-file upload with progress and isolated failure/retry
- `app/components/community/DocumentList.tsx` — row list + Spanish empty state + per-document pending/error map
- `app/components/community/DocumentRow.tsx` — card view with type select, click-to-edit title, doc_date input, Archivar confirm step, "Ver" proxy link
- `app/components/community/CommunitySidebar.tsx` — added `Documentos` `NAV_ITEMS` entry

## Decisions Made

- Client uploads (not a server multipart route) per the plan's `A1-client-upload` decision — confirmed correct given D-08's ~15 MB cap and Vercel's 4.5 MB serverless body ceiling being infrastructure-level.
- `uploadErrorMessage()` in `DocumentUpload.tsx` maps Blob SDK errors to Spanish by matching on `err.message` substrings ("too large", "content type") rather than importing `BlobFileTooLargeError`/`BlobContentTypeNotAllowedError` for `instanceof` checks — those classes are exported only from the server-oriented `@vercel/blob` package, not from `@vercel/blob/client`, and pulling the server package into a `"use client"` bundle for a cosmetic error-message improvement was judged not worth the bundle-boundary risk.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed two dead `eslint-disable-next-line no-control-regex` comments**
- **Found during:** Task 1 verification (`npx eslint` warning, pre-existing in the partially-completed working tree from the interrupted prior run)
- **Issue:** `sanitizeFilename`'s two regex constants carried `eslint-disable-next-line no-control-regex` comments, but the repo's eslint config (`eslint-config-next`) doesn't enable that rule, so both directives were flagged as unused-eslint-disable warnings.
- **Fix:** Removed both disable comments; the regexes are unaffected.
- **Files modified:** `lib/community/document-defaults.ts`
- **Verification:** `npx eslint ...` now exits 0 with zero warnings (was 0 errors / 2 warnings).
- **Committed in:** `6b2a157` (Task 1 commit)

### Noted, not fixed — plan-authored grep-count artifacts

Three of the plan's `<acceptance_criteria>` grep-count assertions expect a `requireAuth`/`serveContentType` occurrence count that only accounts for the function *call sites*, not the `import { X } from "..."` line that also contains the identifier text. Since every route imports these functions by name, the true grep count is always import-count + call-count:

- `grep -c 'requireAuth' app/api/community/documents/route.ts` — plan expects `2`, actual is `3` (1 import + 2 calls, one per exported verb).
- `grep -c 'requireAuth' app/api/community/documents/[id]/route.ts` — plan expects `1`, actual is `2` (1 import + 1 call).
- `grep -c 'serveContentType' app/api/community/documents/[id]/file/route.ts` — plan expects `1`, actual is `2` (1 import + 1 call).

This is not an implementation defect: the **exact same pattern** (import + N calls) exists in the Phase 1 analog files this plan explicitly instructs copying (`app/api/community/open-loops/route.ts` has `requireAuth` × 3 for the identical reason; `app/api/community/open-loops/[id]/route.ts` has it × 2). The underlying invariant the gates intend to check — `requireAuth` present and the literal first statement of every exported verb, `serveContentType` used instead of the SDK-reported type — is verified true by direct inspection and by every other gate in each file's `<verify><automated>` block, all of which pass. Not auto-"fixed" because doing so would mean either removing the (correct, necessary) import statement or deviating from the established Phase 1 analog pattern — both worse than the grep-count mismatch itself. Flagged here for whoever authors the next plan's grep gates.

---

**Total deviations:** 1 auto-fixed (Rule 1, cosmetic lint cleanup); 3 noted pre-existing plan-authoring grep-count artifacts (no code change — verified as a plan defect, not an implementation defect).
**Impact on plan:** No scope creep. All three tasks' actual security/correctness invariants (auth-first, frozen-key overlay, no body spread, server-derived content-type, no removal verb, no public access mode, no `dangerouslySetInnerHTML`) are independently grep- and test-verified and pass cleanly.

## Issues Encountered

None beyond the grep-count artifacts documented above.

## User Setup Required

**External services require manual configuration** before the upload path can be exercised end-to-end locally. Per the plan's `user_setup` block:

1. Run `vercel env pull .env.local` with the project's existing Blob store connected to the **Development** environment (Vercel Dashboard → Storage → Blob store → Projects → Connect Project → tick Development), to obtain a Development-scoped `BLOB_READ_WRITE_TOKEN`.
2. Confirm `DASHBOARD_TOKEN` is scoped to both Preview and Production (open Phase 1 follow-up), not just Production.

Without step 1, `npm run dev` uploads will fail at the token broker — everything else (metadata store, seed, list, inline edits against the local JSON fallback) works offline.

## Next Phase Readiness

- All three Slice-1 artifacts Slices 2 and 3 build on are in place unchanged: `Document` type with `linked_loop_ids: string[]` ready for Slice 2's attach/detach, `applyDocumentPatch`'s wholesale-array-replace contract for `linked_loop_ids`, and the `PATCH`-only mutation pattern to copy for `Presupuesto`.
- The manual UAT items (real >5 MB acta upload, HEIC accept/preview, archived-document 404, mobile layout at 390px/1440px) are still outstanding — they require `npm run dev` with a live Blob token and are explicitly out of scope for this non-interactive execution session. Recorded as `human_judgment: true` in the `coverage:` block above for the verifier to route to UAT.
- No blockers for Slice 2 (Plan 02) or Slice 3 (Plan 03).

---
*Phase: 02-documents-presupuestos-workflow*
*Completed: 2026-09-18*

## Self-Check: PASSED

All 14 files listed under "Files Created/Modified" verified present on disk. All 3 task commit hashes (`6b2a157`, `87524fc`, `0840bfe`) verified present in `git log`.
