---
status: testing
phase: 02-documents-presupuestos-workflow
source: [02-VERIFICATION.md]
started: 2026-09-18T00:00:00Z
updated: 2026-09-18T00:00:00Z
---

## Current Test

number: 1
name: Upload a real >5 MB PDF, a HEIC photo, and a rejected SVG at once in Documentos
expected: |
  The PDF and HEIC upload with visible per-file progress and appear newest-first in the list;
  the SVG is rejected client-side with "Tipo de archivo no admitido" and never reaches Blob.
  In the Vercel Blob dashboard both objects sit under community-documents/ with private access.
awaiting: user response

## Tests

### 1. Upload a real >5 MB PDF, a HEIC photo, and a rejected SVG at once in Documentos
expected: The PDF and HEIC upload with visible per-file progress and appear newest-first in the list; the SVG is rejected client-side with "Tipo de archivo no admitido" and never reaches Blob. In the Vercel Blob dashboard both objects sit under community-documents/ with private access.
result: [pending]

### 2. Open an uploaded document inline via "Ver"; try the same URL with no session; open a HEIC in Safari and Chrome
expected: The PDF opens inline in a new tab (not a download); the private-window request returns 401, not the file; the HEIC previews in Safari and downloads in Chrome (accepted limitation, RESEARCH A5).
result: [pending]

### 3. Classify, rename (with Escape-revert), date, and archive a document from its row
expected: Type persists, Escape reverts the rename, the row shows the doc_date not the upload date, and archiving hides-but-keeps the record and blob.
result: [pending]

### 4. Attach/detach a document to a loop's detail panel (including a rapid double-attach) at 390px width
expected: Attach/detach round-trips correctly, double-attach is idempotent, and the panel is nearly full-width on mobile with the page body never scrolling sideways.
result: [pending]

### 5. Upload-and-auto-attach from a loop's detail panel; assign/unassign the same document to a second loop
expected: Upload-from-loop auto-attaches in one action; both directions of the assign/unassign link stay in sync across the two surfaces.
result: [pending]

### 6. Board paperclip+count chip on a loop with attachments
expected: Chip appears/updates/disappears correctly and is purely informational (not a click target); the card body still opens the normal quick-edit slide-over.
result: [pending]

### 7. Add a presupuesto on an obra loop and confirm the live total preview; confirm no presupuesto section on a non-obra loop
expected: Live preview matches the server-computed total exactly (e.g. base 1.234,56 @ 21% IVA -> 1.493,82 €); non-obra loops show zero presupuesto DOM.
result: [pending]

### 8. Record three presupuestos with different totals/dates and a linked PDF; view the comparison table at 390px and 1440px
expected: 8 attribute rows x 3 quote columns, cheapest tinted and labelled, others show "+... €" deltas, long scope keeps line breaks in a bounded cell, sort toggle reorders columns while keeping the same tint, linked document opens inline, table scrolls sideways under its own container (page itself never scrolls horizontally).
result: [pending]

### 9. Edit a presupuesto's base imponible so it becomes the most expensive, then archive a different one
expected: Highlight moves to the new cheapest column and deltas update on edit; archiving removes a quote from the table/list but keeps it in the JSON store with status archived; no accept/reject/choose control exists anywhere in the presupuesto section.
result: [pending]

### 10. Product question: should a dropped/de-obra'd loop's documents/presupuestos silently disappear from the board, or warn?
expected: Nicola confirms silent-disappear (current behavior) is acceptable, or requests a warning affordance as a follow-up.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
