# API Coverage — `@vercel/blob` (v2.4.1)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Produced at plan time for Phase 2 (`api-coverage` detector fired: `detected: true`).
> Capability surface enumerated from `node_modules/@vercel/blob/dist/index.d.ts` and
> `node_modules/@vercel/blob/dist/client.d.ts` (verified 2026-09-10), not from memory.

## Server entrypoint — `@vercel/blob`

| capability | decision | reason |
|---|---|---|
| `put` (JSON metadata documents) | INTEGRATE | `documents-store.ts` / `presupuestos-store.ts` write `community-documents.json` and `community-presupuestos.json` with `access: "private"`, `addRandomSuffix: false`, `allowOverwrite: true` (Plan 02-01 T1, Plan 02-03 T1). |
| `get` (private read, `useCache: false`) | INTEGRATE | Used twice: reading the metadata JSON in both stores, and streaming a stored file in the `documents/[id]/file` proxy (Plan 02-01 T1/T2). |
| `head` | OPT-OUT | The proxy needs the byte stream, not just metadata, and `size_bytes` / `content_type` are already recorded on the `Document` at create time. A HEAD round-trip would add a network hop and a second, drift-prone source of truth for facts we already store. |
| `list` | OPT-OUT | The `community-documents.json` metadata document IS the index of record. Listing the blob pathspace would create the dual-source-of-truth the codebase already flags as an anti-pattern (`.planning/codebase/ARCHITECTURE.md` §Anti-Patterns) and would surface orphaned blobs as if they were documents. |
| `del` | OPT-OUT | D-06 no-hard-delete: archiving keeps both the record **and** the blob object. There is deliberately no deletion or garbage-collection path in v1 (CONTEXT §Deferred). Calling it anywhere in this phase is a prohibition (`must_haves.prohibitions`, Plan 02-01). |
| `copy` | OPT-OUT | Nothing in this phase duplicates or moves a blob. An uploaded file is immutable once stored; only its `Document` metadata is editable. |
| `createFolder` | OPT-OUT | `community-documents/` is a pathname prefix, not a real folder object. A folder marker blob would have no consumer and would show up in any future `list`. |
| `createMultipartUpload` / `uploadPart` / `completeMultipartUpload` / `createMultipartUploader` | OPT-OUT | The D-08 cap is ~15 MB, well below the size where multipart pays for its complexity. Single-request client `upload()` already clears the 4.5 MB Route Handler ceiling, which is the only reason multipart was on the table. Revisit only if the cap is raised past ~100 MB. |

## Client entrypoint — `@vercel/blob/client`

| capability | decision | reason |
|---|---|---|
| `upload` (browser → Blob direct) | INTEGRATE | The core of Slice 1. `access: "private"`, `handleUploadUrl: "/api/community/blob-upload"`, `onUploadProgress` for per-file progress (Plan 02-01 T1). |
| `handleUpload` (token broker) | INTEGRATE | `app/api/community/blob-upload/route.ts`. Auth lives inside `onBeforeGenerateToken`; the same helper verifies Vercel's signed upload-completed callback (Plan 02-01 T1). |
| `onBeforeGenerateToken` → `allowedContentTypes`, `maximumSizeInBytes`, `addRandomSuffix`, `allowOverwrite` | INTEGRATE | These four are the server-side enforcement of D-07 and D-08; Vercel Blob rejects the upload before bytes land. |
| `onUploadCompleted` | OPT-OUT | It never fires against `localhost` (RESEARCH Pitfall 3), so a record written there would exist in production and not in dev. The browser does the metadata POST itself, keeping the `Document` write in exactly one place. |
| `uploadPresigned` / `handleUploadPresigned` | OPT-OUT | Solves the same problem as `handleUpload` with more surface, and moves the auth decision out of `onBeforeGenerateToken` — the one place this phase's threat model puts it (T-02-05). |
| client `put` | OPT-OUT | Requires shipping a read-write token to the browser. `upload()` + the broker is the safe equivalent. |
| `getPayloadFromClientToken` | OPT-OUT | No `clientPayload` is sent — the optional `linked_loop_id` travels on the metadata POST instead, where it is validated against the loop store. Nothing to decode. |
| `generateClientTokenFromReadWriteToken` | OPT-OUT | Hand-minting the token would bypass `handleUpload`'s webhook verification and duplicate its token logic. |
| `BlobFileTooLargeError`, `BlobContentTypeNotAllowedError`, `BlobAccessError` | INTEGRATE | `DocumentUpload.tsx` maps these to per-file Spanish messages so a rejected file says *why* it was rejected (D-03 per-file feedback). |

## Notes

- **Zero new npm packages.** `@vercel/blob@2.4.1` is already a dependency; RESEARCH §"Package Legitimacy Audit" records the `OK` verdict with no `[ASSUMED]` / `[SUS]` / `[SLOP]` entries, so no legitimacy checkpoint applies to this phase.
- **The public access mode is never used anywhere in this phase.** Every `put` / `get` / `upload` call passes the private access mode (`.claude/CLAUDE.md` persistence constraint; ROADMAP §"Sequencing Notes & Risks").
- Opt-outs are per-phase decisions, not permanent bans. `del` in particular is gated by a product decision (D-06), not a technical one.
