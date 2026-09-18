---
phase: 02-documents-presupuestos-workflow
reviewed: 2026-09-18T00:00:00Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - app/api/community/blob-upload/route.ts
  - app/api/community/documents/[id]/file/route.ts
  - app/api/community/documents/[id]/route.ts
  - app/api/community/documents/route.ts
  - app/api/community/presupuestos/[id]/route.ts
  - app/api/community/presupuestos/route.ts
  - app/community-president/documentos/page.tsx
  - app/community-president/page.tsx
  - app/components/community/AttachDocumentControl.tsx
  - app/components/community/Cockpit.tsx
  - app/components/community/CommunitySidebar.tsx
  - app/components/community/DocumentList.tsx
  - app/components/community/DocumentRow.tsx
  - app/components/community/DocumentUpload.tsx
  - app/components/community/LoopCard.tsx
  - app/components/community/LoopColumn.tsx
  - app/components/community/LoopDetailPanel.tsx
  - app/components/community/NoDateSection.tsx
  - app/components/community/PresupuestoComparison.tsx
  - app/components/community/PresupuestoForm.tsx
  - data/community-documents.json
  - data/community-presupuestos.json
  - lib/community/document-defaults.test.ts
  - lib/community/document-defaults.ts
  - lib/community/documents-store.ts
  - lib/community/presupuesto-compare.test.ts
  - lib/community/presupuesto-compare.ts
  - lib/community/presupuesto-defaults.test.ts
  - lib/community/presupuesto-defaults.ts
  - lib/community/presupuestos-store.ts
  - lib/types.ts
findings:
  critical: 0
  warning: 6
  info: 6
  total: 12
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-09-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 30
**Status:** issues_found

## Summary

This phase adds a Documents library, a loop↔document attachment slice, and a
presupuestos (quote) comparison workflow on top of Phase 1's cockpit. The
core security controls the review was asked to pay special attention to are
implemented correctly and consistently:

- Blob JSON stores (`documents-store.ts`, `presupuestos-store.ts`) always use
  `access: "private"` server-side, with `useCache: false` reads.
- Every `/api/community/*` handler in scope calls `requireAuth(request)` as
  its literal first statement, except `blob-upload/route.ts`, whose
  placement inside `onBeforeGenerateToken` is explicitly documented and
  intentional (confirmed against the installed `@vercel/blob` v2.4.1 source:
  see IN-06 below for a related but non-blocking documentation nit).
- Mass assignment is genuinely blocked: `PATCHABLE_DOCUMENT_KEYS` and
  `PATCHABLE_PRESUPUESTO_KEYS` are frozen arrays, both patch appliers copy
  `existing` and overlay only allow-listed keys by explicit switch case —
  neither spreads the raw body — and `total_cents` is unconditionally
  server-recomputed from the merged record, never trusted from the client
  (verified in both the implementation and the accompanying unit tests).
- There is no hard-delete path anywhere in scope; archiving is a status
  change enforced by the frozen `PATCHABLE_*_KEYS` lists and by the absence
  of any `DELETE` export.
- The file proxy (`documents/[id]/file/route.ts`) serves `Content-Type` only
  from `serveContentType()`, which reads from the frozen `FILE_TYPES`/
  `SERVE_CONTENT_TYPE` map — never from the value Blob reports for the
  object — and sends `X-Content-Type-Options: nosniff` plus a locking-down
  CSP (`default-src 'none'; sandbox`).
- `blob_pathname` is validated server-side against a strict
  `community-documents/{uuid}.{ext}` regex before a `Document` row can ever
  reference it, and it is absent from `PATCHABLE_DOCUMENT_KEYS`, so it can
  never be changed post-creation.
- No free-text field (`title`, `provider`, `scope`, `original_name`, etc.) is
  ever rendered through `dangerouslySetInnerHTML` — every occurrence found
  in this diff is an ordinary React child.

None of the issues found below rise to a correctness/security level that
should block shipping on their own, but several are worth fixing before this
surface accumulates more real user data (a comunidad's neighbour names,
provider names, amounts).

## Warnings

### WR-01: Document `title` can exceed the declared 200-char cap at creation time

**File:** `lib/community/document-defaults.ts:163-164, 224-228, 340-361`
**Issue:** `TITLE_MAX` is 200 and `ORIGINAL_NAME_MAX` is 300. `validateDocumentInput`'s title-length check only runs `if (body.title !== undefined)` — but the browser upload flow (`DocumentUpload.tsx`) never sends a `title` field on create; `applyDocumentCreateDefaults` derives it unconditionally from the filename: `title: originalName` (line 351), with no truncation. A file uploaded with a 250-character filename therefore produces a stored `Document.title` up to 300 characters — silently violating the 200-char invariant that the PATCH path enforces (`validateDocumentInput`'s `body.title.length > TITLE_MAX` check) and that the edit `<input maxLength={200}>` in `DocumentRow.tsx` assumes. A document created this way can never have its over-length title "fixed" by re-submitting it unchanged through PATCH, since PATCH only ever receives edits, not the original create body.
**Fix:**
```ts
// lib/community/document-defaults.ts, in applyDocumentCreateDefaults
return {
  title: originalName.slice(0, TITLE_MAX),
  ...
};
```

### WR-02: PATCH `/api/community/documents/[id]` never validates that `linked_loop_ids` reference real loops

**File:** `app/api/community/documents/[id]/route.ts:13-57`, contrast with `app/api/community/documents/route.ts:55-63`
**Issue:** The `POST` create path checks `linked_loop_id` against `getOpenLoops()` before creating a document (documents/route.ts:55-63). The `PATCH` path validates the *shape* of `linked_loop_ids` (array of non-empty, non-duplicate strings, ≤ 50 entries — `validateDocumentInput`) but never checks that each id corresponds to an existing loop. A hand-crafted PATCH (or a future UI regression) can silently attach a document to a nonexistent loop id, producing a dangling reference that `documentsForLoop` will simply never match — a quiet, hard-to-debug inconsistency between "this document says it's linked" and "no loop ever shows it."
**Fix:** In the PATCH handler, when `patch.linked_loop_ids` is present, cross-check every id against `getOpenLoops()` the same way `POST` does, and reject with a Spanish error on any miss.

### WR-03: The blob-upload token broker doesn't constrain the destination pathname

**File:** `app/api/community/blob-upload/route.ts:24-41`
**Issue:** `onBeforeGenerateToken` restricts `allowedContentTypes` and `maximumSizeInBytes`, but never inspects the `pathname` argument it receives (the first parameter `handleUpload`'s `onBeforeGenerateToken` is called with, per the SDK). Any authenticated caller (i.e., anyone holding the `dashboard_auth` cookie) can therefore request a signed upload token for an arbitrary pathname in the Blob store, not just `community-documents/{uuid}.{ext}`. The only thing preventing an arbitrary write from ever surfacing in the app is that `documents/route.ts`'s `validateDocumentInput` later rejects any `blob_pathname` that doesn't match `BLOB_PATHNAME_RE` before creating a `Document` row — so this is contained today, but it's a missing layer of defense-in-depth at the point that actually authorizes the write, and a future consumer of this token broker (or a second upload UI) could reintroduce the gap without any test catching it.
**Fix:**
```ts
onBeforeGenerateToken: async (pathname) => {
  const denied = requireAuth(request);
  if (denied) throw new Error("Unauthorized");
  if (!BLOB_PATHNAME_RE.test(pathname)) throw new Error("Invalid pathname");
  return { allowedContentTypes: ALLOWED_MIME, maximumSizeInBytes: MAX_FILE_BYTES, addRandomSuffix: false, allowOverwrite: false };
},
```
(export `BLOB_PATHNAME_RE` from `document-defaults.ts` alongside `ALLOWED_MIME`/`MAX_FILE_BYTES` so this route and the validator share one pattern.)

### WR-04: `access: "private"` on the client upload is not bound to the signed token — verify it can't be swapped for `"public"`

**File:** `app/components/community/DocumentUpload.tsx:91-94`
**Issue:** `upload(pathname, row.file, { access: "private", handleUploadUrl: ..., contentType, onUploadProgress })` hardcodes private access, which is correct for the app's own UI. Tracing the installed `@vercel/blob@2.4.1` client SDK (`node_modules/@vercel/blob/dist/client.js`, `retrieveClientToken` and `generateClientTokenFromReadWriteToken`), the payload sent to `/api/community/blob-upload` to obtain a client token contains only `pathname`, `clientPayload`, `multipart` — and the signed token itself is built from `argsWithoutToken` (`allowedContentTypes`, `maximumSizeInBytes`, `addRandomSuffix`, `allowOverwrite`, `pathname`, `validUntil`) with **no `access` field**. `access` is consumed purely client-side (`chunk-SH3U4PAV.js`) to pick the upload URL host (`{store}.public.` vs `{store}.private.`) and an `x-vercel-blob-access` header on the final PUT. Nothing in this app's server-side token issuance appears to pin the resulting object to private access. For a comunidad's acta scans and provider quotes this matters: if Vercel's backend honors whatever access value the caller of the signed token supplies (rather than enforcing it from store configuration), an actor who already holds `dashboard_auth` — but also anyone who can read the short-lived client token off the wire before it expires — could request `access: "public"` instead, making that one document's Blob URL world-readable. This exact client-token pattern is called out in `AGENTS.md`/`CLAUDE.md` as "already-fixed" elsewhere (`lib/cv/profile-store.ts`), so this may be an accepted/verified-safe pattern at the Vercel-infrastructure level already — I could not confirm server-side enforcement from the SDK source alone.
**Fix:** Confirm with Vercel (dashboard store settings or support) that object-level `access` cannot be overridden by whoever holds a short-lived client token regardless of what `onBeforeGenerateToken`'s returned options say; if it can be overridden, this needs to move to a token-scoped constraint (or fall back to a server-proxied upload for this specific route) rather than a client-supplied flag.

### WR-05: `blob-upload` returns HTTP 400 for an authorization failure, inconsistent with every other route in this phase

**File:** `app/api/community/blob-upload/route.ts:32-33, 49-52`
**Issue:** Every other `/api/community/*` handler in this phase returns the `requireAuth` helper's `401` response directly. Here, `requireAuth`'s rejection is converted into `throw new Error("Unauthorized")` inside `onBeforeGenerateToken`, which propagates to the outer `catch` and is returned as `NextResponse.json({ error: msg }, { status: 400 })` — a generic 400, indistinguishable from a malformed-body 400. This is a minor but real inconsistency for anyone monitoring auth failures (e.g., distinguishing "someone is probing without a cookie" from "the client sent bad JSON").
**Fix:**
```ts
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  const status = msg === "Unauthorized" ? 401 : 400;
  return NextResponse.json({ error: msg }, { status });
}
```

### WR-06: Plain `"YYYY-MM-DD"` dates are parsed with `new Date(ymd)`, which is timezone-unsafe

**File:** `app/components/community/DocumentRow.tsx:57-60`, `app/components/community/PresupuestoComparison.tsx:35-42`
**Issue:** `format(new Date(document.doc_date ?? document.uploaded_at), "d MMM yyyy")` and `format(new Date(ymd), "d MMM yyyy")` both parse a bare calendar-date string as UTC midnight, then format it in the browser/server's local timezone. For any timezone with a negative UTC offset (west of Greenwich), this shifts the displayed date back by one day (e.g., `doc_date: "2026-04-12"` renders as "11 abr 2026"). For the app's primary CET/CEST deployment this happens not to manifest (positive offset), but it's still objectively incorrect code that will misrender for any negative-offset viewer or environment, and it is the same well-known JS date-parsing footgun in two places in this diff.
**Fix:** Parse the date components explicitly instead of relying on UTC-midnight interpretation:
```ts
function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}
```
and use `parseYmdLocal(...)` in place of `new Date(...)` at both call sites.

## Info

### IN-01: Dead `image/heif` branch in `DocumentRow.tsx`

**File:** `app/components/community/DocumentRow.tsx:61-63`
**Issue:** `isHeic` checks `document.content_type === "image/heic" || document.content_type === "image/heif"`, but `FILE_TYPES.heic.serve` (`lib/community/document-defaults.ts:58-63`) is fixed at `"image/heic"` for both `.heic` and `.heif` extensions — `classifyFile` never returns `"image/heif"` as a `content_type`, so a stored `Document.content_type` can never equal `"image/heif"`. The second half of the `||` is unreachable.
**Fix:** `document.content_type === "image/heic"` is sufficient; drop the dead comparison (or import `SERVE_CONTENT_TYPE`/the entry directly to make the coupling explicit).

### IN-02: The newest-first `uploaded_at` sort comparator is duplicated four times

**File:** `app/components/community/AttachDocumentControl.tsx:49-53`, `app/components/community/PresupuestoForm.tsx:51-59` (`sortDocuments`), `app/community-president/documentos/page.tsx:15-20`, `app/community-president/page.tsx:40-44`
**Issue:** The exact comparator `(a, b) => a.uploaded_at < b.uploaded_at ? 1 : a.uploaded_at > b.uploaded_at ? -1 : 0` (sometimes combined with a "presupuesto type first" tiebreaker) is copy-pasted across four files. `documentsForLoop` in `document-defaults.ts` already centralizes this exact logic for the loop-scoped case — the same pattern should be pulled out for the general "documents newest first" case too.
**Fix:** Export `sortByUploadedAtDesc(docs: Document[]): Document[]` from `lib/community/document-defaults.ts` and import it at all four call sites instead of re-declaring the comparator.

### IN-03: Redundant re-filtering of already-archived-filtered document lists

**File:** `app/components/community/LoopDetailPanel.tsx:406-407`, `app/components/community/PresupuestoForm.tsx:53`
**Issue:** Both components re-apply `.filter((d) => d.status !== "archived")` to `libraryDocuments`/`documents` props that are already pre-filtered to non-archived documents server-side (`app/community-president/page.tsx:40-41`). It's harmless today, but it obscures the actual source of truth and could mislead a future edit into thinking the filter is load-bearing at this call site specifically.
**Fix:** Drop the redundant filter, or add a one-line comment noting it's defensive/redundant on purpose.

### IN-04: Unreachable "not a string → null" fallback branches in both patch appliers

**File:** `lib/community/document-defaults.ts:310-311` (`doc_date`), `lib/community/presupuesto-defaults.ts:213-221` (`received_at`, `valid_until`, `document_id`)
**Issue:** e.g. `next.doc_date = typeof value === "string" ? value : null;` — but `validateDocumentInput`/`validatePresupuestoInput` already reject any non-string, non-null value for these fields before `applyDocumentPatch`/`applyPresupuestoPatch` ever runs (per each function's own doc comment: "Call only after validate...Input(...) has returned null"). The `: null` branch can therefore never execute in practice given the documented calling contract.
**Fix:** No functional change needed; if you want to make the invariant explicit, `next.doc_date = value as string | null;` with a one-line comment referencing the upstream guarantee is more honest than a defensive ternary that implies a possibility the code has already ruled out.

### IN-05: Inconsistent date-string comparison style in `presupuesto-compare.ts`

**File:** `lib/community/presupuesto-compare.ts:76-80`
**Issue:** The `received_at` sort uses `aDate.localeCompare(bDate)`, while every other ISO-date-ish sort added in this phase (`documentsForLoop`, the two page-level document sorts, `AttachDocumentControl`, `PresupuestoForm`) uses a plain `<`/`>` string comparator. For two `"YYYY-MM-DD"` strings these should agree in the default locale, but `localeCompare` is collation-dependent and unnecessary here — the manual comparator used everywhere else is both faster and has no locale surprise potential.
**Fix:** `return aDate < bDate ? -1 : aDate > bDate ? 1 : 0;` for consistency with the rest of the phase's sorting code.

### IN-06: Comment in `blob-upload/route.ts` describes a caller that, given the current setup, can never reach this handler

**File:** `app/api/community/blob-upload/route.ts:24-31`
**Issue:** The comment states this route "serves TWO callers: the cookie-authenticated browser... and Vercel's own unauthenticated signed upload-completed callback," and that this is why `requireAuth` lives inside `onBeforeGenerateToken` rather than as the first statement. Tracing `node_modules/@vercel/blob/dist/client.js`'s `handleUpload`: the `"blob.upload-completed"` event branch only invokes the (here, intentionally omitted) `onUploadCompleted` callback — it never calls `onBeforeGenerateToken`. Further, since `onUploadCompleted` is omitted and `onBeforeGenerateToken`'s returned payload never sets `callbackUrl`, no `callbackUrl` is ever registered on the issued client token, so Vercel has nothing to call back to — the `"blob.upload-completed"` event type will never be POSTed to this route at all in this configuration. The code's actual behavior is correct (there genuinely is only one caller here today), but the stated rationale doesn't match the SDK's behavior, which could mislead a future maintainer who "fixes" the auth placement based on the comment rather than re-deriving it.
**Fix:** Update the comment to state plainly that `onUploadCompleted` is intentionally omitted, so `onBeforeGenerateToken` only ever runs for the cookie-authenticated `"blob.generate-client-token"` request — remove the claim about a second unauthenticated caller, or replace it with a note that the placement is future-proofing against later adding `onUploadCompleted` + a `callbackUrl`.

---

_Reviewed: 2026-09-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
