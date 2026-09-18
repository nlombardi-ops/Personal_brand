// Local-only Node built-in test (node:test). This repo has NO test runner and no
// CI — run manually with `node --test lib/community/document-defaults.test.ts`. Vercel and
// `next build` never execute it. `npx tsc --noEmit` and `npm run lint` still cover
// it. Native TypeScript type-stripping handles the syntax (local Node is 25.x);
// on Node < 23.6 add `--experimental-strip-types`. Type-only imports MUST use the
// `import type` form so stripping can erase them.
import test from "node:test";
import assert from "node:assert/strict";

import {
  ALLOWED_MIME,
  MAX_FILE_BYTES,
  applyDocumentPatch,
  attachLoopId,
  classifyFile,
  detachLoopId,
  documentsForLoop,
  formatBytes,
  sanitizeFilename,
  validateDocumentInput,
} from "./document-defaults.ts";
import type { Document } from "../types.ts";

// ── classifyFile ──────────────────────────────────────────────────────────

test("acta.pdf with application/pdf is accepted as pdf", () => {
  const result = classifyFile("acta.pdf", "application/pdf");
  assert.equal(result?.ext, "pdf");
  assert.equal(result?.kind, "pdf");
});

test("FOTO.HEIC (uppercase) with image/heic is accepted — extension matching is case-insensitive", () => {
  const result = classifyFile("FOTO.HEIC", "image/heic");
  assert.equal(result?.ext, "heic");
  assert.equal(result?.kind, "image");
});

test("foto.heic with an empty mime string is accepted (browsers often omit HEIC media type)", () => {
  const result = classifyFile("foto.heic", "");
  assert.notEqual(result, null);
  assert.equal(result?.kind, "image");
});

test("foto.heif with image/heif is accepted", () => {
  const result = classifyFile("foto.heif", "image/heif");
  assert.notEqual(result, null);
});

test("logo.svg with image/svg+xml is rejected — SVG can carry script", () => {
  assert.equal(classifyFile("logo.svg", "image/svg+xml"), null);
});

test("payload.exe with application/pdf is rejected — extension not allow-listed", () => {
  assert.equal(classifyFile("payload.exe", "application/pdf"), null);
});

test("acta.pdf with image/png is rejected — extension and media type disagree", () => {
  assert.equal(classifyFile("acta.pdf", "image/png"), null);
});

test("noextension with application/pdf is rejected", () => {
  assert.equal(classifyFile("noextension", "application/pdf"), null);
});

test("a.jpg and a.jpeg with image/jpeg are both accepted as kind image", () => {
  const jpg = classifyFile("a.jpg", "image/jpeg");
  const jpeg = classifyFile("a.jpeg", "image/jpeg");
  assert.equal(jpg?.kind, "image");
  assert.equal(jpeg?.kind, "image");
});

// ── MAX_FILE_BYTES / ALLOWED_MIME ────────────────────────────────────────

test("MAX_FILE_BYTES equals 15728640 exactly (D-08)", () => {
  assert.equal(MAX_FILE_BYTES, 15728640);
});

test("ALLOWED_MIME contains every accepted media type and no SVG media type", () => {
  assert.ok(ALLOWED_MIME.includes("application/pdf"));
  assert.ok(ALLOWED_MIME.includes("image/jpeg"));
  assert.ok(ALLOWED_MIME.includes("image/png"));
  assert.ok(ALLOWED_MIME.includes("image/webp"));
  assert.ok(ALLOWED_MIME.includes("image/heic"));
  assert.ok(ALLOWED_MIME.includes("image/heif"));
  assert.ok(!ALLOWED_MIME.some((m) => m.includes("svg")));
});

// ── formatBytes ───────────────────────────────────────────────────────────

test("formatBytes(15728640) renders a 1024-based '15 MB' style string", () => {
  assert.equal(formatBytes(15728640), "15 MB");
});

// ── sanitizeFilename ──────────────────────────────────────────────────────

test("sanitizeFilename strips double quotes, carriage returns and newlines", () => {
  const result = sanitizeFilename('acta"\r\n.pdf');
  assert.ok(!result.includes('"'));
  assert.ok(!result.includes("\r"));
  assert.ok(!result.includes("\n"));
});

test("sanitizeFilename returns the empty string for a fully non-ASCII name", () => {
  assert.equal(sanitizeFilename("документ"), "");
});

test("sanitizeFilename returns the empty string when stripping leaves nothing", () => {
  assert.equal(sanitizeFilename('"\r\n'), "");
});

// ── applyDocumentPatch ────────────────────────────────────────────────────

let seq = 0;
function makeDocument(overrides: Partial<Document> = {}): Document {
  seq += 1;
  return {
    id: `doc-${seq}`,
    title: `Documento ${seq}`,
    type: "sin_clasificar",
    status: "active",
    blob_pathname: `community-documents/doc-${seq}.pdf`,
    file_kind: "pdf",
    content_type: "application/pdf",
    size_bytes: 1024,
    original_name: `doc-${seq}.pdf`,
    linked_loop_ids: [],
    uploaded_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("applyDocumentPatch trims the title and refreshes updated_at, leaving other fields untouched", () => {
  const doc = makeDocument({ title: "Original" });
  const patched = applyDocumentPatch(doc, { title: "  Acta junta  " });
  assert.equal(patched.title, "Acta junta");
  assert.equal(patched.type, doc.type);
  assert.equal(patched.status, doc.status);
  assert.equal(patched.blob_pathname, doc.blob_pathname);
  assert.notEqual(patched.updated_at, doc.updated_at);
});

test("applyDocumentPatch sets a valid type and rejects an invalid one", () => {
  const doc = makeDocument({ type: "acta" });
  const valid = applyDocumentPatch(doc, { type: "presupuesto" });
  assert.equal(valid.type, "presupuesto");

  const invalid = applyDocumentPatch(doc, { type: "inventado" });
  assert.equal(invalid.type, "acta");
});

test("applyDocumentPatch replaces linked_loop_ids wholesale (Slice 2 depends on this)", () => {
  const doc = makeDocument({ linked_loop_ids: ["x", "y", "z"] });
  const patched = applyDocumentPatch(doc, { linked_loop_ids: ["a", "b"] });
  assert.deepEqual(patched.linked_loop_ids, ["a", "b"]);
});

test("applyDocumentPatch archives on a valid status and ignores an invalid one", () => {
  const doc = makeDocument({ status: "active" });
  const archived = applyDocumentPatch(doc, { status: "archived" });
  assert.equal(archived.status, "archived");

  const unchanged = applyDocumentPatch(doc, { status: "deleted" });
  assert.equal(unchanged.status, "active");
});

test("applyDocumentPatch sets and clears doc_date", () => {
  const doc = makeDocument({ doc_date: null });
  const withDate = applyDocumentPatch(doc, { doc_date: "2026-04-12" });
  assert.equal(withDate.doc_date, "2026-04-12");

  const cleared = applyDocumentPatch(withDate, { doc_date: null });
  assert.equal(cleared.doc_date, null);
});

test("applyDocumentPatch ignores server-owned keys entirely", () => {
  const doc = makeDocument();
  const patched = applyDocumentPatch(doc, {
    id: "hijacked",
    blob_pathname: "other/thing.pdf",
    file_kind: "image",
    content_type: "image/png",
    size_bytes: 1,
    original_name: "hijacked.png",
    uploaded_at: "2099-01-01T00:00:00.000Z",
  });
  assert.equal(patched.id, doc.id);
  assert.equal(patched.blob_pathname, doc.blob_pathname);
  assert.equal(patched.file_kind, doc.file_kind);
  assert.equal(patched.content_type, doc.content_type);
  assert.equal(patched.size_bytes, doc.size_bytes);
  assert.equal(patched.original_name, doc.original_name);
  assert.equal(patched.uploaded_at, doc.uploaded_at);
});

test("applyDocumentPatch never reads a prototype-polluting key as an own property", () => {
  const doc = makeDocument();
  const malicious = JSON.parse('{"__proto__": {"polluted": true}, "title": "ok"}');
  const patched = applyDocumentPatch(doc, malicious);
  assert.equal(patched.title, "ok");
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

// ── validateDocumentInput (patch mode) ───────────────────────────────────

test("validateDocumentInput rejects duplicate linked_loop_ids", () => {
  const result = validateDocumentInput(
    { linked_loop_ids: ["a", "a"] },
    { create: false },
  );
  assert.notEqual(result, null);
});

test("validateDocumentInput rejects a linked_loop_ids array over 50 entries", () => {
  const tooMany = Array.from({ length: 51 }, (_, i) => `id-${i}`);
  const result = validateDocumentInput(
    { linked_loop_ids: tooMany },
    { create: false },
  );
  assert.notEqual(result, null);
});

// ── documentsForLoop / attachLoopId / detachLoopId (Slice 2, LOOP-02) ─────
// The ONE place the loop→documents resolution is expressed — the detail
// panel and the board's attachment-count chip both call it so they can
// never disagree.

test("documentsForLoop returns only documents whose linked_loop_ids contains the loop id", () => {
  const linked = makeDocument({ linked_loop_ids: ["loop-a"] });
  const other = makeDocument({ linked_loop_ids: ["loop-b"] });
  const result = documentsForLoop([linked, other], "loop-a");
  assert.deepEqual(result.map((d) => d.id), [linked.id]);
});

test("documentsForLoop excludes archived documents even when linked", () => {
  const archived = makeDocument({
    linked_loop_ids: ["loop-a"],
    status: "archived",
  });
  assert.deepEqual(documentsForLoop([archived], "loop-a"), []);
});

test("documentsForLoop returns an empty array for a loop with no links, and for empty input", () => {
  const unrelated = makeDocument({ linked_loop_ids: ["loop-b"] });
  assert.deepEqual(documentsForLoop([unrelated], "loop-a"), []);
  assert.deepEqual(documentsForLoop([], "loop-a"), []);
});

test("documentsForLoop orders by uploaded_at descending, keeping input order for ties (stable sort)", () => {
  const older = makeDocument({
    linked_loop_ids: ["loop-a"],
    uploaded_at: "2026-01-01T00:00:00.000Z",
  });
  const newer = makeDocument({
    linked_loop_ids: ["loop-a"],
    uploaded_at: "2026-02-01T00:00:00.000Z",
  });
  const tie1 = makeDocument({
    linked_loop_ids: ["loop-a"],
    uploaded_at: "2026-03-01T00:00:00.000Z",
  });
  const tie2 = makeDocument({
    linked_loop_ids: ["loop-a"],
    uploaded_at: "2026-03-01T00:00:00.000Z",
  });
  const result = documentsForLoop([older, tie1, tie2, newer], "loop-a");
  assert.deepEqual(result.map((d) => d.id), [
    tie1.id,
    tie2.id,
    newer.id,
    older.id,
  ]);
});

test("attachLoopId appends when absent", () => {
  assert.deepEqual(attachLoopId(["x"], "y"), ["x", "y"]);
});

test("attachLoopId returns an array equal to the input when the id is already present — no duplicate, order preserved", () => {
  assert.deepEqual(attachLoopId(["x", "y"], "x"), ["x", "y"]);
});

test("attachLoopId never mutates the input array", () => {
  const input = Object.freeze(["x"]);
  attachLoopId(input, "y");
  assert.deepEqual(input, ["x"]);
});

test("detachLoopId removes the id when present", () => {
  assert.deepEqual(detachLoopId(["x", "y"], "x"), ["y"]);
});

test("detachLoopId returns an array equal to the input when the id is absent", () => {
  assert.deepEqual(detachLoopId(["x", "y"], "z"), ["x", "y"]);
});

test("detachLoopId removing the only entry returns an empty array — a valid orphan state", () => {
  assert.deepEqual(detachLoopId(["x"], "x"), []);
});

test("detachLoopId never mutates the input array", () => {
  const input = Object.freeze(["x", "y"]);
  detachLoopId(input, "x");
  assert.deepEqual(input, ["x", "y"]);
});
