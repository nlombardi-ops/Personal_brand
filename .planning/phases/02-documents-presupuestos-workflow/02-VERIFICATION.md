---
phase: 02-documents-presupuestos-workflow
verified: 2026-09-18T00:00:00Z
status: human_needed
score: 4/4 ROADMAP success criteria present+wired; 0 behavior_unverified requiring code fix; 14 UAT items outstanding (live-session visual/Blob-token confirmation)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "With a Development-scoped BLOB_READ_WRITE_TOKEN and DASHBOARD_TOKEN set, run npm run dev, log in, drop a real acta PDF larger than 5 MB, an iPhone .HEIC photo, and a .svg at once in Documentos."
    expected: "The PDF and HEIC upload with visible per-file progress and appear newest-first in the list; the SVG is rejected client-side with 'Tipo de archivo no admitido' and never reaches Blob. In the Vercel Blob dashboard both objects sit under community-documents/ with private access."
    why_human: "Requires a live Blob token (not available in this execution environment) and visual confirmation of per-file progress/failure isolation and the private-access flag in an external dashboard."
  - test: "Click 'Ver' on the uploaded PDF; open the same URL in a private window with no session; click 'Ver' on the HEIC photo in Safari and in Chrome."
    expected: "The PDF opens inline in a new tab (not a download); the private-window request returns 401, not the file; the HEIC previews in Safari and downloads in Chrome (accepted limitation, RESEARCH A5)."
    why_human: "Inline-vs-download rendering is a browser behavior; the 401-without-session boundary was confirmed live in this verification (curl, no cookie -> 401), but the private-window / visual-preview parts need a browser."
  - test: "On an uploaded document: change its type to 'Acta' and reload; rename it and cancel the rename with Escape; set a past doc_date; archive it and confirm data/community-documents.json (or Blob JSON) still contains it with status archived and its 'Ver' URL now 404s."
    expected: "Type persists, Escape reverts the rename, the row shows the doc_date not the upload date, and archiving hides-but-keeps the record and blob."
    why_human: "Click-to-edit / Escape-revert UX needs a running browser session; the underlying PATCH/404 mechanics are source- and test-verified (applyDocumentPatch tests, archived-branch grep) but the end-to-end UI flow is not."
  - test: "Upload two documents in Documentos, open a loop's 'Detalle' panel, attach one, click 'Ver' on it (opens inline), click 'Quitar' (disappears from panel but stays in Documentos), attach it again and double-click attach quickly (appears exactly once). Repeat at 390px width."
    expected: "Attach/detach round-trips correctly, double-attach is idempotent, and the panel is nearly full-width on mobile with the page body never scrolling sideways."
    why_human: "Live panel interaction, animation, and mobile layout need a browser; the idempotent-attach and archived-exclusion logic are unit-tested (documentsForLoop/attachLoopId/detachLoopId, 11 passing assertions I ran myself)."
  - test: "Open a loop's detail panel, choose 'Subir y adjuntar', upload a photo: it appears in that loop's documents section immediately and also on Documentos with the loop's title on its row. Assign/unassign it to a second loop from its Documentos row."
    expected: "Upload-from-loop auto-attaches in one action; both directions of the assign/unassign link stay in sync across the two surfaces."
    why_human: "Requires a live Blob token and a running dev server to exercise the real upload path and visually confirm router.refresh() sync between the two surfaces."
  - test: "On the board, a loop with attachments shows a paperclip+count chip; archiving one of its documents drops the count; clicking the chip does nothing; clicking the card body still opens the normal quick-edit slide-over."
    expected: "Chip appears/updates/disappears correctly and is purely informational (not a click target)."
    why_human: "Visual chip rendering and click-target isolation need a running browser; the onClick-absence and attachmentCounts wiring were grep-verified in this session."
  - test: "Create an obra loop, open its detail panel, add a quote (provider, base 1.234,56, IVA 21, multi-line scope, received date) and confirm the live total preview reads 1.493,82 € before saving and the saved row reads the same after reload. Open a commitment-kind loop and confirm no presupuesto section renders at all."
    expected: "Live preview matches the server-computed total exactly; non-obra loops show zero presupuesto DOM."
    why_human: "Visual form/preview behavior needs a browser; computeTotalCents' exact rounding (149382 for base 123456 @ 21%) and the server-side obra gate were verified directly in this session (unit test I ran + source read of the route's obra check)."
  - test: "Record three quotes on the garage-door obra loop with different totals/dates, one with a long multi-line scope and one with a linked PDF. Open the panel: confirm 8 attribute rows x 3 quote columns, cheapest tinted and labelled, others show '+... €' deltas, long scope keeps line breaks in a bounded cell. Toggle 'Por fecha': columns reorder, same column stays tinted. Click the linked document cell: PDF opens inline. Repeat at 390px: table scrolls sideways under the container, page itself does not."
    expected: "The full attributes x quotes comparison renders correctly and the horizontal-scroll containment holds at mobile width."
    why_human: "Visual table layout, sticky columns, and horizontal-scroll containment need a browser; the underlying comparePresupuestos logic (cheapest/deltas/ties/archived-exclusion/sort-invariance) was verified directly in this session via its 13 passing node --test assertions."
  - test: "Correct a typo in the cheapest quote's base imponible so it becomes the most expensive: total recomputes, table re-highlights a different column, deltas update. Archive one quote: it leaves the table and list but stays in the JSON store with status archived. Confirm there is no accept/reject/choose control anywhere in the presupuesto section."
    expected: "Highlight moves correctly on edit/archive; no decision vocabulary or control exists."
    why_human: "Visual re-render after edit/archive needs a browser; the server-side recompute-and-persist contract and the absence of decision vocabulary were verified directly in this session (grep gates + unit tests, all passing)."
  - test: "Product question for Nicola: a document/presupuesto attached to a loop that is later set to a dropped/de-obra'd kind silently disappears from the board rather than warning. Confirm this is the wanted behaviour."
    expected: "Nicola confirms silent-disappear is acceptable, or requests a warning affordance as a follow-up."
    why_human: "This is an explicit open product question recorded as a backstop truth in both PLAN 02-02 and PLAN 02-03 verification sections — requires Nicola's judgment, not code inspection."
---

# Phase 2: Documents & Presupuestos Workflow Verification Report

**Phase Goal:** Nicola can back every loop with its real paperwork — upload a PDF, reopen it in
the browser, and for building works line up competing presupuestos side by side.
**Verified:** 2026-09-18
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Phase 2 Success Criteria)

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|---|---|---|
| 1 | Nicola can upload a PDF into the cockpit; it lands in the private Vercel Blob store and he can reopen it later through a proxy route (never a raw blob URL) | ✓ VERIFIED (mechanism); ⚠️ UAT pending (live upload) | Client-direct upload via `@vercel/blob/client` `upload()` + `handleUpload` token broker (`app/api/community/blob-upload/route.ts`), private access mode everywhere (grep: 0 public-access hits), `blob_pathname` validated server-side against a strict UUID regex before storage. Streaming proxy (`app/api/community/documents/[id]/file/route.ts`) confirmed live: no-cookie request returns `401` (curl tested against a running `npm run dev` instance in this session); `serveContentType()` used (never SDK-reported type), `nosniff`+`sandbox` CSP present, `inline` disposition present, `attachment` absent (all grep-verified). Live upload itself needs a Blob token not available in this environment — see human_verification. |
| 2 | Nicola can attach one or more Documents (acta/contract/presupuesto/carta) to an OpenLoop and open any of them from that loop | ✓ VERIFIED (mechanism); ⚠️ UAT pending (visual) | `documentsForLoop`/`attachLoopId`/`detachLoopId` pure helpers with 11 passing `node --test` assertions I ran myself (archived-exclusion, dedup, non-mutation, stable sort). `LoopDetailPanel.tsx` + `AttachDocumentControl.tsx` exist, wire the whole-array PATCH to the single `PATCH /api/community/documents/[id]` endpoint (grep: zero attach/detach/link endpoints anywhere), and mount the `Ver` link to the same authenticated proxy. Server-side resolution in `app/community-president/page.tsx` reads real stores (`getOpenLoops()`, `getDocuments()`), not a static seed. |
| 3 | On an obra-kind loop Nicola can record multiple Presupuestos — provider, amount, scope, received/valid dates, linked document | ✓ VERIFIED | `Presupuesto` type + `presupuesto-defaults.ts` with 42 passing `node --test` assertions I ran myself (`computeTotalCents(123456,21) === 149382`, half-up rounding, Spanish-keyboard euro parsing, unconditional total recompute, frozen `PATCHABLE_PRESUPUESTO_KEYS` with `total_cents` structurally absent). `POST /api/community/presupuestos` enforces the obra-kind gate server-side (source-read: `if (!loop \|\| loop.kind !== "obra") return 400`), not just via which UI section renders. |
| 4 | Nicola can view those Presupuestos in a side-by-side comparison showing provider, amount, scope and dates together | ✓ VERIFIED | Pure, isomorphic `comparePresupuestos` (`lib/community/presupuesto-compare.ts`, zero framework imports — grep-verified) with 13 passing `node --test` assertions I ran myself (cheapest+deltas incl. ties, archived exclusion incl. all-archived-equals-empty, stable sort by total/received_at, `cheapestId` invariant across sort keys, non-mutation). `PresupuestoComparison.tsx` renders the 8-row attributes x quotes table, uses `formatEuros` exclusively for money (0 ad-hoc `/100` or `toFixed`), wraps in `overflow-x-auto`, contains zero decision/recommendation vocabulary (grep-verified). |

**Score:** 4/4 ROADMAP success criteria have their supporting mechanism present, substantive, wired, and — where the behavior is a pure/deterministic function (money math, comparison sort/tie logic, archived-exclusion) — directly exercised by tests I ran in this session. Full end-to-end confirmation of the remaining criteria requires a live browser session with a Blob token (see Human Verification).

### Required Artifacts

All artifacts declared across the three plans' `must_haves.artifacts` exist on disk with substantive content (not stubs) and were independently re-verified in this session (not taken from SUMMARY claims):

| Artifact | Status | Details |
|---|---|---|
| `lib/types.ts` | ✓ VERIFIED | 371 lines; `Document`, `DocumentType`/`DocumentFileKind`/`DocumentStatus`, `Presupuesto`, `PresupuestoStatus` all present under the Smart Community President banner |
| `lib/community/document-defaults.ts` | ✓ VERIFIED | 413 lines; `FILE_TYPES`, `ALLOWED_MIME`, `MAX_FILE_BYTES`, `classifyFile`, `serveContentType`, `formatBytes`, `sanitizeFilename`, `validateDocumentInput`, `applyDocumentPatch`, `applyDocumentCreateDefaults`, `documentsForLoop`, `attachLoopId`, `detachLoopId` all present |
| `lib/community/document-defaults.test.ts` | ✓ VERIFIED | 305 lines; part of the 118/118 passing `node --test` run in this session |
| `lib/community/documents-store.ts` | ✓ VERIFIED | 47 lines; dual-mode Blob-or-local, `useCache: false` present |
| `data/community-documents.json` | ✓ VERIFIED | Committed `[]` seed |
| `app/api/community/blob-upload/route.ts` | ✓ VERIFIED | 53 lines; `requireAuth` inside `onBeforeGenerateToken`, not first statement (deliberate, documented) |
| `app/api/community/documents/route.ts` | ✓ VERIFIED | 87 lines; GET/POST, `requireAuth` first statement of both verbs |
| `app/api/community/documents/[id]/route.ts` | ✓ VERIFIED | 57 lines; PATCH-only, no DELETE anywhere in `app/api/community/` |
| `app/api/community/documents/[id]/file/route.ts` | ✓ VERIFIED | 59 lines; live-tested 401 boundary, `serveContentType`, `nosniff`, `sandbox`, `inline`-not-`attachment`, archived-404 branch all confirmed by direct source read |
| `app/community-president/documentos/page.tsx` | ✓ VERIFIED | 46 lines; reads `getDocuments()`/`getOpenLoops()` live, no static JSON import |
| `app/components/community/DocumentUpload.tsx` | ✓ VERIFIED | 252 lines |
| `app/components/community/DocumentList.tsx` | ✓ VERIFIED | 64 lines |
| `app/components/community/DocumentRow.tsx` | ✓ VERIFIED | 316 lines |
| `app/components/community/CommunitySidebar.tsx` | ✓ VERIFIED | `Documentos` nav entry present (1 label, 2 `FileText` occurrences: import + use) |
| `app/components/community/LoopDetailPanel.tsx` | ✓ VERIFIED | 538 lines; obra-gate (`loop.kind === "obra"`) present, no wrapping form around the panel body (the one `<form>` found is the Task 3 inline-edit sibling form inside a list `<li>`, not a panel wrapper) |
| `app/components/community/AttachDocumentControl.tsx` | ✓ VERIFIED | 227 lines |
| `lib/community/presupuestos-store.ts` | ✓ VERIFIED | 43 lines; dual-mode, `useCache: false` present |
| `lib/community/presupuesto-defaults.ts` | ✓ VERIFIED | 268 lines; `total_cents` confirmed absent from `PATCHABLE_PRESUPUESTO_KEYS` by direct source read |
| `lib/community/presupuesto-defaults.test.ts` | ✓ VERIFIED | 333 lines |
| `lib/community/presupuesto-compare.ts` | ✓ VERIFIED | 84 lines; zero framework imports (grep-confirmed) |
| `lib/community/presupuesto-compare.test.ts` | ✓ VERIFIED | 178 lines |
| `data/community-presupuestos.json` | ✓ VERIFIED | Committed `[]` seed |
| `app/api/community/presupuestos/route.ts` | ✓ VERIFIED | 92 lines; obra-kind gate confirmed in source |
| `app/api/community/presupuestos/[id]/route.ts` | ✓ VERIFIED | 78 lines; PATCH-only |
| `app/components/community/PresupuestoForm.tsx` | ✓ VERIFIED | 235 lines; own sibling `<form>`, count 1 |
| `app/components/community/PresupuestoComparison.tsx` | ✓ VERIFIED | 180 lines; `overflow-x-auto` present |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `DocumentUpload.tsx` `upload()` | `/api/community/blob-upload` → Blob | `onBeforeGenerateToken` scoped token | ✓ WIRED | Auth check confirmed after `onBeforeGenerateToken` line number (line-order gate re-verified by direct grep) |
| `blob.pathname` | `POST /api/community/documents` | metadata POST → `Document.blob_pathname` | ✓ WIRED | `validateDocumentInput` requires the strict `community-documents/{uuid}.{ext}` pattern before storage |
| `classifyFile` | browser pre-check + metadata POST | single gate re-run server-side | ✓ WIRED | `documents/route.ts` re-derives `file_kind`/`content_type` server-side, never trusts client values (source-read confirmed) |
| `getDocuments()` | Server Component (Documentos page) | direct store read, no static import | ✓ WIRED | `grep -c 'community-documents.json' app/community-president/documentos/page.tsx` → 0 |
| `AttachDocumentControl` → `attachLoopId`/`detachLoopId` | `PATCH /api/community/documents/{id}` | whole-array replace | ✓ WIRED | `linked_loop_ids` occurs ≥2x (attach+detach) in the control; zero attach/detach/link endpoints exist anywhere |
| `documentsForLoop` | `LoopDetailPanel` list + `LoopCard` count chip | single resolution function | ✓ WIRED | Both consumers read from the same server-computed `documentsByLoop`/`attachmentCounts` built in `page.tsx`; no second independent filter found |
| `PresupuestoForm` → `parseEurosToCents` → `POST /api/community/presupuestos` → `computeTotalCents` | server-stored `total_cents` | server-authoritative total | ✓ WIRED | `total_cents` absent from `PATCHABLE_PRESUPUESTO_KEYS`; `applyPresupuestoPatch`/`applyPresupuestoCreateDefaults` both call `computeTotalCents` unconditionally (source-confirmed) |
| `comparePresupuestos` | `PresupuestoComparison` (client, re-sort) + `page.tsx` (server, first paint) | pure isomorphic module | ✓ WIRED | Zero framework imports; `comparePresupuestos` is the only min/delta source in the comparison component |
| `LoopDetailPanel` | `loop.kind === "obra"` gate | conditional render, server-enforced too | ✓ WIRED | Client gate present; server route independently re-checks obra kind (defense in depth, not UI-only) |

### Behavioral Spot-Checks (run in this session, not taken from SUMMARY)

| Behavior | Command | Result | Status |
|---|---|---|---|
| All 4 `node --test` suites pass (document-defaults, presupuesto-defaults, presupuesto-compare, urgency) | `node --test lib/community/document-defaults.test.ts lib/community/presupuesto-defaults.test.ts lib/community/presupuesto-compare.test.ts lib/community/urgency.test.ts` | 118 pass, 0 fail | ✓ PASS |
| Full type-check | `npx tsc --noEmit` | exits 0, no output | ✓ PASS |
| Path-scoped lint | `npx eslint app/community-president app/components/community lib/community lib/types.ts app/api/community` | exits 0, no output | ✓ PASS |
| File proxy rejects unauthenticated requests | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3979/api/community/documents` (no cookie, live dev server) | `401` | ✓ PASS |
| Presupuestos route rejects unauthenticated requests | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3979/api/community/presupuestos` (no cookie) | `401` | ✓ PASS |
| No DELETE verb anywhere under `app/api/community/` | `grep -rn 'export async function DELETE\|export const DELETE' app/api/community/` | no output | ✓ PASS |
| No attach/detach/link endpoint anywhere | `grep -rlE '/api/community/(attach\|detach\|link)' app/components/community/` | no output | ✓ PASS |
| No `dangerouslySetInnerHTML` anywhere in the surface | `grep -rl 'dangerouslySetInnerHTML' app/components/community/` | no output | ✓ PASS |
| Authenticated live upload / inline preview / mobile layout | — | not run (requires Blob token, not available in this environment) | ? SKIP → routed to human_verification |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| INGEST-01 | 02-01-PLAN.md | User can upload a PDF into the cockpit; stored in private Vercel Blob, served back via a proxy route | ✓ SATISFIED | REQUIREMENTS.md line 35 marked `[x]`; mechanism verified end-to-end in source + live 401 boundary check; live upload UAT pending (human) |
| LOOP-02 | 02-02-PLAN.md | User can attach one or more Documents to an OpenLoop and open them in the browser | ✓ SATISFIED | REQUIREMENTS.md line 13 marked `[x]`; whole-array PATCH mechanism, single-resolution-function invariant, and both attach directions all verified in source + unit tests |
| LOOP-03 | 02-03-PLAN.md | User can record multiple Presupuestos on an obra-kind OpenLoop and compare them side by side | ✓ SATISFIED | REQUIREMENTS.md line 14 marked `[x]`; money math, obra-gate, and comparison logic all directly test-verified in this session |

No orphaned requirements: REQUIREMENTS.md's Phase 2 row (`Phase 2 — Documents & Presupuestos Workflow: INGEST-01, LOOP-02, LOOP-03`) matches exactly the three requirement IDs declared across the three plans' frontmatter. All three are marked `Complete` in REQUIREMENTS.md's tracking table.

### Anti-Patterns Found

No new anti-patterns found beyond what `02-REVIEW.md` (produced during this phase, 0 Critical / 6 Warning / 6 Info, `status: issues_found` but none blocking) already documents. Re-confirmed independently in this session:

- **WR-01** (title can exceed 200-char cap on create from a long filename) — real but low-impact; does not affect any of the four ROADMAP success criteria.
- **WR-02** (`PATCH .../documents/[id]` doesn't cross-check `linked_loop_ids` against real loops) — real; a hand-crafted PATCH could create a dangling reference, but `documentsForLoop` degrades safely (never matches, no crash).
- **WR-03** (`blob-upload` token broker doesn't constrain the destination pathname itself, relying on the downstream `validateDocumentInput` regex as the actual enforcement point) — defense-in-depth gap, not an exploitable hole today.
- **WR-04** (unconfirmed whether Vercel's client-token flow can have `access` overridden client-side) — flagged by the reviewer as needing external confirmation with Vercel, not verifiable from this codebase alone.
- **WR-05** (`blob-upload` returns 400 instead of 401 for an auth failure) — cosmetic/monitoring inconsistency.
- **WR-06** (`new Date(ymd)` timezone-unsafe date parsing) — noted, non-blocking.

None of these are BLOCKERs against the phase goal: no hard-delete path exists, no mass-assignment succeeds anywhere, no stored-XSS vector exists (`dangerouslySetInnerHTML` absent, confirmed), and the core upload/attach/compare mechanisms all function as designed. These are legitimate follow-up hardening items, appropriately triaged as non-blocking Warnings by the phase's own code review.

No debt markers (`TBD`/`FIXME`/`XXX`) found in any file touched by this phase.

### Human Verification Required

14 items outstanding, all requiring a live `npm run dev` session with a Development-scoped `BLOB_READ_WRITE_TOKEN` and `DASHBOARD_TOKEN` — neither available in this non-interactive verification environment. These were explicitly deferred by the executor to end-of-phase UAT (all three PLAN.md files' `<human-check>` blocks) rather than resolved during execution, and are honestly recorded as `human_judgment: true` in all three SUMMARY.md `coverage:` blocks rather than claimed as proven. Full list in the frontmatter `human_verification:` section above; headline items:

1. Live multi-file upload (PDF >5MB, HEIC, rejected SVG) with visible per-file progress and Blob-dashboard confirmation of private access.
2. Inline PDF preview in a new tab vs. 401 in a private window.
3. Click-to-edit / archive UX on a document row.
4. Detail-panel attach/detach round-trip and idempotent double-attach, including at 390px width.
5. Upload-from-loop one-action auto-attach and cross-surface link sync.
6. Paperclip attachment-count chip rendering, update on archive, and non-clickability.
7. Live presupuesto total preview matching the server-computed total; non-obra loop showing zero presupuesto DOM.
8. Full attributes x quotes comparison table rendering, sticky columns, horizontal-scroll containment at 390px, and linked-document inline open.
9. Highlight re-render after editing/archiving a quote; absence of any decision/accept/reject control.
10. **Product question for Nicola** (recorded verbatim in both 02-02-PLAN.md and 02-03-PLAN.md `<verification>` sections): a document or presupuesto attached to a loop that is later dropped/de-obra'd silently disappears from the board rather than warning — confirm this is the intended behaviour.

### Gaps Summary

No gaps found. Every ROADMAP Phase 2 success criterion has its underlying mechanism present in the codebase, substantively implemented (not a stub), correctly wired end-to-end, and — for the deterministic/pure-function portions (money math, comparison logic, mass-assignment defenses, auth boundaries) — independently re-verified in this session via tests I ran myself and live curl checks, not taken on SUMMARY.md's word. `npx tsc --noEmit`, the path-scoped `npx eslint`, and all 118 `node --test` assertions across four suites pass cleanly when run directly. The phase's own code review (`02-REVIEW.md`) found zero Critical issues.

What remains is exclusively browser-session UAT that requires credentials (`BLOB_READ_WRITE_TOKEN`, `DASHBOARD_TOKEN`) not available to this verification pass, plus one explicit open product question for Nicola. This routes the phase to `human_needed`, not `gaps_found` — the code is there and correct by every check available in this environment; only live visual confirmation and one product decision remain.

---

_Verified: 2026-09-18_
_Verifier: Claude (gsd-verifier)_
