# Phase 2: Documents & Presupuestos Workflow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-10
**Phase:** 2-Documents & Presupuestos Workflow
**Areas discussed:** Upload & attach flow, Presupuesto workflow, Comparison surface & loop detail

---

## Upload & attach flow

### Q: Where does Nicola upload a PDF into the cockpit?

| Option | Description | Selected |
|--------|-------------|----------|
| From inside a loop only | Upload lives in the loop's slide-over as "Adjuntar documento"; every document born attached | |
| Standalone Documentos section only | New sidebar entry with its own upload + list; attach to loops from there | |
| Both | Upload from within a loop AND a Documentos section listing everything | ✓ |

**User's choice:** Both

### Q: Can one document belong to more than one loop, and can it exist unattached?

| Option | Description | Selected |
|--------|-------------|----------|
| One loop, always attached | Belongs to exactly one loop, no orphans, no sharing | |
| Many loops, always attached | Can attach to several loops but at least one | |
| Many loops, orphans allowed | Zero-or-many loops; a true library | ✓ |

**User's choice:** Many loops, orphans allowed

### Q: How many files per upload?

| Option | Description | Selected |
|--------|-------------|----------|
| One at a time | Single file picker, one PDF per action | |
| Multiple at once | Select/drop several files, each becomes its own Document | ✓ |

**User's choice:** Multiple at once

### Q: What does Nicola fill in when uploading a document?

| Option | Description | Selected |
|--------|-------------|----------|
| Type + document date, both required | Pick type and set the document's own date | |
| Type required, date optional | Type required, date optional | |
| Everything optional / minimal | Just upload; type defaults, set later | ✓ |

**User's choice:** Everything optional / minimal
**Notes:** Creates a tension with the presupuesto flow (which needs `type = presupuesto`) — resolved in CONTEXT D-04 by making type trivially editable after upload.

### Q: How does attaching an existing library document to a loop work, and removing it?

| Option | Description | Selected |
|--------|-------------|----------|
| Pick from a list in the loop | Loop-side picker of existing docs + upload-new; detach removes the link only | |
| Attach from the document side | Assign loops from the Documentos section; loop view read-only | |
| Both directions | Attach/detach from the loop AND assign loops from the document | ✓ |

**User's choice:** Both directions

### Q: Can Nicola permanently delete a document or a presupuesto?

| Option | Description | Selected |
|--------|-------------|----------|
| Detach only, no delete | Unlink but never delete; quotes can't be removed | |
| Hard-delete allowed with confirmation | Delete document (Blob + links) and presupuesto behind inline confirm | |
| Soft-delete (archive) | Delete hides from lists, keeps record + Blob — matches Phase 1 status:dropped | ✓ |

**User's choice:** Soft-delete (archive)

---

## Presupuesto workflow

### Q: Does a presupuesto carry a decision status, or is it just data to compare?

| Option | Description | Selected |
|--------|-------------|----------|
| Status per quote | pendiente / aceptado / descartado; marks the winner | |
| Compare only | No status field; act via the loop's next_action | ✓ |
| Just a winner flag | Single boolean/pointer marking one as chosen | |

**User's choice:** Compare only

### Q: How is the money captured on a presupuesto?

| Option | Description | Selected |
|--------|-------------|----------|
| Single total (EUR), IVA note in scope | One amount field; IVA mentioned in free text | |
| Amount + IVA-incluido flag | Amount plus a boolean | |
| Base + IVA % + total | Base imponible, IVA rate, computed total | ✓ |

**User's choice:** Base + IVA % + total

### Q: Is a linked PDF required to record a presupuesto?

| Option | Description | Selected |
|--------|-------------|----------|
| Optional | Record a verbal/email quote, attach the PDF later | ✓ |
| Required | Every quote must point at an uploaded document | |

**User's choice:** Optional

### Q: The `scope` field — what shape?

| Option | Description | Selected |
|--------|-------------|----------|
| Free-text multi-line | A description box | ✓ |
| Short one-liner | Single-line summary only | |

**User's choice:** Free-text multi-line

### Q: Which presupuesto dates matter for v1?

| Option | Description | Selected |
|--------|-------------|----------|
| Both optional | received_at and valid_until both optional | ✓ |
| received_at only | Just track arrival | |
| Both, received_at required | received_at mandatory, valid_until optional | |

**User's choice:** Both optional

---

## Comparison surface & loop detail

### Q: Where do a loop's documents and presupuestos live in the UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated loop-detail page | New route /community-president/loops/[id] | |
| Widened slide-over | Slide-over expands near-full-width for docs/presupuestos; no new route | ✓ |
| Detail page + inline compare | Detail page plus a focused full-screen compare view | |

**User's choice:** Widened slide-over

### Q: How should the presupuesto comparison be laid out?

| Option | Description | Selected |
|--------|-------------|----------|
| Attributes × quotes table | Rows = attributes, columns = quotes | ✓ |
| Cards, responsive | One card per quote, side-by-side / stacked | |
| Table desktop / cards mobile | Table on wide screens, cards below a breakpoint | |

**User's choice:** Attributes × quotes table

### Q: Should the comparison do any of the math for Nicola?

| Option | Description | Selected |
|--------|-------------|----------|
| Highlight cheapest total | Mark the lowest total, optional deltas | |
| No highlighting | Just the numbers in order | |
| Cheapest + sort control | Highlight cheapest and let Nicola reorder by total / received date | ✓ |

**User's choice:** Cheapest + sort control

---

## Claude's Discretion

Three of the four candidate gray areas were partially or fully left to Claude:

- **Viewing PDFs & file types** — fully deferred. Recorded defaults: inline-in-new-tab
  via the proxy route; accept PDF + jpg/png/webp/heic; ~15 MB cap client + server.
- Store layout, physical location of the many-to-many link, Blob pathname scheme,
  upload UI mechanics (drag-drop, progress, partial-failure surfacing), attachment
  indicator on cards, Documentos list filtering, IVA default, Spanish validation/error
  copy, empty states, and whether to add `extracted_text` now — all left to
  research/planning/UI-spec. See CONTEXT.md "Claude's Discretion".

## Deferred Ideas

- `extracted_text` on Document (pdf-parse at upload) — Phase 4/5 territory
- Presupuesto decision/status tracking — rejected for v1, revisit after a junta cycle
- Itemised presupuestos — new capability
- Dedicated loop-detail route — deferred again; may return in Phase 3
- Document full-text search / rich filtering
- AI extraction of acuerdos from actas — v2 EXTRACT-01
- Email-ingested draft documents — Phase 5
- Per-presupuesto web-search pricing check — Phase 4
- Hard-delete + Blob garbage collection for archived/orphaned files
