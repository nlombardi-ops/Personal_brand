import type { Document, DocumentFileKind, DocumentStatus, DocumentType } from "@/lib/types";

// ── Single source of truth for the D-04/D-06/D-07 vocabularies ────────────
// The select in DocumentRow renders from this record AND the validation
// allow-list is derived from its keys — so the type, the validator, the form
// and the labels cannot drift (RESEARCH Pitfall 7 / loop-defaults.ts pattern).

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  acta: "Acta",
  contrato: "Contrato",
  presupuesto: "Presupuesto",
  carta: "Carta",
  sin_clasificar: "Sin clasificar",
};

const DOCUMENT_TYPES = new Set(Object.keys(DOCUMENT_TYPE_LABELS));

// D-08: a recorded Claude's-discretion default, written as the expression
// (not the magic integer) so the cap is legible at every call site.
export const MAX_FILE_BYTES = 15 * 1024 * 1024;

interface FileTypeEntry {
  ext: readonly string[];
  mime: readonly string[];
  kind: DocumentFileKind;
  serve: string;
}

// Frozen allow-list. No SVG entry and no office-document entry — an SVG
// served inline can execute script in this origin (T-02-02). HEIC/HEIF include
// the empty string in `mime` because browsers routinely report an empty media
// type for those files; rejecting that would break the phone-photo use case.
export const FILE_TYPES: Readonly<Record<string, FileTypeEntry>> = Object.freeze({
  pdf: {
    ext: ["pdf"],
    mime: ["application/pdf"],
    kind: "pdf",
    serve: "application/pdf",
  },
  jpg: {
    ext: ["jpg", "jpeg"],
    mime: ["image/jpeg"],
    kind: "image",
    serve: "image/jpeg",
  },
  png: {
    ext: ["png"],
    mime: ["image/png"],
    kind: "image",
    serve: "image/png",
  },
  webp: {
    ext: ["webp"],
    mime: ["image/webp"],
    kind: "image",
    serve: "image/webp",
  },
  heic: {
    ext: ["heic", "heif"],
    mime: ["image/heic", "image/heif", ""],
    kind: "image",
    serve: "image/heic",
  },
});

// The exact array handed to `onBeforeGenerateToken`'s `allowedContentTypes`.
// Flattened from FILE_TYPES, excluding the HEIC empty-string sentinel — Vercel
// Blob's allow-list is a real media-type list, not our "unknown" placeholder.
export const ALLOWED_MIME: string[] = Array.from(
  new Set(
    Object.values(FILE_TYPES).flatMap((entry) =>
      entry.mime.filter((m) => m !== ""),
    ),
  ),
);

/**
 * Returns `{ ext, kind, contentType }` for an accepted (extension, mime) pair,
 * or null when either the extension is not allow-listed or the media type
 * disagrees with it. Extension and media type must BOTH agree — this one
 * function is the gate the browser, the token broker and the metadata POST
 * each run, so the allow-list cannot drift between the three enforcement points.
 */
export function classifyFile(
  originalName: string,
  mimeType: string,
): { ext: string; kind: DocumentFileKind; contentType: string } | null {
  const lowerName = originalName.toLowerCase();
  const dotIndex = lowerName.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === lowerName.length - 1) return null;
  const ext = lowerName.slice(dotIndex + 1);

  const entry = Object.values(FILE_TYPES).find((t) => t.ext.includes(ext));
  if (!entry) return null;

  const mime = mimeType.toLowerCase();
  if (!entry.mime.includes(mime)) return null;

  return { ext: entry.ext[0], kind: entry.kind, contentType: entry.serve };
}

// Conservative fallback per kind — used only when the document's stored
// content_type is not one of our own known image serve-strings.
export const SERVE_CONTENT_TYPE: Record<DocumentFileKind, string> = {
  pdf: "application/pdf",
  image: "application/octet-stream",
};

const IMAGE_SERVE_TYPES = new Set(
  Object.values(FILE_TYPES)
    .filter((entry) => entry.kind === "image")
    .map((entry) => entry.serve),
);

/**
 * The ONLY function the file proxy may use to pick a response Content-Type.
 * Reads from our own validated map, never from the value the storage SDK
 * reports for the object — a spoofed stored media type must not be able to
 * drive an inline render (T-02-02).
 */
export function serveContentType(
  doc: Pick<Document, "file_kind" | "content_type">,
): string {
  if (doc.file_kind === "pdf") return SERVE_CONTENT_TYPE.pdf;
  if (IMAGE_SERVE_TYPES.has(doc.content_type)) return doc.content_type;
  return SERVE_CONTENT_TYPE.image;
}

const BYTE_UNITS = ["KB", "MB", "GB"];

/**
 * One 1024-based formatter, used by both the Spanish cap message and each
 * list row's size — so the number quoted in the error and the number the
 * upload token enforces cannot disagree.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = Math.round(value * 10) / 10;
  const display = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${display} ${BYTE_UNITS[unitIndex]}`;
}

// Strips characters that could break a Content-Disposition filename parameter
// or inject a header. Returns "" (proxy then omits the filename param) when
// the result is empty or contains anything outside the ASCII range — RFC 6266
// encoded filenames are not worth the complexity for a single-user tool.
const UNSAFE_FILENAME_CHARS = /["\\\r\n\x00-\x1f]/g;
const NON_ASCII = /[^\x00-\x7f]/;

export function sanitizeFilename(title: string): string {
  const stripped = title.replace(UNSAFE_FILENAME_CHARS, "").trim();
  if (!stripped) return "";
  if (NON_ASCII.test(stripped)) return "";
  return stripped;
}

const TITLE_MAX = 200;
const ORIGINAL_NAME_MAX = 300;
const LINKED_LOOP_IDS_MAX = 50;
const YMD = /^\d{4}-\d{2}-\d{2}$/;
// community-documents/{uuid-v4}.{allow-listed extension}
const BLOB_PATHNAME_RE =
  /^community-documents\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|jpeg|png|webp|heic|heif)$/;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Returns a human-readable Spanish error string, or null when the body is
 * valid. `create` requires the blob-metadata fields the browser sends after
 * `upload()` succeeds; otherwise every field is optional but still validated
 * when present, exactly like `validateLoopInput`.
 */
export function validateDocumentInput(
  body: unknown,
  opts: { create: boolean },
): string | null {
  if (!isPlainObject(body)) {
    return "El cuerpo de la petición no es válido.";
  }

  if (opts.create) {
    if (
      typeof body.blob_pathname !== "string" ||
      !BLOB_PATHNAME_RE.test(body.blob_pathname)
    ) {
      return "La ruta del archivo no es válida.";
    }
    if (
      typeof body.content_type !== "string" ||
      !ALLOWED_MIME.includes(body.content_type)
    ) {
      return "El tipo de archivo no está admitido.";
    }
    if (
      typeof body.original_name !== "string" ||
      !body.original_name.trim() ||
      body.original_name.length > ORIGINAL_NAME_MAX
    ) {
      return "El nombre del archivo no es válido.";
    }
    if (
      typeof body.size !== "number" ||
      !Number.isInteger(body.size) ||
      body.size <= 0 ||
      body.size > MAX_FILE_BYTES
    ) {
      return `El archivo debe pesar más de 0 bytes y como máximo ${formatBytes(MAX_FILE_BYTES)}.`;
    }
    if (body.linked_loop_id !== undefined && body.linked_loop_id !== null) {
      if (typeof body.linked_loop_id !== "string" || !body.linked_loop_id.trim()) {
        return "El bucle vinculado no es válido.";
      }
    }
  }

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.length > TITLE_MAX) {
      return `El título no puede superar los ${TITLE_MAX} caracteres.`;
    }
  }
  if (body.type !== undefined && !DOCUMENT_TYPES.has(String(body.type))) {
    return 'El valor de "tipo" no es válido.';
  }
  if (body.doc_date !== undefined && body.doc_date !== null) {
    if (typeof body.doc_date !== "string" || !YMD.test(body.doc_date)) {
      return "La fecha del documento debe tener el formato AAAA-MM-DD.";
    }
  }
  if (
    body.status !== undefined &&
    body.status !== "active" &&
    body.status !== "archived"
  ) {
    return 'El valor de "estado" no es válido.';
  }
  if (body.linked_loop_ids !== undefined) {
    if (
      !Array.isArray(body.linked_loop_ids) ||
      body.linked_loop_ids.length > LINKED_LOOP_IDS_MAX
    ) {
      return "La lista de bucles vinculados no es válida.";
    }
    const seen = new Set<string>();
    for (const id of body.linked_loop_ids) {
      if (typeof id !== "string" || !id.trim()) {
        return "La lista de bucles vinculados no es válida.";
      }
      const trimmed = id.trim();
      if (seen.has(trimmed)) {
        return "La lista de bucles vinculados no puede tener duplicados.";
      }
      seen.add(trimmed);
    }
  }

  return null;
}

// ── PATCH allow-list (D-04 edit, T-02-08 / T-02-09) ────────────────────────
// The ONLY keys a PATCH body may touch. `id`, `blob_pathname`, `file_kind`,
// `content_type`, `size_bytes`, `original_name` and `uploaded_at` are
// server-owned and absent here, so they cannot be set from the wire.
// `__proto__` / `constructor` are likewise absent, so a prototype-polluting
// key is structurally unreachable — not filtered by name. This frozen list is
// the single choke point protecting the stored document from mass assignment;
// if a handler ever spreads the raw body instead, both protections vanish.
export const PATCHABLE_DOCUMENT_KEYS = Object.freeze([
  "title",
  "type",
  "doc_date",
  "linked_loop_ids",
  "status",
] as const);

/**
 * Builds the next Document by copying `existing` and overlaying ONLY the
 * allow-listed keys that are own properties of `patch`. The raw patch object
 * is never spread, so server-owned fields cannot be overwritten and polluting
 * keys can never be read. `linked_loop_ids` is replaced as a complete new
 * array (Slice 2 depends on this contract). Refreshes `updated_at`. Call only
 * after validateDocumentInput(patch, { create: false }) has returned null.
 */
export function applyDocumentPatch(
  existing: Document,
  patch: Record<string, unknown>,
): Document {
  const next: Document = { ...existing };

  for (const key of PATCHABLE_DOCUMENT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    const value = patch[key];

    switch (key) {
      case "title":
        if (typeof value === "string") next.title = value.trim();
        break;
      case "type":
        if (typeof value === "string" && DOCUMENT_TYPES.has(value)) {
          next.type = value as DocumentType;
        }
        break;
      case "doc_date":
        next.doc_date = typeof value === "string" ? value : null;
        break;
      case "linked_loop_ids":
        if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
          next.linked_loop_ids = value as string[];
        }
        break;
      case "status":
        if (value === "active" || value === "archived") {
          next.status = value as DocumentStatus;
        }
        break;
    }
  }

  next.updated_at = new Date().toISOString();
  return next;
}

type NewDocumentFields = Omit<Document, "id" | "uploaded_at" | "updated_at">;

/**
 * Picks the validated field set by name (never spreads the incoming body, so
 * unknown keys never reach the stored document) and fills the D-04 upload
 * defaults: nothing but the file is required. `file_kind` and `content_type`
 * come from the server-side `classifyFile` re-run in the route, never from
 * the client. Call only after validateDocumentInput has returned null in
 * create mode.
 */
export function applyDocumentCreateDefaults(
  body: Record<string, unknown>,
  classified: { kind: DocumentFileKind; contentType: string },
): NewDocumentFields {
  const originalName = String(body.original_name).trim();
  const linkedLoopId =
    typeof body.linked_loop_id === "string" && body.linked_loop_id.trim()
      ? body.linked_loop_id.trim()
      : undefined;

  return {
    title: originalName,
    type: "sin_clasificar",
    status: "active",
    blob_pathname: String(body.blob_pathname),
    file_kind: classified.kind,
    content_type: classified.contentType,
    size_bytes: Number(body.size),
    original_name: originalName,
    linked_loop_ids: linkedLoopId ? [linkedLoopId] : [],
  };
}
