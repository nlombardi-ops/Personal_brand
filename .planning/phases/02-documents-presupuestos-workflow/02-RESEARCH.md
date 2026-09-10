# Phase 2: Documents & Presupuestos Workflow - Research

**Researched:** 2026-09-10
**Domain:** File upload to private object storage + authenticated proxy serving; many-to-many linking on a whole-file JSON store; structured-money comparison UI — all inside a Next.js 16.2.4 App Router surface
**Confidence:** HIGH on the storage/upload architecture and codebase patterns; MEDIUM on the UI shape of detail-mode (defer to `/gsd-ui-phase 2`)

## Summary

Phase 2 adds three vertical slices on top of the Phase 1 cockpit: (1) upload a PDF/image to the
private Vercel Blob store and reopen it through an authenticated proxy route; (2) a `Document`
library that links many-to-many to `OpenLoop`s with orphans allowed; (3) a `Presupuesto`
sub-workflow on `obra` loops with a side-by-side comparison table. Every pattern this phase needs
already exists in the repo — the dual-mode Blob/local JSON store (`lib/community/open-loops-store.ts`),
the binary `put()` + private-blob proxy pair (`app/api/cv/versions/route.ts` +
`app/api/cv/versions/[id]/pdf/route.ts`), the `requireAuth` gate, the frozen-allow-list
`applyPatch`, and the enum-single-source-of-truth module. The work is mostly copying these with
new entity names.

**The one genuine architectural decision:** the CV-versions route stores a *server-generated* PDF,
so it never crosses Vercel's request-body ceiling. A *browser upload* does. Vercel's serverless
request-body limit is **4.5 MB** and is infrastructure-level — it cannot be raised in code
`[VERIFIED: vercel.com/docs/functions/limitations, checked 2026-09-10]`. CONTEXT D-08 asks for a
~15 MB cap. Honoring D-08 therefore requires **client uploads** via `@vercel/blob/client`
`upload()` + a `handleUpload` token-broker route, not `await request.formData()` in a Route
Handler. This changes the auth shape (auth moves into `onBeforeGenerateToken`), the failure model
(one file per request, client-driven), and the local-dev story (uploads need a Blob token; the
JSON metadata stores keep working offline). This is the primary risk to front-load in Slice 1.

**Primary recommendation:** Slice 1 = client-upload (`@vercel/blob/client`) + `handleUpload` broker
+ `Document` store + private-blob proxy (inline, real content-type) + Documentos list. Slice 2 =
attach/detach both directions via a full-array `linked_loop_ids` PATCH. Slice 3 = `Presupuesto`
store (integer-cents money, server-computed total) + a pure `comparePresupuestos()` module +
comparison table. Add no new npm packages.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Document Upload & Library**
- **D-01:** Two upload entry points — from within a loop ("Adjuntar documento") **and** a new standalone **"Documentos"** section (sidebar entry added this phase) that lists every document. Upload is available from both.
- **D-02:** Documents are a **true library**. A `Document` may link to **zero, one, or many** `OpenLoop`s. Orphan (unattached) documents are allowed and shown in the Documentos section. The many-to-many link is stored on the `Document` (e.g. `linked_loop_ids: string[]`); the loop view resolves its attachments by querying that.
- **D-03:** **Multi-file upload** — Nicola selects or drops several files at once; each becomes its own `Document`. Partial-failure handling is required (some files succeed, some fail) with per-file feedback.
- **D-04:** **Minimal capture at upload** — nothing beyond the file is required. `type` defaults to an unclassified value and is editable inline afterward; `title` defaults to the original filename, editable; a `date` field (the document's own date, distinct from the upload timestamp) is optional. *(Planning note: the presupuesto workflow needs `type = presupuesto`, so type must be trivially settable after upload even though it is not required at capture.)*
- **D-05:** **Attach/detach works in both directions** — from a loop (pick from the library, or upload-new which auto-attaches to that loop) and from a document (assign or unassign loops). Both surfaces show the current links.
- **D-06:** **Soft-delete / archive** for `Document` (and `Presupuesto`, see D-16). Archiving hides the record from all lists and from its loops' attachment views but keeps the record **and** the Blob object. No hard-delete, no Blob deletion — mirrors Phase 1's `status: "dropped"` pattern.

**File Types & Viewing** *(Claude's discretion — defaults recorded)*
- **D-07:** Accept **PDF plus common image types** (jpg / png / webp / heic) so phone photos of a carta or incidencia evidence work. Validate client-side and server-side by extension + MIME type.
- **D-08:** **~15 MB per-file size cap**, enforced client-side (pre-upload) and server-side (route rejects oversized).
- **D-09:** A stored file is viewed by opening it **inline in a new browser tab** via an authenticated proxy route (`Content-Disposition: inline`), never a raw blob URL. Copy `app/api/cv/versions/[id]/pdf/route.ts` — it currently sends `attachment` and hard-codes `application/pdf`; the community route must use `inline` and serve the file's real stored content-type.

**Presupuestos**
- **D-10:** Presupuestos attach to **`obra`-kind `OpenLoop`s only** (LOOP-03). Non-obra loops have no presupuesto section.
- **D-11:** **Compare-only.** A `Presupuesto` has **no** decision / status / winner field. Nicola records the outcome through the loop's `next_action` / `status`, not on the presupuesto.
- **D-12:** **Structured money** — `base_imponible` (EUR) + `iva_pct` (%) + a computed, stored `total`. Real Spanish presupuestos quote base + IVA + total.
- **D-13:** The **linked `Document` is optional** on a `Presupuesto` — Nicola can log a quote from a phone call or email body and attach the PDF later.
- **D-14:** `scope` is a **free-text multi-line** field.
- **D-15:** `received_at` and `valid_until` are **both optional** date fields, shown in the comparison when set.
- **D-16:** `Presupuesto` v1 fields: `provider` (text, required), `base_imponible` + `iva_pct` + `total`, `scope` (multi-line), `received_at?`, `valid_until?`, `document_id?`, plus the archive status from D-06.

**Loop Detail & Comparison UI**
- **D-17:** **No new route.** The existing right-hand slide-over gains a **"detail mode"** that widens toward full-width when showing a loop's documents / presupuestos. Quick create/edit stays in the normal-width slide-over. *(Phase 1 slide-over is `w-[calc(100vw-32px)] md:w-[420px]` — detail mode needs a wider desktop width or a distinct wider panel component.)*
- **D-18:** The presupuesto comparison is an **attributes × quotes table** — rows: provider, base imponible, IVA %, total, scope, received_at, valid_until, document; columns: one per presupuesto. The table scrolls horizontally **inside its own container** on narrow viewports (never the page body — Phase 1 mobile rule).
- **D-19:** The comparison **highlights the cheapest `total`** and shows each other quote's delta vs the cheapest (e.g. "+420 €"). Nicola can **re-sort** the columns by `total` or by `received_at`. Highlighting is a reading aid only — it implies no decision.

### Claude's Discretion

- Exact `Document.type` default value, and whether "sin clasificar" is a distinct enum member or an overload of one of the four types.
- Store layout — recommend one `lib/community/documents-store.ts` + `data/community-documents.json` and one `lib/community/presupuestos-store.ts` + `data/community-presupuestos.json`, each a single JSON document per the repo convention. Nesting presupuestos on the loop or inside the documents store is allowed if it turns out cleaner.
- Where the many-to-many link physically lives (on `Document`, on `OpenLoop`, or both) and how the loop view resolves attachments.
- Blob pathname scheme for uploaded files — `community-documents/{id}.{ext}` suggested.
- Upload UI mechanics — drag-and-drop zone vs button, progress indication, how partial multi-file failures are surfaced.
- Whether `LoopCard` / the board shows a small "📎 N" attachment indicator.
- Whether the Documentos section needs a type filter / sort beyond a date-ordered list (keep minimal unless trivial).
- IVA percent input default (21 suggested); single base+IVA only for v1 (no line items).
- Validation / error copy (Spanish); empty states for the Documentos section and the presupuesto comparison.
- Whether to add an optional `extracted_text` field to `Document` now (populated later) or leave it for Phase 4/5.

### Deferred Ideas (OUT OF SCOPE)

- **`extracted_text` on `Document` (pdf-parse at upload)** — add the optional field now if cheap, populate later. Not needed for Phase 2 success criteria.
- **Presupuesto decision / status tracking** (aceptado / descartado / winner flag) — explicitly rejected for v1 (compare-only).
- **Itemised presupuestos** (multiple line items per quote) — v1 is a single base + IVA + total.
- **Dedicated loop-detail page / route** — Phase 2 uses a widened slide-over.
- **Document type filtering / full-text search in the Documentos section** — keep the v1 list simple (date-ordered).
- **AI extraction of acuerdos / OpenLoops from an uploaded acta** — v2 EXTRACT-01.
- **Email-ingested draft documents** — Phase 5 (INGEST-02).
- **Per-presupuesto web-search pricing sanity check** — Phase 4 (PRICE-01).
- **Hard-delete + Blob garbage collection** for archived / orphaned files — v1 archives only.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INGEST-01 | User can upload a PDF into the cockpit; it is stored in the private Vercel Blob store and served back via a proxy route | Client-upload architecture (`@vercel/blob/client` `upload()` + `handleUpload` broker) documented below; private-blob proxy route pattern copied from `app/api/cv/versions/[id]/pdf/route.ts` with `inline` disposition + real content-type; pathname scheme `community-documents/{uuid}.{ext}` |
| LOOP-02 | User can attach one or more `Document`s (acta / contract / presupuesto / carta) to an OpenLoop and open them in the browser | `Document` interface + `linked_loop_ids: string[]` link location; full-array PATCH mutation reusing Phase 1 frozen-allow-list `applyPatch`; loop detail panel resolves `documents.filter(d => d.linked_loop_ids.includes(loop.id))`; `DocumentType` enum incl. `sin_clasificar` via a `document-defaults.ts` label Record |
| LOOP-03 | User can record multiple `Presupuesto`s on an obra-kind OpenLoop (provider, amount, scope, received/valid dates, document) and compare them side by side | `Presupuesto` interface with integer-cents money; server-computed `total_cents` on write; pure `comparePresupuestos()` module (cheapest + deltas + sort) with a local `node --test`; attributes×quotes table inside an `overflow-x-auto` container; presupuesto section gated to `loop.kind === "obra"` |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Accept the uploaded file bytes | Browser → Vercel Blob (direct) | API (token broker only) | Vercel's 4.5 MB request-body limit forces client uploads for D-08's 15 MB cap; the file must not transit the Route Handler |
| Authorize the upload | API (`onBeforeGenerateToken`) | — | Token is minted server-side only after `requireAuth`; `allowedContentTypes` + `maximumSizeInBytes` are enforced by Vercel Blob from the token |
| Persist `Document` / `Presupuesto` metadata | API Route Handler → JSON store | Server Component (reads) | Whole-file JSON rewrite, single-writer — identical to Phase 1 `OpenLoop` |
| Serve a stored file back | API (private-blob proxy, streaming) | — | Private blob URLs are not browser-fetchable; proxy streams `get().stream` with `requireAuth` + safe headers |
| Compute presupuesto totals & comparison | API on write (`total_cents`); pure module for cheapest/deltas | Client (sort state, render) | Never trust a client-sent total; comparison math is a pure isomorphic function (Phase 1 `urgency.ts` precedent) |
| Resolve a loop's attachments | Server Component (first paint) | Client (after mutation → `router.refresh()`) | Matches Phase 1: server reads store, client island mutates then refreshes |
| First paint of Documentos list / detail panel | Server Component | — | No skeletons, no client fetch on load (Phase 1 rule) |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@vercel/blob` | 2.4.1 (installed) | Private object storage for file bytes + the JSON metadata documents | Already the repo's primary persistence layer; `./client` subpath exports `upload` + `handleUpload` for browser→Blob direct uploads `[VERIFIED: node_modules/@vercel/blob/dist/client.d.ts]` |
| `next` | 16.2.4 (installed) | App Router Route Handlers, Server Components, dynamic segments | Repo framework; `request.formData()` and streaming `Response` bodies are supported `[CITED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md]` |
| `date-fns` | ^4 (installed) | Parse/format `received_at` / `valid_until` / document `date` | Already used by `LoopSlideOver` and `relative-date.ts` |
| `lucide-react` | ^0.500 (installed) | Icons — `FileText` (sidebar), `Upload`, `Paperclip`, `Archive` | Repo icon set |
| `framer-motion` | ^12.40.0 (installed) | Slide-over / detail-panel enter/exit animation | Reuse the exact `AnimatePresence` + `motion.div` wrapper from `LoopSlideOver.tsx` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pdf-parse` | ^1.1.1 (installed) | Text extraction from a PDF | **Not this phase.** Only relevant if `extracted_text` is populated later (Phase 4/5). Dynamic import only: `(await import("pdf-parse")).default` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client upload (`@vercel/blob/client`) | Server upload via `await request.formData()` + server `put()` | Far simpler (one route, `requireAuth` first line, no token broker, works offline). **But** capped at ~4.5 MB on Vercel — contradicts D-08's 15 MB. Viable only if the user agrees to drop the cap to ~4 MB. |
| Integer-cents money | `number` euros with `toFixed(2)` on display | Float drift on `base * (1 + iva/100)` and on summing deltas; cents integers make `comparePresupuestos` exact and trivially testable |
| Separate `LoopDetailPanel.tsx` | Widen the existing `LoopSlideOver` with a `mode` prop | `LoopSlideOver` is a tight form state machine (`formKey` re-keying, `buildPatch`); detail mode is read-oriented with nested create forms and tabs. Forking risks the Phase 1 "component reshaped in a later slice" rework. Recommend separate component sharing only the motion wrapper. `/gsd-ui-phase 2` settles this. |
| HEIC stored as-is | Convert HEIC→JPEG on upload (`heic-convert` / `sharp`) | Adds a dependency with native binaries; `sharp` is heavy on Vercel. Defer — accept HEIC, note the browser-download caveat. |

**Installation:** none — no new packages. `@vercel/blob`, `date-fns`, `lucide-react`, `framer-motion`, `pdf-parse` are all already in `package.json`.

**Version verification:**
- `next@16.2.4` — `node -e "require('next/package.json').version"` → `16.2.4` `[VERIFIED]`
- `@vercel/blob@2.4.1` — `grep '"version"' node_modules/@vercel/blob/package.json` → `2.4.1` `[VERIFIED]`; exposes `.` and `./client` subpaths `[VERIFIED: package.json exports]`

## Package Legitimacy Audit

> This phase installs **no new external packages**. All libraries used are already in
> `package.json` and were vetted during earlier phases / the CV builder.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@vercel/blob` | npm | mature | very high | github.com/vercel/storage | OK | Already installed — no action |
| `pdf-parse` | npm | mature | high | github.com/modesty/pdf-parse | OK | Already installed — not used this phase |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
UPLOAD (production / preview — BLOB_READ_WRITE_TOKEN set)
────────────────────────────────────────────────────────
  Browser (DocumentUpload.tsx, "use client")
    │  for each selected file (D-03: loop client-side):
    │  1. client-side validate: ext ∈ allow-list, MIME ∈ allow-list, size ≤ 15 MB
    │
    │  2. upload(pathname, file, { access:'private', handleUploadUrl:'/api/community/blob-upload', ... })
    ▼
  POST /api/community/blob-upload   (@vercel/blob handleUpload broker)
    │  onBeforeGenerateToken(pathname, clientPayload):
    │    • requireAuth(request)  ← auth lives HERE, not as first line (see note)
    │    • return { allowedContentTypes:[pdf,jpeg,png,webp,heic],
    │               maximumSizeInBytes: 15*1024*1024,
    │               addRandomSuffix:false, allowOverwrite:false }
    │  → returns a short-lived client token
    ▼
  Browser  ──file bytes──▶  Vercel Blob  (direct, up to 5 TB, bypasses the 4.5 MB Route Handler limit)
    │
    │  3. on upload success → PutBlobResult { pathname, contentType, url, ... }
    │  4. POST /api/community/documents  { blob_pathname, content_type, size, original_name, linked_loop_id? }
    ▼
  POST /api/community/documents
    │  requireAuth → validate → build Document record → documents-store.saveDocuments([...])
    ▼
  data/community-documents.json  ⇄  Blob "community-documents.json"   (metadata only — NOT the file bytes)


VIEW A FILE
───────────
  Browser: <a target="_blank" href="/api/community/documents/{id}/file">
    ▼
  GET /api/community/documents/[id]/file
    │  requireAuth
    │  doc = documents.find(d => d.id === id)         → 404 if missing OR archived
    │  { stream, blob } = await get(doc.blob_pathname, { access:'private', useCache:false })
    │  return new NextResponse(stream, {
    │     'Content-Type': <our allow-list type for doc.type_of_file, NOT sniffed>,
    │     'Content-Disposition': 'inline; filename="<sanitised>"',
    │     'X-Content-Type-Options': 'nosniff',
    │     'Content-Security-Policy': "default-src 'none'; sandbox" })
    ▼
  Browser renders PDF/image inline in the new tab


PRESUPUESTO COMPARISON
──────────────────────
  Server Component (LoopDetailPanel data)     Client (PresupuestoComparison.tsx)
    presupuestos.filter(p =>            ──▶    sort state (total | received_at)
      p.loop_id === loop.id &&                  comparePresupuestos(list) →
      p.status !== 'archived')                    { cheapestId, rows:[{id, total_cents, delta_cents}] }
                                                 render attributes × quotes table in <div overflow-x-auto>
```

### Recommended Project Structure

```
app/
├── community-president/
│   └── documentos/
│       └── page.tsx                         # Server Component — reads documents-store, renders list
├── components/community/
│   ├── DocumentUpload.tsx                   # "use client" — drag/drop + <input type=file multiple>, per-file progress
│   ├── DocumentList.tsx / DocumentRow.tsx   # "use client" — inline type/title/date edit, archive, loop assignment
│   ├── LoopDetailPanel.tsx                  # "use client" — detail-mode slide-over: attachments + presupuestos tabs
│   ├── AttachDocumentControl.tsx            # "use client" — pick-from-library / upload-new (auto-attach)
│   ├── PresupuestoForm.tsx                  # "use client" — provider, base, IVA%, scope, dates, optional doc
│   └── PresupuestoComparison.tsx            # "use client" — attributes×quotes table, cheapest highlight, sort control
└── api/community/
    ├── blob-upload/route.ts                 # POST — handleUpload token broker (auth in onBeforeGenerateToken)
    ├── documents/route.ts                   # GET list · POST create-from-blob-metadata (+ local-dev multipart fallback)
    ├── documents/[id]/route.ts              # PATCH type/title/date/linked_loop_ids/status
    ├── documents/[id]/file/route.ts         # GET — private-blob proxy, inline
    ├── presupuestos/route.ts                # GET (?loop_id=) · POST create
    └── presupuestos/[id]/route.ts           # PATCH fields + status

lib/community/
├── documents-store.ts                       # copy of open-loops-store.ts — BLOB_PATHNAME "community-documents.json"
├── presupuestos-store.ts                    # copy of open-loops-store.ts — BLOB_PATHNAME "community-presupuestos.json"
├── document-defaults.ts                     # DOCUMENT_TYPE_LABELS, validators, applyDocumentPatch, PATCHABLE_DOCUMENT_KEYS,
│                                            #   FILE_TYPE allow-list (ext ↔ MIME ↔ canonical serve-type), MAX_FILE_BYTES
├── presupuesto-defaults.ts                  # validators, applyPresupuestoPatch, computeTotalCents, IVA default
└── presupuesto-compare.ts                   # pure comparePresupuestos(list, sortKey) — + presupuesto-compare.test.ts

data/
├── community-documents.json                 # []  (committed seed)
└── community-presupuestos.json              # []  (committed seed)

lib/types.ts                                 # + DocumentType, Document, Presupuesto under the existing
                                             #   "// ── Smart Community President ──" banner
app/components/community/CommunitySidebar.tsx # + { label:"Documentos", href:"/community-president/documentos", icon: FileText }
```

### Pattern 1: Dual-mode JSON store (copy verbatim)

**What:** one JSON document per entity, Blob-or-local, reads never throw, whole-file rewrite.
**When to use:** `Document` metadata and `Presupuesto` — exactly as `OpenLoop`.
**Example:** copy `lib/community/open-loops-store.ts` changing only the type and the two path
constants:

```ts
// lib/community/documents-store.ts  — Source: lib/community/open-loops-store.ts (verbatim structure)
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { get, put } from "@vercel/blob";
import type { Document } from "@/lib/types";

const BLOB_PATHNAME = "community-documents.json";
const LOCAL_PATH = join(process.cwd(), "data/community-documents.json");

export async function getDocuments(): Promise<Document[]> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const result = await get(BLOB_PATHNAME, { access: "private", useCache: false });
      if (result) {
        const text = await new Response(result.stream).text();
        return JSON.parse(text) as Document[];
      }
    } catch {
      // fall through to local
    }
  }
  try {
    return JSON.parse(readFileSync(LOCAL_PATH, "utf-8"));
  } catch {
    return [];
  }
}

export async function saveDocuments(docs: Document[]): Promise<void> {
  const json = JSON.stringify(docs, null, 2);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(BLOB_PATHNAME, json, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } else {
    writeFileSync(LOCAL_PATH, json);
  }
}
```

**The two-store split is deliberate:** the JSON above holds only *metadata*. The uploaded *file
bytes* live at a different Blob pathname (`community-documents/{uuid}.{ext}`) written by the
client `upload()` call, never by `saveDocuments`.

### Pattern 2: Client upload + token broker (new to this repo)

**What:** browser uploads bytes straight to Blob; the server only mints a scoped token.
**When to use:** the file upload path (D-08 needs > 4.5 MB).
**Example:**

```ts
// app/api/community/blob-upload/route.ts
// Source: vercel.com/docs/vercel-blob/client-upload  +  lib/community/require-auth.ts
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/community/require-auth";
import { ALLOWED_MIME, MAX_FILE_BYTES } from "@/lib/community/document-defaults";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // AUTH LIVES HERE — not as the route's first statement. The route is also
        // hit by Vercel's upload-completed webhook, which carries no dashboard_auth
        // cookie; requireAuth as line 1 would reject that callback.
        const denied = requireAuth(request);
        if (denied) throw new Error("Unauthorized");
        return {
          allowedContentTypes: ALLOWED_MIME,          // [ "application/pdf", "image/jpeg", ... ]
          maximumSizeInBytes: MAX_FILE_BYTES,         // 15 * 1024 * 1024
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
      // onUploadCompleted omitted: it does not fire on localhost, and the browser
      // does the metadata POST itself on upload success. Keep the record write in
      // one place (POST /api/community/documents).
    });
    return NextResponse.json(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
```

```tsx
// DocumentUpload.tsx (client) — per-file, isolated failure (D-03)
import { upload } from "@vercel/blob/client";

async function uploadOne(file: File): Promise<Document> {
  const ext = canonicalExt(file);                 // from the allow-list, NOT file.name
  const pathname = `community-documents/${crypto.randomUUID()}.${ext}`;
  const blob = await upload(pathname, file, {
    access: "private",
    handleUploadUrl: "/api/community/blob-upload",
    contentType: file.type || undefined,
    onUploadProgress: (p) => setProgress(file, p.percentage),
  });
  const res = await fetch("/api/community/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blob_pathname: blob.pathname,
      content_type: blob.contentType,
      original_name: file.name,
      size: file.size,
      linked_loop_id: loopId ?? null,   // upload-from-loop auto-attaches (D-05)
    }),
  });
  if (!res.ok) throw new Error("metadata");
  return res.json();
}
// caller: for (const f of files) { try { ok.push(await uploadOne(f)) } catch { failed.push(f) } }
```

**`access: "private"` on the client `upload()` is supported** in `@vercel/blob` 2.4.1
`[VERIFIED: client.d.ts — ClientCommonCreateBlobOptions.access: BlobAccessType]` and shown in the
official example `[CITED: vercel.com/docs/vercel-blob/client-upload]`.

### Pattern 3: Private-blob proxy — the delta from the CV route

**What:** `app/api/cv/versions/[id]/pdf/route.ts` copied with four changes for D-09.
**Example:**

```ts
// app/api/community/documents/[id]/file/route.ts
import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { requireAuth } from "@/lib/community/require-auth";
import { getDocuments } from "@/lib/community/documents-store";
import { SERVE_CONTENT_TYPE } from "@/lib/community/document-defaults";

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = requireAuth(request);                       // (1) requireAuth, not the cookie-truthy check
  if (denied) return denied;

  const { id } = await ctx.params;
  const doc = (await getDocuments()).find((d) => d.id === id);
  if (!doc || doc.status === "archived") {                   // (2) 404 on archived too (D-06)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const result = await get(doc.blob_pathname, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": SERVE_CONTENT_TYPE[doc.file_kind],   // (3) our allow-list type, not sniffed / not hard-coded
        "Content-Disposition": `inline; filename="${sanitizeFilename(doc.title)}"`, // (4) inline, not attachment
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
```

- The CV route **streams** (`new NextResponse(result.stream, …)`) — no buffering. Keep that; a
  15 MB buffer per request is avoidable memory pressure.
- `get()` returns `result.blob.contentType` and `result.blob.size`
  `[VERIFIED: node_modules/@vercel/blob/dist/index.d.ts — GetBlobResult]`. You *may* read
  `result.blob.contentType`, but prefer serving from your own `file_kind` → content-type map so a
  spoofed stored type can't drive an inline `text/html` render.
- `sanitizeFilename`: strip `"` `\r` `\n` and control chars; if the result is empty or non-ASCII,
  omit the `filename=` parameter entirely.

### Pattern 4: Many-to-many link as a full-array PATCH (D-02, D-05)

**What:** `Document.linked_loop_ids: string[]` is the single source of the link. No field on
`OpenLoop`. Both attach surfaces send the *complete new array*; the route replaces it wholesale
through a frozen allow-list (Phase 1 `applyPatch` pattern — defeats mass assignment + prototype
pollution in one move).

```ts
// document-defaults.ts
export const PATCHABLE_DOCUMENT_KEYS = Object.freeze([
  "title", "type", "doc_date", "linked_loop_ids", "status",
] as const);

// validateDocumentInput: linked_loop_ids must be string[], length ≤ 50, each trimmed non-empty.
// applyDocumentPatch: copy existing, overlay only own-property allow-listed keys (never spread body).
```

- Loop detail panel resolves attachments: `documents.filter(d => d.status !== "archived" &&
  d.linked_loop_ids.includes(loop.id))` — computed in the Server Component, passed down.
- Detach-from-loop and unassign-from-document are the *same* PATCH with `loop.id` removed from the
  array.
- Single-writer assumption (already accepted for v1) covers the read-modify-write on the client
  side; the server still re-reads the store inside the handler before writing.
- Dangling ids (a loop later dropped) are low-harm because orphans are allowed — but validate that
  each id exists at attach time anyway, to keep the "N adjuntos" counts honest.

### Pattern 5: Structured money — integer cents, server-computed total (D-12, D-16)

```ts
// presupuesto-defaults.ts
export const DEFAULT_IVA_PCT = 21;

/** base in integer cents, iva as a percent number → total in integer cents, half-up rounded. */
export function computeTotalCents(baseCents: number, ivaPct: number): number {
  return Math.round(baseCents * (1 + ivaPct / 100));
}
```

- Store `base_imponible_cents: number` (integer) and `iva_pct: number`; store the derived
  `total_cents: number`. **Compute `total_cents` in the API on every create and every PATCH that
  touches base or IVA** — never accept a client-sent total (mass-assignment guard + it's the only
  way the stored total is trustworthy for the comparison).
- Validation: `base_imponible_cents` integer, `0 < base ≤ 100_000_000` (1 M €); `iva_pct` number,
  `0 ≤ iva ≤ 100`. Reject non-integer cents.
- Form captures euros (`"1.234,56"` or `1234.56`) → convert to cents once, on submit; keep the
  raw string in component state so typing feels normal.

### Pattern 6: Pure comparison module (Phase 1 `urgency.ts` precedent)

```ts
// presupuesto-compare.ts  — imports only the Presupuesto type. No next/*, no fs, no React.
export type PresupuestoSortKey = "total" | "received_at";
export interface ComparisonRow { id: string; total_cents: number; delta_cents: number; }
export interface ComparisonResult { cheapestId: string | null; order: ComparisonRow[]; }

export function comparePresupuestos(
  list: Presupuesto[],
  sortKey: PresupuestoSortKey = "total",
): ComparisonResult { /* filter archived, find min total_cents, delta = total - min, stable sort */ }
```

Sort control (D-19) is client state in `PresupuestoComparison.tsx`; it re-calls
`comparePresupuestos(list, sortKey)` — the highlight (`cheapestId`) is invariant under sort.

### Anti-Patterns to Avoid

- **`await request.formData()` for the production upload path** — hits Vercel's 4.5 MB body limit;
  the file never reaches the handler for larger scans. (A `multipart/form-data` branch is fine as
  a *local-dev-only* fallback when `BLOB_READ_WRITE_TOKEN` is unset — small files, no infra limit.)
- **Putting the uploaded file's original name in the Blob pathname** — path-traversal / collision
  vector. Pathname = `community-documents/${crypto.randomUUID()}.${extFromAllowList}`.
- **Serving the proxy response with a sniffed or stored content-type and no `nosniff`** — an
  uploaded `.pdf` that is actually HTML could execute inline. Serve from your own allow-list map +
  `X-Content-Type-Options: nosniff` + a restrictive CSP.
- **`requireAuth` as the first line of `blob-upload/route.ts`** — the route is also the Blob
  upload-completed webhook target; auth belongs inside `onBeforeGenerateToken`.
- **Storing `total` as a float** — `1234.5 * 1.21` drifts; deltas accumulate error.
- **A field on `OpenLoop` for the link** — CONTEXT D-02 fixes the link on `Document`; adding a
  mirror on `OpenLoop` doubles the write and invites divergence.
- **Nesting the presupuesto create form inside `LoopSlideOver`'s form** — nested `<form>` is
  invalid HTML; the Phase 1 `LoopCard` `<button>`-nesting rework is the cautionary tale.
- **Static-importing `data/community-documents.json`** in a page/route — bakes a build-time
  snapshot (Phase 1 anti-pattern). Always go through the store getter.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Upload files > 4.5 MB through Vercel | A chunking scheme over your own Route Handler | `@vercel/blob/client` `upload()` + `handleUpload` | Vercel's limit is infra-level; the SDK does the token exchange, direct-to-storage PUT, and (optional) multipart |
| Enforce max upload size / content-type server-side | Manual byte counting in the handler | `maximumSizeInBytes` + `allowedContentTypes` in `onBeforeGenerateToken` | Vercel Blob rejects the upload itself, before bytes land |
| Serve a private blob to the browser | Generating a signed public URL / making the blob public | Stream `get(pathname,{access:'private',useCache:false}).stream` through the authed proxy | CLAUDE.md: never `access:"public"`, never hand the browser a blob URL |
| Money rounding | `parseFloat` + `.toFixed(2)` arithmetic | Integer cents + one `Math.round` in `computeTotalCents` | Deterministic, unit-testable, no drift in deltas |
| Enum ↔ label ↔ validator sync | Three separate lists | One `DOCUMENT_TYPE_LABELS` Record; derive `Set` and `<select>` from `Object.keys()` | Phase 1 Pitfall 7 — the display and validation vocab cannot drift |
| Existing-record merge | `{ ...existing, ...body }` | Frozen `PATCHABLE_*_KEYS` + own-property overlay | One choke point stops mass assignment + prototype pollution (Phase 1) |
| Slide/backdrop animation | New motion code | Copy the `AnimatePresence` + `motion.div` wrapper from `LoopSlideOver.tsx` | Same reduced-motion handling, same z-index/backdrop already tuned |

**Key insight:** almost nothing here is new logic — it is Phase 1's store/route/enum/patch
patterns re-instantiated with two new entities, plus one SDK feature (`@vercel/blob/client`) that
exists precisely so you don't hand-roll large uploads.

## Common Pitfalls

### Pitfall 1: Building the upload as a server `formData()` route, discovering the 4.5 MB wall at UAT

**What goes wrong:** works with a 1-page test PDF, fails on a real 12 MB acta scan with a 413.
**Why it happens:** the CV-versions route (the copy source) stores a *server-generated* buffer, so
the reviewer assumes "same pattern" — but that buffer never crossed the request body.
**How to avoid:** commit to client upload in Slice 1's plan; put a > 5 MB file in the UAT script.
**Warning signs:** a plan task that says "read `request.formData()`, call `put()`".

### Pitfall 2: `requireAuth` as line 1 of the token-broker route breaks upload completion

**What goes wrong:** uploads succeed but a later Vercel webhook call 401s (retries 5×, logs noise).
**Why it happens:** the route serves two callers — the authed browser and Vercel's unauthenticated
signed webhook.
**How to avoid:** auth inside `onBeforeGenerateToken`; let `handleUpload` verify the webhook.
**Warning signs:** `requireAuth(request)` above `const body = await request.json()` in `blob-upload`.

### Pitfall 3: `onUploadCompleted` silently never runs in local dev

**What goes wrong:** the `Document` record is written in `onUploadCompleted`, so local uploads
land in Blob but never appear in the list.
**Why it happens:** Vercel Blob cannot reach `localhost` to fire the callback
`[CITED: vercel.com/docs/vercel-blob/client-upload#local-development]`.
**How to avoid:** write the record from the browser's own post-upload `fetch('/api/community/documents')`;
treat `onUploadCompleted` as an optional backstop only (or omit it).

### Pitfall 4: HEIC opens as a download, not inline, on Chrome/Firefox desktop

**What goes wrong:** D-09 says "open inline in a new tab"; a `.heic` triggers a file download on
non-Safari browsers because they don't render `image/heic`.
**Why it happens:** browser codec support — Safari/iOS renders HEIC, Chromium/Firefox do not.
**How to avoid:** accept it for v1 (Nicola's phone photos are usually viewed on iOS). Document the
limitation; optionally show a hint on HEIC rows. Conversion (`sharp`/`heic-convert`) is deferred.
**Warning signs:** a UAT expectation that every uploaded image previews identically everywhere.

### Pitfall 5: Inline-served upload becomes a stored-XSS vector

**What goes wrong:** an uploaded file whose bytes are HTML/SVG-with-script, served
`Content-Disposition: inline` with a permissive content-type, executes in the app's origin.
**Why it happens:** trusting the extension/stored MIME when setting the response content-type.
**How to avoid:** serve `Content-Type` from a fixed `file_kind → type` map (only pdf + raster
images), add `X-Content-Type-Options: nosniff` and `Content-Security-Policy: default-src 'none'; sandbox`,
and never accept `image/svg+xml` into the allow-list.
**Warning signs:** `svg` in the accepted extensions; `Content-Type: doc.content_type` in the proxy.

### Pitfall 6: The widened detail panel scrolls the page body on mobile

**What goes wrong:** the attributes×quotes table forces horizontal page scroll on a phone —
violates the Phase 1 mobile rule.
**Why it happens:** the table is placed directly in the panel flow.
**How to avoid:** wrap the table in `<div class="overflow-x-auto">`; the panel itself stays
`overflow-y-auto`, `min-h-0` in a flex column (Phase 1 `LoopSlideOver` learned `min-h-0` the hard
way).

### Pitfall 7: `tsc --noEmit` breaks on a new `.test.ts` importing `.ts` specifiers

**What goes wrong:** `node --test` needs `./presupuesto-compare.ts`; `tsc` rejected that before
Phase 1 added `allowImportingTsExtensions: true`.
**Why it happens:** already fixed in `tsconfig.json` — but the test file must use `import type` for
type-only imports so native type-stripping erases them.
**How to avoid:** copy the header comment block from `lib/community/urgency.test.ts` verbatim.

## Runtime State Inventory

> **Not applicable.** Phase 2 is purely additive — new files, new Blob pathnames, new JSON
> documents, one new sidebar entry and one new field-consuming panel. It renames nothing, migrates
> no existing data, and changes no OS/service/secret registration.
>
> - **Stored data:** two *new* Blob JSON documents (`community-documents.json`,
>   `community-presupuestos.json`) + a new file pathspace `community-documents/*`. No existing
>   store is re-keyed. `community-open-loops.json` is read but not restructured.
> - **Live service config:** none. No cron, no external service.
> - **OS-registered state:** none.
> - **Secrets/env vars:** `BLOB_READ_WRITE_TOKEN` is *consumed* (already exists in Vercel per
>   Phase 1); no new secret, no rename.
> - **Build artifacts:** none.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `next` | everything | ✓ | 16.2.4 | — |
| `@vercel/blob` (`.` + `./client`) | upload, proxy, stores | ✓ | 2.4.1 | — |
| `BLOB_READ_WRITE_TOKEN` (Vercel prod + preview) | client-upload token broker; production persistence | ✓ (confirmed Phase 1 — shared Vercel var) | n/a | — |
| `BLOB_READ_WRITE_TOKEN` (local dev) | uploading files while running `npm run dev` | ✗ unless `vercel env pull` with a Development-scoped store connection | n/a | (a) pull a Development token, **or** (b) a `multipart/form-data` branch in `POST /api/community/documents` that writes bytes to a gitignored `data/community-files/` dir + the proxy reads from disk when the token is unset. Metadata stores + committed seeds work offline regardless. |
| `pdf-parse` | (only if `extracted_text` populated — deferred) | ✓ | 1.1.1 | not used this phase |
| Test runner | `presupuesto-compare.test.ts` | ✓ `node --test` (built-in, local only) | Node 25.x | none needed — not CI-gated |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** local-dev file upload — see the two options above. Recommend
Slice 1's plan pick one explicitly; option (a) keeps dev == prod and is less code.

## Testing Approach

> `workflow.nyquist_validation` is `false` in `.planning/config.json` — no formal Validation
> Architecture section. The repo has no CI test gate. The phase gate is
> `npx tsc --noEmit && npx eslint app/community-president app/components/community lib/community lib/types.ts app/api/community`
> (`config.json` `test_command`).

**Worth a local `node --test` file** (follows the Phase 1 `urgency.test.ts` precedent — pure,
deterministic, high-value, zero framework):

| Module | What to assert |
|--------|----------------|
| `presupuesto-compare.ts` `comparePresupuestos()` | cheapest = min `total_cents`; deltas correct incl. ties (delta 0 for co-cheapest); archived excluded; stable sort by `total` and by `received_at`; empty list → `{ cheapestId: null, order: [] }`; single presupuesto → delta 0, is cheapest |
| `presupuesto-defaults.ts` `computeTotalCents()` | `computeTotalCents(123456, 21) === 149382`; half-up rounding at the cent; `iva_pct: 0` → total == base |
| `document-defaults.ts` file-type allow-list | `.HEIC` (uppercase) accepted; `.svg` rejected; `application/pdf` MIME with `.exe` name rejected; empty MIME + `.heic` name → accepted (browsers send `""` for HEIC); MIME/ext mismatch rejected |
| `document-defaults.ts` `applyDocumentPatch()` | `linked_loop_ids` replaced wholesale; `__proto__` / `id` / `blob_pathname` in the body are ignored; `status` only accepts `active` \| `archived` |

**Manual / UAT only:** the upload round-trip (needs a real Blob token + a > 5 MB file), inline
view in a new tab per browser, the detail-panel width at 390 px / 1440 px, HEIC download behavior.

## Code Examples

### Document + Presupuesto interfaces (recommended — for `lib/types.ts`, under the existing banner)

```ts
// ── Smart Community President ──  (append below the existing OpenLoop / Submission block)

// D-04 discretion resolved: "sin_clasificar" is a distinct 5th member, not an overload —
// mirrors Phase 1's enum-single-source pattern. Spanish canonical keys.
export type DocumentType =
  | "acta"
  | "contrato"
  | "presupuesto"
  | "carta"
  | "sin_clasificar";

// Which on-disk kinds we accept + how each is served back inline (D-07, D-09).
export type DocumentFileKind = "pdf" | "image";

export type DocumentStatus = "active" | "archived"; // D-06 soft-delete

export interface Document {
  id: string;                       // crypto.randomUUID()
  title: string;                    // defaults to original filename (D-04), editable, rendered as React children only
  type: DocumentType;               // defaults to "sin_clasificar" (D-04)
  status: DocumentStatus;           // default "active"
  blob_pathname: string;            // "community-documents/{uuid}.{ext}" — server-constructed, never from user input
  file_kind: DocumentFileKind;      // drives the proxy Content-Type (not sniffed)
  content_type: string;             // the stored MIME, for reference/debug only
  size_bytes: number;
  original_name: string;            // as uploaded — data only, never used in a path
  linked_loop_ids: string[];        // D-02 — the single source of the many-to-many link; [] = orphan
  doc_date?: string | null;         // "YYYY-MM-DD" — the document's own date (D-04), optional
  uploaded_at: string;              // ISO 8601 — distinct from doc_date
  updated_at: string;               // ISO 8601
  extracted_text?: string;          // DECLARED now, POPULATED never in Phase 2 (D deferred + Phase 1 "shape now, behaviour later")
}

export type PresupuestoStatus = "active" | "archived"; // D-06 / D-16

export interface Presupuesto {
  id: string;
  loop_id: string;                  // the obra OpenLoop this quote belongs to (D-10). Not nested on the loop.
  provider: string;                 // required (D-16), free text, React-children only
  base_imponible_cents: number;     // integer cents (D-12)
  iva_pct: number;                  // percent, default 21 (D-16 / discretion)
  total_cents: number;              // SERVER-computed & stored = computeTotalCents(base, iva) (D-12)
  scope: string;                    // free-text multi-line (D-14)
  received_at?: string | null;      // "YYYY-MM-DD", optional (D-15)
  valid_until?: string | null;      // "YYYY-MM-DD", optional (D-15)
  document_id?: string | null;      // optional link to a Document of type "presupuesto" (D-13)
  status: PresupuestoStatus;        // default "active"
  created_at: string;
  updated_at: string;
}
```

### File-type allow-list (recommended — `document-defaults.ts`)

```ts
export const MAX_FILE_BYTES = 15 * 1024 * 1024; // D-08

// ext ↔ MIME(s) ↔ how we serve it back. NO svg (XSS). NO office docs.
export const FILE_TYPES = {
  pdf:  { ext: ["pdf"],          mime: ["application/pdf"],                 kind: "pdf"   as const },
  jpg:  { ext: ["jpg", "jpeg"],  mime: ["image/jpeg"],                      kind: "image" as const },
  png:  { ext: ["png"],          mime: ["image/png"],                       kind: "image" as const },
  webp: { ext: ["webp"],         mime: ["image/webp"],                      kind: "image" as const },
  heic: { ext: ["heic", "heif"], mime: ["image/heic", "image/heif", ""],    kind: "image" as const },
} as const;

export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

// Served back from the proxy — fixed, never sniffed. HEIC served as image/heic (Safari renders; others download).
export const SERVE_CONTENT_TYPE: Record<"pdf" | "image", string> = {
  pdf: "application/pdf",
  image: "image/*-set-per-file", // in practice: echo the validated FILE_TYPES mime for that upload
};
```
*(Refine `SERVE_CONTENT_TYPE` to carry the specific image MIME per `Document`; the point is it
comes from validation, not from `get().blob.contentType`.)*

### Sidebar entry (D-01)

```tsx
// CommunitySidebar.tsx — NAV_ITEMS
import { LayoutDashboard, FileText } from "lucide-react";
const NAV_ITEMS = [
  { label: "Panel", href: "/community-president", icon: LayoutDashboard },
  { label: "Documentos", href: "/community-president/documentos", icon: FileText },
];
// NavLinks already does `pathname.startsWith(item.href)` for non-root hrefs — no other change.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `export const config = { api: { bodyParser } }` (Pages Router) | Route Handlers read `request.formData()` / `.json()` directly, no config | Next 13 App Router | The `route.md` doc explicitly notes "you do not need to use `bodyParser`" `[CITED: node_modules/next/dist/docs/.../route.md]` |
| `GET` Route Handlers cached by default | `GET` handlers dynamic by default since v15 | Next 15 | Our list endpoints are dynamic automatically — no `export const dynamic` needed |
| `context.params` a plain object | `context.params` is a `Promise` — `await ctx.params` | Next 15 RC | Already the repo pattern (`open-loops/[id]/route.ts`); copy it |
| Server upload for everything | Client upload (`@vercel/blob/client`) for anything that could exceed 4.5 MB | Vercel Blob GA | Direct browser→storage; server only brokers a scoped token |
| `head()`/`get()` returned a bare stream | `get()` returns a discriminated union on `statusCode` (200 vs 304) with `blob.contentType`/`blob.size` | `@vercel/blob` 2.x | Proxy can read real size/type; check `result.statusCode === 200` |

**Deprecated/outdated:**
- `Content-Disposition: attachment` + hard-coded `application/pdf` in the CV proxy — D-09 replaces
  both for the community route (still fine for the CV route, which is out of scope).
- Any training-data memory of `next.config` `api.bodyParser` / `sizeLimit` — not an App Router
  concept. `serverActions.bodySizeLimit` (default 1 MB) applies only to Server Actions, which this
  phase does not use.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Honoring D-08's ~15 MB cap requires client uploads; the added complexity (token broker, one-file-per-request, local-dev token) is acceptable vs. dropping the cap to ~4 MB with a simple server `formData()` route | Summary, Pattern 2 | If the user prefers simplicity, Slice 1 re-scopes to a server route + 4 MB client cap — smaller but violates D-08 as written. **Confirm with the user in plan/discuss.** |
| A2 | Money stored as integer cents (`base_imponible_cents`, `total_cents`) | Pattern 5, interfaces | Low. If the user wants euro decimals in the JSON for readability, switch to `number` + explicit `Math.round` on write — comparison logic unchanged in shape. |
| A3 | `Document.type` default is a distinct enum member `"sin_clasificar"` (not an overload) | Code Examples | Low — cosmetic/vocabulary. Aligns with Phase 1 enum pattern. |
| A4 | Detail mode = a separate `LoopDetailPanel.tsx` sharing only the motion wrapper, not a widened `LoopSlideOver` | Architecture Patterns | Medium. `/gsd-ui-phase 2` produces the UI-SPEC that settles this; the store/route/type work is identical either way. |
| A5 | HEIC served as-is, downloading instead of previewing on non-Safari browsers, is acceptable for v1 | Pitfall 4 | Low — Nicola's stated use case is iOS phone photos. If cross-browser preview is required, add `sharp`/`heic-convert` (new dependency, native binary) — a later slice. |
| A6 | One file per request (client loops); no batch multipart endpoint | Pattern 2, D-03 | Low — falls out of the client-upload architecture naturally and gives clean per-file failure isolation. |
| A7 | `extracted_text?: string` is declared on `Document` now but never populated this phase | interfaces | Negligible — an unused optional field; removes a type migration in Phase 4/5. |
| A8 | `linked_loop_ids` on `Document` is the *only* link location (no mirror on `OpenLoop`) | Pattern 4 | Low — CONTEXT D-02 states this explicitly; listed only because it was also a "discretion" item. |
| A9 | Local-dev uploads use a pulled Development-scoped `BLOB_READ_WRITE_TOKEN` (option a), not a disk-fallback branch | Environment Availability | Low. Either works; option (a) is less code. Plan should state the choice. |

## Open Questions

1. **Local-dev upload path**
   - What we know: production/preview have the Blob token; the metadata stores work offline via seeds.
   - What's unclear: whether Nicola wants to be able to upload files while fully offline (`npm run dev`, no token).
   - Recommendation: default to option (a) — `vercel env pull` a Development token; add the
     disk-fallback branch only if he says offline upload matters.

2. **`document_id` ↔ `Document.type = "presupuesto"` coupling**
   - What we know: D-13 makes the linked document optional; D-04 note says type must be settable
     after upload.
   - What's unclear: should linking a `Document` to a `Presupuesto` auto-set that document's
     `type` to `"presupuesto"`? Should the picker filter to `type === "presupuesto"` only?
   - Recommendation: picker shows all non-archived documents but sorts `presupuesto`-typed first;
     do **not** auto-mutate the document's type (least surprise). Confirm at UI-SPEC time.

3. **Attachment indicator on `LoopCard` (discretion)**
   - Recommendation: yes — a small `Paperclip N` chip in the card's `pointer-events-none` content
     layer when `count > 0`. The Server Component (`page.tsx`) builds a `Map<loopId, number>` from
     the documents store and passes it through `Cockpit` → `LoopColumn` → `LoopCard`. Low effort,
     good signal. Cut if it complicates the Slice 2 plan.

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: "high"`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Encoding/Sanitization | yes | Free text (`title`, `original_name`, `provider`, `scope`) rendered as React children only — never `dangerouslySetInnerHTML` (Phase 1 rule). `Content-Disposition` filename sanitized. |
| V2 Authentication | yes (reuse) | `requireAuth` cookie === `DASHBOARD_TOKEN`, three-part fail-closed. No new auth mechanism. |
| V3 Session Management | no | No session state added. |
| V4 Access Control | yes | `requireAuth` is the literal first statement of every new verb **except** `blob-upload/route.ts` (auth in `onBeforeGenerateToken` — documented, not a regression). The file proxy re-checks auth + archived status per request. |
| V5 Validation | yes | File: extension ∈ allow-list **and** MIME ∈ allow-list **and** size ≤ 15 MB, enforced client-side, in `onBeforeGenerateToken` (`allowedContentTypes` + `maximumSizeInBytes`), and on the metadata POST. Money: integer cents, bounded ranges. `linked_loop_ids`: `string[]`, length ≤ 50. Enum allow-lists via `Object.keys()`. Frozen `PATCHABLE_*_KEYS` overlay (no body spread). |
| V6 Cryptography | no | No crypto beyond `crypto.randomUUID()` for ids/pathnames. |
| V7 Error/Logging | yes | Never log the request body, filenames, or provider/scope text — they can contain neighbour names (mirror the Phase 1 `// Never log the request body` comment). Catch → `err instanceof Error ? err.message : String(err)`. |
| V12 Files & Resources | yes | Random-UUID pathname (no user filename in path); private store; served only through the authed streaming proxy; `X-Content-Type-Options: nosniff` + `Content-Security-Policy: default-src 'none'; sandbox`; content-type from a fixed map; `svg`/executables excluded; archived → 404. |
| V13 API | yes | Route Handlers only; 400 on bad JSON / validation, 401 unauth, 404 on missing/archived, 500 with sanitized message. No `DELETE` verb anywhere (soft-delete only). |

### Known Threat Patterns for {Next.js Route Handler + Vercel Blob upload/proxy}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Oversized-file DoS (memory / cost) | Denial of Service | Dual size cap: client pre-check + `maximumSizeInBytes` in the blob token; proxy streams (never buffers) |
| Content-type spoofing → stored XSS on inline view | Tampering / Elevation | Serve `Content-Type` from a fixed `file_kind` map, `nosniff`, restrictive CSP, no `image/svg+xml` in allow-list |
| Path traversal / collision via crafted filename | Tampering | Pathname = `community-documents/${crypto.randomUUID()}.${extFromAllowList}`; `original_name` is data only |
| SSRF via the proxy route | Information Disclosure | Proxy takes a `Document` **id** → looks up the server-stored `blob_pathname`; never fetches a user-supplied URL; `get()` is pathname-scoped to our store |
| Unauthorized upload (open token broker) | Elevation of Privilege | `requireAuth` inside `onBeforeGenerateToken` before any token is minted |
| Mass assignment on `total_cents` / `status` / `blob_pathname` | Tampering | Frozen `PATCHABLE_*_KEYS` allow-list overlay; `total_cents` always server-recomputed; `blob_pathname` never patchable |
| Prototype pollution via PATCH body | Tampering | Own-property check against the frozen key list — polluting keys are never read (Phase 1 pattern) |
| Auth webhook confusion on `blob-upload` | Spoofing | `handleUpload` verifies Vercel's signed upload-completed callback; browser path is cookie-authed in `onBeforeGenerateToken` |
| Reading a private blob URL directly | Information Disclosure | Store stays `access:"private"`; browser only ever gets `/api/community/documents/{id}/file` |
| Archived record still downloadable | Access Control | Proxy returns 404 when `doc.status === "archived"` (D-06) |

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — Route Handler HTTP methods, `request.formData()`, streaming `Response`, `context.params` as Promise, "no bodyParser needed", version history (v15 caching/params changes)
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` — caching model, `RouteContext` helper, dynamic-by-default
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md` — `bodySizeLimit` is Server-Actions-only, default 1 MB (confirms it does not apply here)
- `node_modules/@vercel/blob/dist/client.d.ts` — `upload`, `handleUpload`, `HandleUploadOptions`, `onBeforeGenerateToken` returning `allowedContentTypes` / `maximumSizeInBytes` / `addRandomSuffix` / `allowOverwrite`, `access` on client `upload`
- `node_modules/@vercel/blob/dist/index.d.ts` — `get()` `GetCommandOptions` (`access`, `useCache`, `ifNoneMatch`), `GetBlobResult` discriminated union (`statusCode` 200/304, `blob.contentType`, `blob.size`)
- `node_modules/@vercel/blob/README.md` — "the request body your server can handle … in case of a Vercel-hosted website is 4.5 MB … you can't upload files larger than 4.5 MB … when using [server upload]"
- Repo code read directly: `lib/community/open-loops-store.ts`, `lib/community/require-auth.ts`, `lib/community/loop-defaults.ts`, `lib/community/urgency.test.ts`, `app/api/cv/versions/route.ts`, `app/api/cv/versions/[id]/pdf/route.ts`, `app/api/community/open-loops/route.ts` + `[id]/route.ts`, `app/components/community/{LoopSlideOver,CommunitySidebar,Cockpit}.tsx`, `app/community-president/{layout,page}.tsx`, `lib/types.ts` (Community banner), `next.config.ts`, `tsconfig.json`, `package.json`, `.gitignore`, `.planning/config.json`
- `.planning/phases/01-cockpit-foundation-open-loop-tracker/01-LEARNINGS.md` — enum SoT, frozen `applyPatch`, `requireAuth`-first, dual-mode store, `allowImportingTsExtensions`, mobile `min-h-0` / `overflow-x-auto`, local `node --test` pattern, no-hard-delete
- `.planning/codebase/{CONVENTIONS,INTEGRATIONS,STRUCTURE}.md` — dual-mode store template, "Where to Add New Code" (fourth-surface layout), private-Blob access pattern

### Secondary (MEDIUM confidence)
- `vercel.com/docs/vercel-blob/client-upload` (last_updated 2026-08-26) — `upload()` + `handleUpload` example with `access: 'private'`, `onBeforeGenerateToken` auth requirement, `onUploadCompleted` does not fire on localhost, `allowedContentTypes` usage
- `vercel.com/docs/functions/limitations` (via WebSearch, 2026-09-10) — 4.5 MB request/response body limit, `FUNCTION_PAYLOAD_TOO_LARGE` (413), infra-level, streaming exempt

### Tertiary (LOW confidence)
- WebSearch result summaries on bypassing the 4.5 MB limit (Medium / dev.to articles) — used only to corroborate the direct-to-storage workaround, not for specifics

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; every library version verified against `node_modules`
- Upload architecture: HIGH — 4.5 MB limit verified two ways (bundled README + live docs); client-upload API verified in `client.d.ts`
- Store / route / enum / patch patterns: HIGH — copied from Phase 1 code read this session
- Data model (`Document` / `Presupuesto` shapes): MEDIUM — grounded in the data-model sketch + CONTEXT, but field names are recommendations pending plan/UI-SPEC
- Detail-mode UI shape: MEDIUM — defer to `/gsd-ui-phase 2`
- Pitfalls: HIGH for the storage/auth ones (verified), MEDIUM for HEIC browser behavior (well-known but not re-tested this session)

**Research date:** 2026-09-10
**Valid until:** 2026-10-10 for the codebase patterns; ~2026-09-24 for the Vercel Blob / limits specifics (fast-moving platform — re-check the 4.5 MB figure and `@vercel/blob` API if planning slips a few weeks)
