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
  classifyFile,
  formatBytes,
  sanitizeFilename,
} from "./document-defaults.ts";

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
