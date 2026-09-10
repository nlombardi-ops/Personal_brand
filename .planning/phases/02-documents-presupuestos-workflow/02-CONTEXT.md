# Phase 2: Documents & Presupuestos Workflow - Context

**Gathered:** 2026-09-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Nicola can back every loop with its real paperwork. Phase 2 delivers:

1. **PDF/image upload into the cockpit** — files land in the private Vercel Blob
   store and are reopened through an authenticated proxy route, never a raw blob URL
   (INGEST-01).
2. **A `Document` library** — `type` acta / contract / presupuesto / carta — that
   attaches to `OpenLoop`s many-to-many, with unattached (orphan) documents allowed
   (LOOP-02).
3. **A `Presupuesto` sub-workflow on `obra`-kind loops** — record multiple quotes
   (provider, structured amount, scope, received/valid dates, optional linked
   document) and read them in a side-by-side attributes × quotes comparison table
   (LOOP-03).

**In scope:** the `Documentos` sidebar surface + list; upload (multi-file, minimal
metadata) from both a loop and the Documentos section; attach/detach in both
directions; a "detail mode" for the existing slide-over that widens to show a loop's
documents and presupuestos; the presupuesto comparison table with cheapest-total
highlighting and a sort control; soft-delete/archive for `Document` and `Presupuesto`.

**Not in scope (later phases / v2):** juntas / acuerdos / LPH deadline engine
(Phase 3); LPH Q&A + per-presupuesto pricing check (Phase 4); administrador email
ingestion of draft documents (Phase 5); AI extraction of acuerdos from actas
(v2 EXTRACT-01); presupuesto decision/winner tracking; itemised presupuestos;
full-text document search; hard-delete + Blob garbage collection; a dedicated
loop-detail route.

</domain>

<decisions>
## Implementation Decisions

### Document Upload & Library

- **D-01:** Two upload entry points — from within a loop ("Adjuntar documento") **and**
  a new standalone **"Documentos"** section (sidebar entry added this phase) that lists
  every document. Upload is available from both.
- **D-02:** Documents are a **true library**. A `Document` may link to **zero, one, or
  many** `OpenLoop`s. Orphan (unattached) documents are allowed and shown in the
  Documentos section. The many-to-many link is stored on the `Document`
  (e.g. `linked_loop_ids: string[]`); the loop view resolves its attachments by
  querying that.
- **D-03:** **Multi-file upload** — Nicola selects or drops several files at once; each
  becomes its own `Document`. Partial-failure handling is required (some files succeed,
  some fail) with per-file feedback.
- **D-04:** **Minimal capture at upload** — nothing beyond the file is required.
  `type` defaults to an unclassified value and is editable inline afterward; `title`
  defaults to the original filename, editable; a `date` field (the document's own date,
  distinct from the upload timestamp) is optional. *(Planning note: the presupuesto
  workflow needs `type = presupuesto`, so type must be trivially settable after upload
  even though it is not required at capture.)*
- **D-05:** **Attach/detach works in both directions** — from a loop (pick from the
  library, or upload-new which auto-attaches to that loop) and from a document (assign
  or unassign loops). Both surfaces show the current links.
- **D-06:** **Soft-delete / archive** for `Document` (and `Presupuesto`, see D-16).
  Archiving hides the record from all lists and from its loops' attachment views but
  keeps the record **and** the Blob object. No hard-delete, no Blob deletion — mirrors
  Phase 1's `status: "dropped"` pattern.

### File Types & Viewing *(Claude's discretion — defaults recorded)*

- **D-07:** Accept **PDF plus common image types** (jpg / png / webp / heic) so phone
  photos of a carta or incidencia evidence work. Validate client-side and server-side
  by extension + MIME type.
- **D-08:** **~15 MB per-file size cap**, enforced client-side (pre-upload) and
  server-side (route rejects oversized).
- **D-09:** A stored file is viewed by opening it **inline in a new browser tab** via an
  authenticated proxy route (`Content-Disposition: inline`), never a raw blob URL. Copy
  `app/api/cv/versions/[id]/pdf/route.ts` — it currently sends `attachment` and
  hard-codes `application/pdf`; the community route must use `inline` and serve the
  file's real stored content-type.

### Presupuestos

- **D-10:** Presupuestos attach to **`obra`-kind `OpenLoop`s only** (LOOP-03). Non-obra
  loops have no presupuesto section.
- **D-11:** **Compare-only.** A `Presupuesto` has **no** decision / status / winner
  field. Nicola records the outcome through the loop's `next_action` / `status`, not on
  the presupuesto.
- **D-12:** **Structured money** — `base_imponible` (EUR) + `iva_pct` (%) + a computed,
  stored `total`. Real Spanish presupuestos quote base + IVA + total.
- **D-13:** The **linked `Document` is optional** on a `Presupuesto` — Nicola can log a
  quote from a phone call or email body and attach the PDF later.
- **D-14:** `scope` is a **free-text multi-line** field.
- **D-15:** `received_at` and `valid_until` are **both optional** date fields, shown in
  the comparison when set.
- **D-16:** `Presupuesto` v1 fields: `provider` (text, required), `base_imponible` +
  `iva_pct` + `total`, `scope` (multi-line), `received_at?`, `valid_until?`,
  `document_id?`, plus the archive status from D-06.

### Loop Detail & Comparison UI

- **D-17:** **No new route.** The existing right-hand slide-over gains a **"detail
  mode"** that widens toward full-width when showing a loop's documents / presupuestos.
  Quick create/edit stays in the normal-width slide-over. *(Phase 1 slide-over is
  `w-[calc(100vw-32px)] md:w-[420px]` — detail mode needs a wider desktop width or a
  distinct wider panel component.)*
- **D-18:** The presupuesto comparison is an **attributes × quotes table** — rows:
  provider, base imponible, IVA %, total, scope, received_at, valid_until, document;
  columns: one per presupuesto. The table scrolls horizontally **inside its own
  container** on narrow viewports (never the page body — Phase 1 mobile rule).
- **D-19:** The comparison **highlights the cheapest `total`** and shows each other
  quote's delta vs the cheapest (e.g. "+420 €"). Nicola can **re-sort** the columns by
  `total` or by `received_at`. Highlighting is a reading aid only — it implies no
  decision.

### Claude's Discretion

- Exact `Document.type` default value, and whether "sin clasificar" is a distinct enum
  member or an overload of one of the four types.
- Store layout — recommend one `lib/community/documents-store.ts` +
  `data/community-documents.json` and one `lib/community/presupuestos-store.ts` +
  `data/community-presupuestos.json`, each a single JSON document per the repo
  convention. Nesting presupuestos on the loop or inside the documents store is allowed
  if it turns out cleaner.
- Where the many-to-many link physically lives (on `Document`, on `OpenLoop`, or both)
  and how the loop view resolves attachments.
- Blob pathname scheme for uploaded files — `community-documents/{id}.{ext}` suggested.
- Upload UI mechanics — drag-and-drop zone vs button, progress indication, how partial
  multi-file failures are surfaced.
- Whether `LoopCard` / the board shows a small "📎 N" attachment indicator.
- Whether the Documentos section needs a type filter / sort beyond a date-ordered list
  (keep minimal unless trivial).
- IVA percent input default (21 suggested); single base+IVA only for v1 (no line items).
- Validation / error copy (Spanish); empty states for the Documentos section and the
  presupuesto comparison.
- Whether to add an optional `extracted_text` field to `Document` now (populated later)
  or leave it for Phase 4/5.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data model & domain

- `.planning/notes/data-model-sketch.md` — candidate `Document`, `Presupuesto`, `Junta`
  field lists and the `OpenLoop` / `Submission` split. **Starting point for the
  `Document` and `Presupuesto` types.**
- `.planning/REQUIREMENTS.md` §"Open Loops" (LOOP-02, LOOP-03) and §"Ingestion"
  (INGEST-01) — acceptance wording these decisions must satisfy.
- `.planning/ROADMAP.md` §"Phase 2: Documents & Presupuestos Workflow" — the four
  "what must be TRUE" success criteria; §"Sequencing Notes & Risks" — the private
  Blob + proxy bullet (copy `lib/cv/profile-store.ts` exactly; never `access: "public"`).
- `.planning/PROJECT.md` §Constraints, §"Key Decisions", §Context "Reused
  infrastructure (already proven in the CV builder / dashboard)".
- `.planning/phases/01-cockpit-foundation-open-loop-tracker/01-CONTEXT.md` and
  `01-LEARNINGS.md` — Phase 1 locked decisions and patterns: three-part fail-closed
  auth guard, dual-mode store shape, slide-over, no-hard-delete, mobile rules,
  free-text-as-React-children, enum single-source-of-truth.
- `lib/types.ts` §"Smart Community President" banner — the current `OpenLoop` /
  `Submission` shapes; new `Document` + `Presupuesto` interfaces go under the same
  banner.

### Codebase patterns to copy

- `lib/community/open-loops-store.ts` — the dual-mode Blob/local JSON store to copy
  verbatim for `lib/community/documents-store.ts` and `lib/community/presupuestos-store.ts`.
- `app/api/cv/versions/route.ts` (≈lines 32–49) — the `put()` **binary-Blob** pattern
  (`access: "private"`, `contentType`, `addRandomSuffix: false`, `allowOverwrite: true`)
  for storing an uploaded file.
- `app/api/cv/versions/[id]/pdf/route.ts` — the private-Blob **proxy route** to copy
  for `app/api/community/documents/[id]/file/route.ts`; switch `Content-Disposition`
  from `attachment` to `inline` and serve the stored content-type instead of a
  hard-coded `application/pdf`.
- `lib/community/require-auth.ts` — `requireAuth(request)` as the literal first
  statement of every new `/api/community/*` verb.
- `app/components/community/LoopSlideOver.tsx` — the panel to extend with "detail
  mode" + the documents / presupuestos sections.
- `app/components/community/CommunitySidebar.tsx` — the `NAV_ITEMS` array to add the
  "Documentos" entry to (one array, shared `NavLinks`).
- `app/components/community/Cockpit.tsx` — client island pattern (mutate via Route
  Handler + `router.refresh()`).
- `.planning/codebase/CONVENTIONS.md` §"Storage Pattern (dual-mode)", §"API Route
  Conventions", §"What a New Feature Module Must Follow".
- `.planning/codebase/INTEGRATIONS.md` §"Primary store — Vercel Blob (private)",
  §"Data Storage", §"File Storage".
- `.planning/codebase/STRUCTURE.md` §"Where to Add New Code" — the fourth-surface file
  layout.
- `node_modules/next/dist/docs/` — **MANDATORY per AGENTS.md** before any routing /
  Route Handler / file-upload / caching work. Next.js 16.2.4 is ahead of training
  data — check `multipart/form-data` handling and Route Handler request body APIs in
  particular.
- `pdf-parse` (already a dependency; dynamic `(await import("pdf-parse")).default`) —
  available if `extracted_text` capture is wanted.

### Design

- `DESIGN.md` and `.planning/phases/01-cockpit-foundation-open-loop-tracker/01-UI-SPEC.md`
  — the surface's established visual system (portfolio `neutral-*` on `#fafafa`, tag
  chips, section labels, mobile top-bar + drawer). Run `/gsd-ui-phase 2` for the
  detail-mode slide-over + comparison-table design contract.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `lib/community/open-loops-store.ts` — dual-mode Blob/local JSON store; copy verbatim
  for the two new entity stores (`BLOB_PATHNAME`, `LOCAL_PATH`, `useCache: false` reads,
  read-never-throws fallback).
- The CV **binary-Blob `put()` + proxy-route pair** (`app/api/cv/versions/route.ts` +
  `app/api/cv/versions/[id]/pdf/route.ts`) — the exact pattern for storing and serving
  an uploaded file privately.
- `lib/community/require-auth.ts`, `app/components/community/LoopSlideOver.tsx`,
  `CommunitySidebar.tsx` `NAV_ITEMS`, `FadeUp`, `lucide-react`, `date-fns` — all
  already in the community surface.
- `pdf-parse` — already used for CV/bill text extraction; dynamic import only.

### Established Patterns

- Server Components read stores directly; client islands mutate via a Route Handler +
  `router.refresh()` (no `revalidatePath` — no `cacheComponents` in this app).
- Every `/api/community/*` verb: `requireAuth(request)` first, then `try/catch` body
  parse → 400, work in `try/catch` → 500 with `err instanceof Error ? err.message :
  String(err)`.
- One JSON document per entity, whole-file rewrite, single-writer (acceptable for v1).
- Free text (provider, scope, title, filename) renders as React children only — never
  `dangerouslySetInnerHTML`.
- Soft-delete via a status field, hidden by the read layer (Phase 1 `HIDDEN_STATUSES`
  precedent).
- Enum vocabularies: one Spanish label `Record` per enum in a `*-defaults.ts` module;
  validation allow-lists and form `<select>`s both derive from `Object.keys()`.
- Spanish user-facing copy; mobile must work; wide content scrolls inside its own
  `overflow-x-auto` container, never the page body.

### Integration Points

- New sidebar entry **"Documentos"** in `app/components/community/CommunitySidebar.tsx`
  `NAV_ITEMS`.
- New page route `app/community-president/documentos/` (Server Component list).
- New API trees `app/api/community/documents/**` (list / upload / patch / archive /
  `[id]/file` proxy) and `app/api/community/presupuestos/**` (list / create / patch /
  archive), all `requireAuth`-gated.
- New stores `lib/community/documents-store.ts` + `lib/community/presupuestos-store.ts`
  + committed seeds `data/community-documents.json`, `data/community-presupuestos.json`
  (both `[]`).
- New `Document` + `Presupuesto` interfaces + their enums in `lib/types.ts` under the
  existing `// ── Smart Community President ──` banner; a `lib/community/document-defaults.ts`
  (or similar) for the Spanish label records + validators.
- Uploaded files: new **private Blob pathspace** `community-documents/{id}.{ext}`.
- `LoopSlideOver` gains detail mode; `LoopCard` may gain a small attachment indicator
  (discretion).
- Optional: register the two new stores in `app/api/cv/export/route.ts` and
  `scripts/sync-context.sh` if the JSON should mirror back to git (defer unless trivial).

</code_context>

<specifics>
## Specific Ideas

- Concrete example that shaped the model: **"Get three presupuestos for the garage-door
  motor"** — an `obra` loop with three `Presupuesto` records (provider, base + IVA +
  total, scope, received date, optionally the PDF), compared in an attributes × quotes
  table with the cheapest total flagged and a "+420 €" delta on the others.
- Real Spanish presupuestos quote a **base imponible + IVA (typically 21%) + total** —
  hence structured money capture even though there is no winner-tracking.
- Documents arrive by different routes — an acta emailed by the administrador, a carta
  scanned, a presupuesto PDF from a provider, a phone photo of a notice — hence
  multi-file upload, image support, and orphan documents.
- The Documentos section is a plain, date-ordered list for v1 — no search, minimal
  filtering.

</specifics>

<deferred>
## Deferred Ideas

- **`extracted_text` on `Document` (pdf-parse at upload)** — in the data-model sketch;
  useful for future search / AI extraction (Phase 4/5). Not needed for Phase 2 success
  criteria. Add the optional field now if cheap, populate later.
- **Presupuesto decision / status tracking** (aceptado / descartado / winner flag) —
  considered and explicitly rejected for v1 (compare-only). Revisit after one junta
  cycle if Nicola wants the decision recorded in-app.
- **Itemised presupuestos** (multiple line items per quote) — v1 is a single
  base + IVA + total. Itemisation is a new capability.
- **Dedicated loop-detail page / route** — Phase 1 deferred it; Phase 2 uses a widened
  slide-over. May return in Phase 3 when juntas / acuerdos also attach to a loop.
- **Document type filtering / full-text search in the Documentos section** — keep the
  v1 list simple (date-ordered, maybe a type filter if trivial).
- **AI extraction of acuerdos / OpenLoops from an uploaded acta** — v2 EXTRACT-01,
  propose-then-confirm. Out of scope.
- **Email-ingested draft documents** — Phase 5 (INGEST-02).
- **Per-presupuesto web-search pricing sanity check** — Phase 4 (PRICE-01).
- **Hard-delete + Blob garbage collection** for archived / orphaned files — v1 archives
  only; a real deletion / GC path is later if storage ever matters.

### Reviewed Todos (not folded)

None — no pending todos matched this phase.

</deferred>

---

*Phase: 2-Documents & Presupuestos Workflow*
*Context gathered: 2026-09-10*
