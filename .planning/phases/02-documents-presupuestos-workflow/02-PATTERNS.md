# Phase 2: Documents & Presupuestos Workflow - Pattern Map

**Mapped:** 2026-09-10
**Files analyzed:** 26 (23 new, 3 modified)
**Analogs found:** 24 / 26 (2 have no direct in-repo analog — `blob-upload` token broker, drag/drop upload UI)

All analog paths are absolute-relative to repo root
`/Users/nicolalombardi1/Documents/Repositorio_Git/Personal_brand/Personal_brand/`.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/community/documents-store.ts` | store | file-I/O (JSON doc) | `lib/community/open-loops-store.ts` | exact |
| `lib/community/presupuestos-store.ts` | store | file-I/O (JSON doc) | `lib/community/open-loops-store.ts` | exact |
| `lib/community/document-defaults.ts` | utility/config | transform (validate + patch) | `lib/community/loop-defaults.ts` | exact |
| `lib/community/presupuesto-defaults.ts` | utility/config | transform | `lib/community/loop-defaults.ts` | exact |
| `lib/community/presupuesto-compare.ts` | utility (pure) | transform | `lib/community/urgency.ts` | exact |
| `lib/community/presupuesto-compare.test.ts` | test | — | `lib/community/urgency.test.ts` | exact |
| `app/api/community/blob-upload/route.ts` | route (token broker) | request-response | `app/api/cv/versions/route.ts` (partial) + RESEARCH Pattern 2 | role-match / NEW shape |
| `app/api/community/documents/route.ts` | route | CRUD (GET+POST) | `app/api/community/open-loops/route.ts` | exact |
| `app/api/community/documents/[id]/route.ts` | route | CRUD (PATCH) | `app/api/community/open-loops/[id]/route.ts` | exact |
| `app/api/community/documents/[id]/file/route.ts` | route | streaming / file-I/O | `app/api/cv/versions/[id]/pdf/route.ts` | role-match (4 deltas) |
| `app/api/community/presupuestos/route.ts` | route | CRUD (GET+POST) | `app/api/community/open-loops/route.ts` | exact |
| `app/api/community/presupuestos/[id]/route.ts` | route | CRUD (PATCH) | `app/api/community/open-loops/[id]/route.ts` | exact |
| `app/community-president/documentos/page.tsx` | page (Server Component) | request-response | `app/community-president/page.tsx` | exact |
| `app/components/community/DocumentUpload.tsx` | component (client) | event-driven (upload) | `app/components/community/Cockpit.tsx` (mutate+refresh) | role-match |
| `app/components/community/DocumentList.tsx` | component (client) | CRUD list | `app/components/community/Cockpit.tsx` / `LoopColumn.tsx` | role-match |
| `app/components/community/DocumentRow.tsx` | component (client) | CRUD row | `app/components/community/LoopCard.tsx` | role-match |
| `app/components/community/LoopDetailPanel.tsx` | component (client) | request-response (read + nested create) | `app/components/community/LoopSlideOver.tsx` | role-match (motion wrapper only) |
| `app/components/community/AttachDocumentControl.tsx` | component (client) | event-driven (PATCH array) | `app/components/community/QuickActions.tsx` / `Cockpit` patch fn | role-match |
| `app/components/community/PresupuestoForm.tsx` | component (client) | CRUD create | `app/components/community/LoopSlideOver.tsx` (form-state machine) | role-match |
| `app/components/community/PresupuestoComparison.tsx` | component (client) | transform + render | `app/components/community/CountStrip.tsx` (pure-fn consumer) + `urgency` consumer pattern | partial |
| `lib/types.ts` (modify) | model | — | existing `// ── Smart Community President ──` banner block (lines 232-306) | exact |
| `app/components/community/CommunitySidebar.tsx` (modify) | component | — | its own `NAV_ITEMS` (line 16-18) | exact |
| `app/components/community/LoopCard.tsx` (modify, optional) | component | — | its own owner-chip block (the `<span>` chip, ~line 100) | exact |
| `data/community-documents.json` (new seed) | config | — | `data/community-open-loops.json` (seed `[]`) | exact |
| `data/community-presupuestos.json` (new seed) | config | — | `data/community-open-loops.json` | exact |
| `app/api/cv/export/route.ts` (modify, OPTIONAL/defer) | route | — | its own `Promise.all` block (lines 22-27) | exact |

---

## Pattern Assignments

### `lib/community/documents-store.ts` + `lib/community/presupuestos-store.ts` (store, file-I/O)

**Analog:** `lib/community/open-loops-store.ts` (whole file, 44 lines) — copy verbatim, change only the type import and the two path constants.

**Full pattern to copy** (`open-loops-store.ts:1-43`):
```typescript
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { get, put } from "@vercel/blob";
import type { OpenLoop } from "@/lib/types";

const BLOB_PATHNAME = "community-open-loops.json";
const LOCAL_PATH = join(process.cwd(), "data/community-open-loops.json");

export async function getOpenLoops(): Promise<OpenLoop[]> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      // useCache: false bypasses Vercel's CDN cache layer — needed because
      // the pathname is stable (addRandomSuffix: false)...
      const result = await get(BLOB_PATHNAME, { access: "private", useCache: false });
      if (result) {
        const text = await new Response(result.stream).text();
        return JSON.parse(text) as OpenLoop[];
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

export async function saveOpenLoops(loops: OpenLoop[]): Promise<void> {
  const json = JSON.stringify(loops, null, 2);
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

**Adaptations:**
- `documents-store.ts`: `import type { Document }`; `BLOB_PATHNAME = "community-documents.json"`; `LOCAL_PATH = ".../data/community-documents.json"`; export `getDocuments` / `saveDocuments`.
- `presupuestos-store.ts`: `import type { Presupuesto }`; `"community-presupuestos.json"`; export `getPresupuestos` / `savePresupuestos`.
- Keep the `access: "private"`, `addRandomSuffix: false`, `allowOverwrite: true`, `useCache: false` flags exactly — CLAUDE.md forbids `access: "public"`.
- **This JSON holds metadata only.** The uploaded file bytes live at `community-documents/{uuid}.{ext}`, written by the client `upload()` call, never by `saveDocuments`.

**Pitfall applies:** never `import` the seed JSON statically in a page/route — always call the getter (RESEARCH anti-pattern; `page.tsx:6-8` comment).

---

### `lib/community/document-defaults.ts` (utility/config, transform)

**Analog:** `lib/community/loop-defaults.ts` (whole file, 223 lines).

**Enum single-source pattern** (`loop-defaults.ts:14-48`):
```typescript
export const KIND_LABELS: Record<OpenLoopKind, string> = {
  commitment: "Compromiso",
  incidencia: "Incidencia",
  obra: "Obra",
  follow_up: "Seguimiento",
  permiso: "Permiso",
};
// ...
const KINDS = new Set(Object.keys(KIND_LABELS));
const STATUSES = new Set(Object.keys(STATUS_LABELS));
```

**Frozen PATCH allow-list + `applyPatch`** (`loop-defaults.ts:134-190`):
```typescript
export const PATCHABLE_KEYS = Object.freeze([
  "title", "kind", "status", "owner", "owner_detail", "next_action", "due",
] as const);

export function applyPatch(existing: OpenLoop, patch: Record<string, unknown>): OpenLoop {
  const next: OpenLoop = { ...existing };
  for (const key of PATCHABLE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    const value = patch[key];
    switch (key) {
      case "title":
      case "next_action":
        if (typeof value === "string") next[key] = value.trim();
        break;
      // ... one case per key, value never spread
    }
  }
  next.updated_at = new Date().toISOString();
  return next;
}
```

**Validator shape** (`loop-defaults.ts:70-124`): `validateLoopInput(body, { create })` → Spanish string | null; `isPlainObject` guard first; per-field length caps (`TITLE_MAX` etc.); enum checks via `KINDS.has(String(body.kind))`.

**`applyCreateDefaults`** (`loop-defaults.ts:199-222`): picks validated fields BY NAME (never spreads body), fills defaults (`status ?? "open"`).

**Adaptations for `document-defaults.ts`:**
- `DOCUMENT_TYPE_LABELS: Record<DocumentType, string>` = `{ acta: "Acta", contrato: "Contrato", presupuesto: "Presupuesto", carta: "Carta", sin_clasificar: "Sin clasificar" }`. Derive `Set` + `<select>` from `Object.keys()`.
- `PATCHABLE_DOCUMENT_KEYS = Object.freeze(["title", "type", "doc_date", "linked_loop_ids", "status"] as const)`. `id`, `blob_pathname`, `file_kind`, `content_type`, `size_bytes`, `original_name`, `uploaded_at` are server-owned → absent from the list (structurally unreachable, per the `loop-defaults.ts:126-133` comment).
- `applyDocumentPatch`: `linked_loop_ids` case replaces the array wholesale — `Array.isArray(value) && value.every(v => typeof v === "string")`; `status` case accepts only `"active" | "archived"`.
- `validateDocumentInput`: `linked_loop_ids` must be `string[]`, length ≤ 50 (RESEARCH says ≤ 50; ASVS table also ≤ 50), each trimmed non-empty.
- File-type allow-list constants (`MAX_FILE_BYTES = 15 * 1024 * 1024`, `FILE_TYPES` map ext↔MIME↔kind, `ALLOWED_MIME` array, `SERVE_CONTENT_TYPE` per-kind) — see RESEARCH "File-type allow-list" code block. **No `svg`, no office docs.** HEIC MIME list must include `""` (browsers send empty MIME for `.heic`).
- `applyDocumentCreateDefaults`: `type: "sin_clasificar"`, `status: "active"`, `title: original_name`, `linked_loop_ids: loopId ? [loopId] : []`.

**Pitfalls applied:** enum SoT (RESEARCH Pitfall 7 / "Don't Hand-Roll"); frozen own-property overlay, never `{...existing, ...body}`; `__proto__`/`id`/`blob_pathname` in body ignored (test asserts this).

---

### `lib/community/presupuesto-defaults.ts` (utility/config, transform)

**Analog:** `lib/community/loop-defaults.ts` (same three sub-patterns as above).

**Adaptations:**
- `DEFAULT_IVA_PCT = 21`.
- `computeTotalCents(baseCents: number, ivaPct: number): number { return Math.round(baseCents * (1 + ivaPct / 100)); }` — integer cents, one `Math.round` (RESEARCH Pattern 5; "Don't Hand-Roll" money row).
- `PATCHABLE_PRESUPUESTO_KEYS = Object.freeze(["provider", "base_imponible_cents", "iva_pct", "scope", "received_at", "valid_until", "document_id", "status"] as const)`. **`total_cents` is NOT patchable** — always server-recomputed when base or IVA changes (ASVS mass-assignment row).
- `applyPresupuestoPatch`: after overlaying allowed keys, if `base_imponible_cents` or `iva_pct` touched → recompute `next.total_cents = computeTotalCents(next.base_imponible_cents, next.iva_pct)`.
- `validatePresupuestoInput`: `provider` required non-empty (create); `base_imponible_cents` integer, `0 < base ≤ 100_000_000`; `iva_pct` number `0 ≤ iva ≤ 100`; `received_at`/`valid_until` optional `YMD` (reuse the `/^\d{4}-\d{2}-\d{2}$/` regex from `loop-defaults.ts:53`); `document_id` optional string.
- `applyPresupuestoCreateDefaults`: `iva_pct ?? 21`, `status: "active"`, compute `total_cents`, require `loop_id`.

---

### `lib/community/presupuesto-compare.ts` (pure utility, transform)

**Analog:** `lib/community/urgency.ts` (102 lines) — pure isomorphic module.

**Import-discipline header to copy** (`urgency.ts:1-7`):
```typescript
// PURE, isomorphic module. The ONLY imports allowed here are ... and the
// Presupuesto type — no next/*, no fs, no React. The same function runs in the
// Server Component for first paint and in the client island after a mutation.
```

**Bucketing + stable-sort idiom** (`urgency.ts:17-30, 70-73`):
```typescript
const HIDDEN_STATUSES = new Set<OpenLoop["status"]>(["done", "dropped"]);
// V8's Array.sort is stable (Node 12+), so equal keys keep input order.
const byDueAsc = (a, b) => (a.due ?? "").localeCompare(b.due ?? "");
overdue.sort(byDueAsc);
```

**Adaptations (RESEARCH Pattern 6):**
```typescript
export type PresupuestoSortKey = "total" | "received_at";
export interface ComparisonRow { id: string; total_cents: number; delta_cents: number; }
export interface ComparisonResult { cheapestId: string | null; order: ComparisonRow[]; }
export function comparePresupuestos(list: Presupuesto[], sortKey: PresupuestoSortKey = "total"): ComparisonResult
```
- Filter `status === "archived"` (mirrors `HIDDEN_STATUSES` filter).
- `cheapestId` = id of min `total_cents`; ties → first in input order gets it, `delta_cents = 0` for co-cheapest.
- `delta_cents = total_cents - min`.
- Stable sort by `total_cents` asc, or by `received_at` (`(a.received_at ?? "").localeCompare(...)`, nulls last).
- Empty list → `{ cheapestId: null, order: [] }`.
- `cheapestId` is invariant under `sortKey` (highlight is a reading aid — D-19).

---

### `lib/community/presupuesto-compare.test.ts` (test)

**Analog:** `lib/community/urgency.test.ts` (261 lines).

**Header block to copy VERBATIM** (`urgency.test.ts:1-8`):
```typescript
// Local-only Node built-in test (node:test). This repo has NO test runner and no
// CI — run manually with `node --test lib/community/urgency.test.ts`. ...
// Type-only imports MUST use the `import type` form so stripping can erase them.
import test from "node:test";
import assert from "node:assert/strict";
import { comparePresupuestos } from "./presupuesto-compare.ts";   // .ts specifier — allowImportingTsExtensions
import type { Presupuesto } from "../types.ts";                    // import type — erased by type-stripping
```

**Factory + fixed-clock idiom** (`urgency.test.ts:26-41`): `let seq = 0; function makePresupuesto(overrides: Partial<Presupuesto> = {}): Presupuesto { seq += 1; return { id: \`p-${seq}\`, ... , ...overrides }; }`

**Assertions to write** (RESEARCH "Testing Approach" table): cheapest = min `total_cents`; deltas incl. ties (delta 0 for co-cheapest); archived excluded; stable sort by `total` and `received_at`; empty → `{ cheapestId: null, order: [] }`; single presupuesto → delta 0 + is cheapest. Also cover `computeTotalCents(123456, 21) === 149382`, half-up rounding, `iva_pct: 0` → total == base (put those in a `presupuesto-defaults.test.ts` or the same file).

**Pitfall applied:** RESEARCH Pitfall 7 — `allowImportingTsExtensions: true` is already in `tsconfig.json`; the `.ts` import specifier + `import type` are mandatory for `node --test` type-stripping.

---

### `app/api/community/documents/route.ts` + `app/api/community/presupuestos/route.ts` (route, CRUD GET+POST)

**Analog:** `app/api/community/open-loops/route.ts` (55 lines) — copy structure exactly.

**Full pattern** (`open-loops/route.ts:10-55`):
```typescript
export async function GET(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;
  return NextResponse.json(await getOpenLoops());
}

export async function POST(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const invalid = validateLoopInput(body, { create: true });
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  try {
    const now = new Date().toISOString();
    const loop: OpenLoop = {
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      ...applyCreateDefaults(body as Record<string, unknown>),
    };
    const loops = await getOpenLoops();
    loops.push(loop);
    await saveOpenLoops(loops);
    return NextResponse.json(loop, { status: 201 });
  } catch (err) {
    // Never log the request body — loop text can contain neighbour names (ASVS V7).
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to save loop: ${msg}` }, { status: 500 });
  }
}
```

**Adaptations — `documents/route.ts`:**
- POST body is blob metadata: `{ blob_pathname, content_type, original_name, size, linked_loop_id? }` (from the browser after `upload()` succeeds — RESEARCH Pattern 2 `DocumentUpload.tsx` block).
- Validate `blob_pathname` starts with `community-documents/` and matches the UUID pattern (never trust it blindly — it becomes the proxy lookup key); validate `content_type ∈ ALLOWED_MIME` and `size ≤ MAX_FILE_BYTES` server-side (D-08, ASVS V5 — third enforcement point).
- Derive `file_kind` from the validated MIME via `FILE_TYPES`, not from the client.
- Build the `Document` record with `applyDocumentCreateDefaults`.
- OPTIONAL local-dev `multipart/form-data` branch (only when `BLOB_READ_WRITE_TOKEN` unset) — see RESEARCH "Environment Availability" option (b); plan should pick option (a) instead (pull a dev token) to keep dev==prod.

**Adaptations — `presupuestos/route.ts`:**
- GET supports `?loop_id=` filter: `(await getPresupuestos()).filter(p => p.loop_id === loopId)`. GET handlers are dynamic by default in Next 16 — no `export const dynamic` (RESEARCH "State of the Art").
- POST body: the D-16 field set; server computes `total_cents`.

**Pitfalls applied:** `requireAuth` as the literal first statement (require-auth.ts doc); "Never log the request body" comment carries over (ASVS V7 — presupuesto `scope`/`provider` can name neighbours); no `DELETE` verb.

---

### `app/api/community/documents/[id]/route.ts` + `app/api/community/presupuestos/[id]/route.ts` (route, PATCH)

**Analog:** `app/api/community/open-loops/[id]/route.ts` (59 lines).

**Full pattern** (`open-loops/[id]/route.ts:15-58`):
```typescript
// Only PATCH is exported. Next returns 405 for every other verb automatically,
// and there is deliberately NO removal endpoint: discarding is a status change.
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },   // typed inline — RouteContext global not available for new paths
) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const { id } = await ctx.params;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const invalid = validateLoopInput(body, { create: false });
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  try {
    const loops = await getOpenLoops();
    const index = loops.findIndex((loop) => loop.id === id);
    if (index === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = applyPatch(loops[index], body as Record<string, unknown>);
    loops[index] = updated;
    await saveOpenLoops(loops);
    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to save loop: ${msg}` }, { status: 500 });
  }
}
```

**Adaptations:**
- `documents/[id]`: use `validateDocumentInput(body, { create: false })` + `applyDocumentPatch`. Same PATCH handles archive (`{ status: "archived" }`), inline type/title/date edit, AND attach/detach (`{ linked_loop_ids: [...] }` — full new array, RESEARCH Pattern 4). Detach-from-loop and unassign-from-document are the same call with the id removed.
- `presupuestos/[id]`: `validatePresupuestoInput` + `applyPresupuestoPatch` (which recomputes `total_cents`). Archive = `{ status: "archived" }`.
- Keep `await ctx.params` (Next 15+ — params is a Promise; RESEARCH "State of the Art").
- Keep "no removal endpoint" comment — soft-delete only (D-06, no-hard-delete pitfall).

---

### `app/api/community/documents/[id]/file/route.ts` (route, streaming proxy)

**Analog:** `app/api/cv/versions/[id]/pdf/route.ts` (32 lines) — copy, apply 4 deltas.

**Analog current shape** (`cv/versions/[id]/pdf/route.ts:7-31`):
```typescript
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const result = await get(`cvs/${id}.pdf`, { access: "private", useCache: false });
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cv-${id}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
```

**The 4 deltas (RESEARCH Pattern 3, D-09):**
1. **Auth:** use `requireAuth(request)` (strong 3-part check), not the cookie-truthy `if (!authCookie?.value)` — the CV route has the weak check; the community route must be strong (CLAUDE.md auth constraint, require-auth.ts).
2. **Lookup + archived 404:** `const doc = (await getDocuments()).find(d => d.id === id); if (!doc || doc.status === "archived") return 404;` — then `get(doc.blob_pathname, { access: "private", useCache: false })`. Never fetch a user-supplied path (SSRF mitigation — id → server-stored pathname).
3. **Content-Type from a fixed map, not hard-coded / not sniffed:** `SERVE_CONTENT_TYPE` keyed by the document's validated `file_kind`/MIME (from `document-defaults.ts`), never `result.blob.contentType`.
4. **`Content-Disposition: inline`** (not `attachment`), with a sanitized filename: strip `"` `\r` `\n` + control chars from `doc.title`; if empty/non-ASCII, omit the `filename=` param.
   Plus add `"X-Content-Type-Options": "nosniff"` and `"Content-Security-Policy": "default-src 'none'; sandbox"` (RESEARCH Pitfall 5 — inline-served upload XSS).
- Keep streaming: `new NextResponse(result.stream, ...)` — never buffer a 15 MB file.
- Check `result.statusCode === 200` (@vercel/blob 2.x returns a discriminated union — RESEARCH "State of the Art").

---

### `app/community-president/documentos/page.tsx` (page, Server Component)

**Analog:** `app/community-president/page.tsx` (21 lines).

**Full pattern** (`page.tsx:1-21`):
```typescript
import Cockpit from "@/app/components/community/Cockpit";
import { getOpenLoops } from "@/lib/community/open-loops-store";
import { groupLoopsByUrgency } from "@/lib/community/urgency";

// Server Component: reads the store directly at request time (the layout already
// gates the segment, so no AuthGuard here). Never static-import the seed JSON.
// No client fetch, so there is no skeleton and no loading state on first paint.
export default async function CommunityPresidentPage() {
  const loops = await getOpenLoops();
  const grouped = groupLoopsByUrgency(loops);
  return (
    <div className="px-6 py-8 lg:px-8">
      <Cockpit loops={loops} grouped={grouped} />
    </div>
  );
}
```

**Adaptations:**
- `const documents = (await getDocuments()).filter(d => d.status !== "archived");` then sort date-desc (by `uploaded_at`). Pass to a `<DocumentList documents={documents} loops={loops} />` client island (needs `loops` for the attach picker — resolve loop titles server-side into a lightweight `{id, title}[]` to avoid shipping full loops).
- Same wrapper div classes (`px-6 py-8 lg:px-8`); layout (`app/community-president/layout.tsx:14-25`) already does the 3-part fail-closed auth guard — no `AuthGuard` in the page.
- Keep the "never static-import the seed JSON" discipline.

---

### `app/components/community/DocumentUpload.tsx` (component, client — event-driven)

**Analog:** the mutate-via-Route-Handler + `router.refresh()` pattern in `app/components/community/Cockpit.tsx:55-75`:
```typescript
const res = await fetch("/api/community/open-loops", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
if (!res.ok) { setSaveError(SAVE_ERROR); return; }
router.refresh();
```
Plus `"use client"` + `useRouter` from `next/navigation` (`Cockpit.tsx:1-4`), `lucide-react` icons, Spanish error copy as a module const.

**NEW to the repo — the client `upload()` call** (no in-repo analog; use RESEARCH Pattern 2 `DocumentUpload.tsx` block verbatim as the reference):
```tsx
import { upload } from "@vercel/blob/client";

async function uploadOne(file: File): Promise<Document> {
  const ext = canonicalExt(file);                         // from FILE_TYPES allow-list, NOT file.name
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
      blob_pathname: blob.pathname, content_type: blob.contentType,
      original_name: file.name, size: file.size, linked_loop_id: loopId ?? null,
    }),
  });
  if (!res.ok) throw new Error("metadata");
  return res.json();
}
// caller: for (const f of files) { try { ok.push(await uploadOne(f)) } catch { failed.push(f) } }
```

**Adaptations:**
- Client-side validate BEFORE `upload()`: ext ∈ allow-list, MIME ∈ allow-list (allow `""` for HEIC), size ≤ 15 MB (D-07, D-08).
- Per-file isolated failure with per-file feedback (D-03) — the `for...of` + try/catch loop; render a per-file status list.
- `<input type="file" multiple>` + optional drag/drop zone (discretion).
- On completion: `router.refresh()` once, close.
- Reused from a loop (`loopId` prop set → auto-attach, D-05) and from the Documentos section (`loopId` undefined).

**Pitfall applied:** RESEARCH Pitfall 1 (don't build this as a server `formData()` route — 4.5 MB wall); Pitfall 3 (`onUploadCompleted` never fires on localhost — the browser does the metadata POST itself, which this pattern already does).

---

### `app/components/community/DocumentList.tsx` / `DocumentRow.tsx` (component, client — CRUD list/row)

**Analog:** `app/components/community/Cockpit.tsx` (list owner + per-item pending state, lines 27-36, 115-127) and `app/components/community/LoopCard.tsx` (row: title + chips + inline actions, whole file).

**Per-item isolated pending state** (`Cockpit.tsx:34-36, 115-127`):
```typescript
const [quickState, setQuickState] = useState<QuickState>({});  // keyed by loop id
function quickStart(loopId, key) { setQuickState(m => ({ ...m, [loopId]: { pendingAction: key, error: false } })); }
function quickSettle(loopId, ok) { setQuickState(m => ({ ...m, [loopId]: { pendingAction: null, error: !ok } })); }
```

**Row layout / chip idiom** (`LoopCard.tsx` owner-chip `<span>`, ~line 100):
```tsx
<span className="inline-flex items-center border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
  {ownerLabel}
</span>
```

**Adaptations:**
- `DocumentRow`: title (React children only — free text), a type chip (Spanish label from `DOCUMENT_TYPE_LABELS`), `doc_date`/`uploaded_at` via `date-fns` `format`, a "Ver" link `<a target="_blank" href={\`/api/community/documents/${doc.id}/file\`}>` (D-09), inline type `<select>` (options from `Object.entries(DOCUMENT_TYPE_LABELS)` — mirrors `LoopSlideOver.tsx:78-83` `KIND_ENTRIES`), archive button, linked-loops summary + `AttachDocumentControl`.
- Each edit = a `PATCH /api/community/documents/{id}` then `router.refresh()`.
- Keep the `neutral-*` palette (this surface's system — DESIGN.md / UI-SPEC), `rounded-lg border border-neutral-200 bg-white p-4` card shell from `LoopCard`.
- Empty state (discretion) — Spanish copy, mirror `EmptyState.tsx`.

---

### `app/components/community/LoopDetailPanel.tsx` (component, client — read + nested create)

**Analog:** `app/components/community/LoopSlideOver.tsx` — **share ONLY the framer-motion wrapper** (RESEARCH A4 — do NOT widen `LoopSlideOver` with a `mode` prop; it's a tight form-state machine).

**Motion wrapper to copy** (`LoopSlideOver.tsx:99, 229-251`):
```tsx
const reduce = useReducedMotion();
// ...
<AnimatePresence>
  {open && (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-[rgba(10,10,10,0.2)]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.15 }}
        onClick={onClose}
      />
      <motion.div
        ref={panelRef} role="dialog" aria-modal="true" aria-label={panelTitle}
        className="fixed right-0 top-0 z-50 flex h-full w-[calc(100vw-32px)] flex-col border-l border-neutral-200 bg-white shadow-xl md:w-[420px]"
        initial={{ x: reduce ? 0 : "100%" }} animate={{ x: 0 }} exit={{ x: reduce ? 0 : "100%" }}
        transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
      >
```

**Also copy** the focus-trap + Escape effect (`LoopSlideOver.tsx:127-165`) and the `min-h-0 flex-1 overflow-y-auto` body idiom (`LoopSlideOver.tsx:266-272`).

**Adaptations:**
- **Widen for detail mode:** change `md:w-[420px]` → e.g. `md:w-[720px] lg:w-[880px]` (exact width from `/gsd-ui-phase 2`).
- Read-oriented: renders the loop's resolved documents (`documents.filter(d => d.status !== "archived" && d.linked_loop_ids.includes(loop.id))` — computed in the Server Component, passed as prop) and, when `loop.kind === "obra"` (D-10), the presupuestos + `<PresupuestoComparison>`.
- Nested create forms (`PresupuestoForm`, `AttachDocumentControl`) live as SEPARATE `<form>` elements / sibling components — **never nest a `<form>` inside another `<form>`** (RESEARCH anti-pattern — the Phase 1 `LoopCard` `<button>`-nesting rework is the cautionary tale).
- Panel body: `min-h-0` in the flex column, `overflow-y-auto` (Phase 1 learned `min-h-0` the hard way — RESEARCH Pitfall 6).

---

### `app/components/community/AttachDocumentControl.tsx` (component, client — PATCH full array)

**Analog:** `app/components/community/Cockpit.tsx:77-102` (`patchEditingLoop` — PATCH then `router.refresh()`), and `QuickActions` for the small-action UI shell.

**Adaptations (RESEARCH Pattern 4):**
- Two surfaces: (a) from a loop — pick from library or upload-new (auto-attach); (b) from a document — assign/unassign loops. Both send the **complete new `linked_loop_ids` array**.
- `attach`: `PATCH /api/community/documents/{docId}` with `{ linked_loop_ids: [...doc.linked_loop_ids, loopId] }`. `detach`: same with the id filtered out.
- Client does the read-modify-write on the array; the server re-reads the store inside the handler before writing (single-writer assumption, accepted for v1).
- Picker shows all non-archived documents, `presupuesto`-typed sorted first (RESEARCH Open Question 2 — do NOT auto-mutate the document's `type`).
- `router.refresh()` after success.

---

### `app/components/community/PresupuestoForm.tsx` (component, client — CRUD create)

**Analog:** `app/components/community/LoopSlideOver.tsx` — the `FormState` + `set<K>` + controlled-input pattern (lines 45-63, 106-124, 273-389).

**Idioms to copy:**
- `const [form, setForm] = useState<FormState>(EMPTY_FORM); function set<K extends keyof FormState>(key, value) { setForm(f => ({ ...f, [key]: value })); }` (`LoopSlideOver.tsx:106, 122-124`).
- Shared field classes (`LoopSlideOver.tsx:85-87`): `fieldClass`, `labelClass`.
- `<label className="flex flex-col gap-1"><span className={labelClass}>…</span><input className={fieldClass} …/></label>` blocks.
- Inline field-error state + Spanish messages (`LoopSlideOver.tsx:107, 186-191, 391-400`).
- `date-fns` `format` for date presets (`LoopSlideOver.tsx:212-217`).

**Adaptations:**
- Fields (D-16): `provider` (text, required), `base_imponible` (euros text input — keep raw string in state, convert to cents on submit — RESEARCH Pattern 5), `iva_pct` (default `21`), `scope` (`<textarea>` multi-line, `resize-none` like `LoopSlideOver.tsx:303-309`), `received_at`/`valid_until` (`<input type="date">`, optional), `document_id` (optional `<select>` of `presupuesto`-typed documents).
- Do NOT capture `total` — server computes it. Optionally show a live computed preview (`computeTotalCents` is a pure import — safe in a client component).
- Submit → `POST /api/community/presupuestos` with `{ loop_id, ... }` → `router.refresh()`.
- Render as its own `<form>`, sibling to any other form in the detail panel (never nested).

---

### `app/components/community/PresupuestoComparison.tsx` (component, client — transform + render)

**Analog:** `app/components/community/CountStrip.tsx` (a component that consumes a pure module's output) + the `urgency` consumer pattern in `Cockpit.tsx`/`page.tsx`. No exact structural analog for the table itself.

**Adaptations (D-18, D-19):**
- `const [sortKey, setSortKey] = useState<PresupuestoSortKey>("total");` → `const { cheapestId, order } = comparePresupuestos(list, sortKey);` (pure import — re-runs on sort change; `cheapestId` invariant).
- Attributes × quotes table: rows = provider, base imponible, IVA %, total, scope, received_at, valid_until, document; columns = one per presupuesto.
- **Wrap the table in `<div className="overflow-x-auto">`** — the table scrolls inside its own container, never the page body (D-18, Phase 1 mobile rule, RESEARCH Pitfall 6). The detail panel stays `overflow-y-auto`.
- Highlight the `cheapestId` column; show `+{formatEuros(delta_cents)} €` on the others (delta from `order`).
- Sort control: two buttons/`<select>` (total | received_at) — chip style from `LoopSlideOver.tsx:361-374`.
- Money display: format cents → euros at render only (`(cents / 100).toLocaleString("es-ES", { minimumFractionDigits: 2 })`).
- Free text (`provider`, `scope`) as React children only — never `dangerouslySetInnerHTML` (ASVS V1).
- Empty state (discretion) — Spanish.

---

### `lib/types.ts` (modify — model)

**Analog:** the existing `// ── Smart Community President ──` block (lines 232-306) — same file, same banner. Append below the `Submission` interface.

**Existing style to match** (`lib/types.ts:234-257`): `export type X = "a" | "b" | ...;` unions with a comment explaining locked vocabularies; `export interface` with inline `// default ...` / `// D-NN` field comments.

**Add (RESEARCH "Code Examples" — copy the interface block verbatim):**
```typescript
export type DocumentType = "acta" | "contrato" | "presupuesto" | "carta" | "sin_clasificar";
export type DocumentFileKind = "pdf" | "image";
export type DocumentStatus = "active" | "archived";
export interface Document { id; title; type; status; blob_pathname; file_kind; content_type;
  size_bytes; original_name; linked_loop_ids: string[]; doc_date?: string | null;
  uploaded_at; updated_at; extracted_text?: string; }   // extracted_text DECLARED now, POPULATED never in Phase 2

export type PresupuestoStatus = "active" | "archived";
export interface Presupuesto { id; loop_id; provider; base_imponible_cents: number; iva_pct: number;
  total_cents: number; scope; received_at?: string | null; valid_until?: string | null;
  document_id?: string | null; status; created_at; updated_at; }
```
(full field list + comments in RESEARCH lines 664-709.)

**Pitfall applied:** enum SoT — these unions are the single source; `document-defaults.ts` label Records key off them; `Record<DocumentType, string>` will fail to compile if they drift.

---

### `app/components/community/CommunitySidebar.tsx` (modify — component)

**Analog:** its own `NAV_ITEMS` array (lines 16-18).

**Current** (`CommunitySidebar.tsx:6-18`):
```typescript
import { LayoutDashboard, ChevronLeft, LogOut, Menu, X } from "lucide-react";
const NAV_ITEMS = [
  { label: "Panel", href: "/community-president", icon: LayoutDashboard },
];
```

**Change:** add `FileText` to the `lucide-react` import; add one entry:
```typescript
{ label: "Documentos", href: "/community-president/documentos", icon: FileText },
```
`NavLinks` already does `pathname.startsWith(item.href)` for non-root hrefs (line 30-33) — no other change. Both desktop aside and mobile drawer render from this one array.

---

### `app/components/community/LoopCard.tsx` (modify, OPTIONAL — component)

**Analog:** its own owner-chip `<span>` (the `inline-flex items-center border border-neutral-200 px-2 py-0.5 text-xs` block, ~line 100), inside the `pointer-events-none relative z-10` content layer.

**Change (RESEARCH Open Question 3):** when an attachment `count > 0`, render a small `<span>` chip with a `Paperclip` icon (`lucide-react`) + count, in the same `mt-2 flex flex-wrap items-center gap-2` row as the due pill and owner chip. Count comes from a `Map<loopId, number>` built in `page.tsx` from the documents store and threaded `page → Cockpit → LoopColumn → LoopCard` as a prop. Keep it in the `pointer-events-none` layer (the whole-card button sits behind — LoopCard.tsx:73-83). Cut if it complicates the plan.

---

### `data/community-documents.json` + `data/community-presupuestos.json` (new seeds)

**Analog:** `data/community-open-loops.json` — a committed `[]` seed / dev fallback store.
**Content:** exactly `[]`. Both are the local-mode store AND the offline seed (CLAUDE.md dual-mode). Use the Write tool, not heredoc.

---

### `app/api/cv/export/route.ts` (modify — OPTIONAL, defer unless trivial)

**Analog:** its own `Promise.all` block (lines 22-33) — add `getDocuments()` / `getPresupuestos()` and two keys to the returned JSON, and matching lines in `scripts/sync-context.sh`, so the JSON mirrors back to git. RESEARCH + CONTEXT both say defer unless trivial.

---

## Shared Patterns

### Authentication — strong 3-part fail-closed
**Source:** `lib/community/require-auth.ts:16-26`
**Apply to:** every new `/api/community/*` verb as the **literal first statement** — `documents/route.ts`, `documents/[id]/route.ts`, `documents/[id]/file/route.ts`, `presupuestos/route.ts`, `presupuestos/[id]/route.ts`.
```typescript
export function requireAuth(request: NextRequest): NextResponse | null {
  const token = request.cookies.get("dashboard_auth")?.value;
  if (!token || !process.env.DASHBOARD_TOKEN || token !== process.env.DASHBOARD_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
```
Usage: `const denied = requireAuth(request); if (denied) return denied;`

**THE ONE EXCEPTION:** `app/api/community/blob-upload/route.ts` — auth goes **inside `onBeforeGenerateToken`**, NOT as line 1 (the route is also hit by Vercel's unauthenticated signed upload-completed webhook — RESEARCH Pitfall 2 / Pattern 2). `const denied = requireAuth(request); if (denied) throw new Error("Unauthorized");` inside the callback.

The page layer needs no guard — `app/community-president/layout.tsx:14-25` already does the same 3-part check and `redirect()`s.

### Error handling — API route catch block
**Source:** `app/api/community/open-loops/route.ts:47-53`
**Apply to:** every new community route handler's work block.
```typescript
} catch (err) {
  // Never log the request body — text can contain neighbour names (ASVS V7).
  const msg = err instanceof Error ? err.message : String(err);
  return NextResponse.json({ error: `Failed to save …: ${msg}` }, { status: 500 });
}
```
Bad JSON → `400 { error: "Invalid JSON" }`; validation fail → `400 { error: <spanish string> }`; not found / archived → `404`; unauth → `401`. No `DELETE` verb anywhere (soft-delete only).

### Store read/write — dual-mode, reads never throw
**Source:** `lib/community/open-loops-store.ts` (whole file)
**Apply to:** `documents-store.ts`, `presupuestos-store.ts`. Flags: `access: "private"`, `addRandomSuffix: false`, `allowOverwrite: true`, `useCache: false` on reads. Read path: try Blob → catch (fall through) → try local file → catch → return `[]`. Never throw on read.

### Enum single-source-of-truth
**Source:** `lib/community/loop-defaults.ts:14-48`
**Apply to:** `document-defaults.ts` (`DOCUMENT_TYPE_LABELS`), `presupuesto-defaults.ts`. One Spanish-label `Record<EnumType, string>` per enum; `Set` for validation + `Object.entries()` for `<select>` options both derived from it. The `<select>` idiom is `LoopSlideOver.tsx:78-83` + `:284-298`.

### Frozen PATCH allow-list + own-property overlay
**Source:** `lib/community/loop-defaults.ts:134-190`
**Apply to:** `applyDocumentPatch`, `applyPresupuestoPatch`. `Object.freeze([...] as const)`; loop the frozen keys; `Object.prototype.hasOwnProperty.call(patch, key)` guard; `switch` per key; **never** `{ ...existing, ...patch }`. Server-owned fields (`id`, `blob_pathname`, `file_kind`, `total_cents`, timestamps) are absent from the list → structurally unreachable. Refresh `updated_at` at the end.

### Client mutation — Route Handler + `router.refresh()`
**Source:** `app/components/community/Cockpit.tsx:55-102`
**Apply to:** `DocumentUpload`, `DocumentList`/`DocumentRow`, `AttachDocumentControl`, `PresupuestoForm`, `LoopDetailPanel`.
```typescript
const res = await fetch("/api/community/…", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
if (!res.ok) { setSaveError(SAVE_ERROR); return; }
router.refresh();
```
No `revalidatePath`, no optimistic cache — this app has no `cacheComponents`. Per-item pending/error state keyed by id (`Cockpit.tsx:34-36, 115-127`) so one row's spinner never blocks the list.

### Pure isomorphic module + local `node --test`
**Source:** `lib/community/urgency.ts:1-7` (import discipline) + `lib/community/urgency.test.ts:1-12` (header + `.ts` import + `import type`)
**Apply to:** `presupuesto-compare.ts` (+ `.test.ts`). No `next/*`, no `fs`, no React imports. Test file: copy the header comment verbatim, use `.ts` import specifiers (`allowImportingTsExtensions` is already on), `import type` for type-only imports, `node:test` + `node:assert/strict`, a `seq`-counter factory, fixed clock for determinism.

### Free text renders as React children only
**Source:** `LoopCard.tsx:44-48` comment + `:88` (`{loop.title}`)
**Apply to:** every render of `title`, `original_name`, `provider`, `scope` — ordinary JSX children, **never** `dangerouslySetInnerHTML` (ASVS V1 — values may quote neighbour emails).

### Mobile: wide content scrolls in its own container
**Source:** `LoopSlideOver.tsx:266-272` (`min-h-0 flex-1 overflow-y-auto`) + layout `main` `min-w-0` (`layout.tsx:37`)
**Apply to:** `PresupuestoComparison` table → `<div className="overflow-x-auto">`; `LoopDetailPanel` body → `min-h-0` flex column + `overflow-y-auto`. Never let content scroll the page body (RESEARCH Pitfall 6).

### Design system — this surface uses `neutral-*` on `#fafafa`
**Source:** `LoopCard.tsx`, `LoopSlideOver.tsx`, `CommunitySidebar.tsx`
**Apply to:** all new community components. `rounded-lg border border-neutral-200 bg-white`, `text-neutral-900/700/600/500`, error `text-[#b91c1c]`, primary button `bg-[#0f172a] hover:bg-[#1e293b]`, focus `focus-visible:ring-2 focus-visible:ring-[#0f172a]`. Spanish user-facing copy. Run `/gsd-ui-phase 2` for the detail-panel + comparison-table design contract.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/api/community/blob-upload/route.ts` | route (token broker) | request-response | `@vercel/blob/client` `handleUpload` + `onBeforeGenerateToken` is new to the repo — no existing route brokers a client-upload token. The CV route stores a *server-generated* buffer via `put()` and never crosses the 4.5 MB body limit. Use RESEARCH Pattern 2 (lines 319-355) verbatim as the reference; reuse only `requireAuth` (inside the callback) + the `document-defaults` allow-list constants. |
| `app/components/community/DocumentUpload.tsx` (the `upload()` call specifically) | component | event-driven | The client-side `upload()` from `@vercel/blob/client` with progress + per-file failure isolation has no in-repo precedent. The mutate+`router.refresh()` shell IS analogous (`Cockpit.tsx`); only the direct-to-Blob upload call is new — RESEARCH Pattern 2 `DocumentUpload.tsx` block (lines 358-386). |

---

## Metadata

**Analog search scope:** `lib/community/`, `app/api/community/`, `app/api/cv/`, `app/community-president/`, `app/components/community/`, `lib/types.ts`, `data/`
**Files scanned / read in full:** `open-loops-store.ts`, `loop-defaults.ts`, `require-auth.ts`, `urgency.ts`, `urgency.test.ts`, `app/api/cv/versions/route.ts`, `app/api/cv/versions/[id]/pdf/route.ts`, `app/api/cv/export/route.ts`, `app/api/community/open-loops/route.ts`, `app/api/community/open-loops/[id]/route.ts`, `LoopSlideOver.tsx`, `CommunitySidebar.tsx`, `Cockpit.tsx`, `LoopCard.tsx`, `app/community-president/page.tsx`, `app/community-president/layout.tsx`, `lib/types.ts` (Community banner)
**Pattern extraction date:** 2026-09-10
