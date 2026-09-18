"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
  FILE_TYPES,
  MAX_FILE_BYTES,
  classifyFile,
  formatBytes,
} from "@/lib/community/document-defaults";

interface Props {
  // Slice 2 passes the loop id so an upload from a loop auto-attaches (D-05).
  // Undefined here in the standalone Documentos section.
  loopId?: string;
  onDone?: () => void;
}

type RowState = "pending" | "uploading" | "done" | "error";

interface FileRow {
  id: string;
  file: File;
  name: string;
  size: number;
  state: RowState;
  progress: number;
  message?: string;
}

// Built once from the FILE_TYPES allow-list — never a hand-written list, so
// the browser's file picker filter cannot drift from classifyFile's gate.
const ACCEPT = Object.values(FILE_TYPES)
  .flatMap((entry) => entry.ext)
  .map((ext) => `.${ext}`)
  .join(",");

// Pre-upload validation, mirrored server-side by validateDocumentInput /
// classifyFile — a reject here never calls the upload API (D-03, D-08).
function rejectionReason(file: File): string | null {
  if (file.size === 0) return "El archivo está vacío.";
  if (file.size > MAX_FILE_BYTES) {
    return `El archivo supera el límite de ${formatBytes(MAX_FILE_BYTES)}.`;
  }
  if (!classifyFile(file.name, file.type)) {
    return "Tipo de archivo no admitido.";
  }
  return null;
}

// Maps the Blob SDK's thrown errors (BlobFileTooLargeError /
// BlobContentTypeNotAllowedError — see @vercel/blob's chunk-SH3U4PAV.js
// message text) to Spanish by message content. Importing the error classes
// themselves would pull the server-only "@vercel/blob" package into this
// client bundle; matching on message text avoids that without losing the
// per-cause copy.
function uploadErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.toLowerCase().includes("too large")) {
    return `El archivo supera el límite de ${formatBytes(MAX_FILE_BYTES)}.`;
  }
  if (msg.toLowerCase().includes("content type")) {
    return "Tipo de archivo no admitido.";
  }
  return "No se ha podido subir el archivo. Revisa tu conexión e inténtalo de nuevo.";
}

export default function DocumentUpload({ loopId, onDone }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<FileRow[]>([]);
  const [busy, setBusy] = useState(false);

  async function uploadRow(row: FileRow) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, state: "uploading", progress: 0, message: undefined }
          : r,
      ),
    );

    try {
      // Re-classify rather than trust a stale closure — the extension used
      // for the pathname always comes from the allow-list, never from the
      // user's filename (path-traversal / collision vector, T-02-03).
      const classified = classifyFile(row.file.name, row.file.type);
      if (!classified) throw new Error("content type not allowed");

      const pathname = `community-documents/${crypto.randomUUID()}.${classified.ext}`;
      const blob = await upload(pathname, row.file, {
        access: "private",
        handleUploadUrl: "/api/community/blob-upload",
        contentType: row.file.type || undefined,
        onUploadProgress: (p) => {
          setRows((prev) =>
            prev.map((r) =>
              r.id === row.id ? { ...r, progress: p.percentage } : r,
            ),
          );
        },
      });

      const res = await fetch("/api/community/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blob_pathname: blob.pathname,
          content_type: classified.contentType,
          original_name: row.file.name,
          size: row.file.size,
          linked_loop_id: loopId ?? null,
        }),
      });
      if (!res.ok) throw new Error("No se ha podido guardar el documento.");

      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, state: "done", progress: 100 } : r,
        ),
      );
    } catch (err) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, state: "error", message: uploadErrorMessage(err) }
            : r,
        ),
      );
    }
  }

  // Strictly sequential — one file per request (decision A1-client-upload) —
  // so one file's failure never aborts the batch and the whole-file JSON
  // store is never written concurrently.
  async function runBatch(pending: FileRow[]) {
    if (pending.length === 0) return;
    setBusy(true);
    for (const row of pending) {
      await uploadRow(row);
    }
    setBusy(false);
    router.refresh();
    onDone?.();
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const next: FileRow[] = Array.from(fileList).map((file) => {
      const reason = rejectionReason(file);
      return {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        state: reason ? "error" : "pending",
        progress: 0,
        message: reason ?? undefined,
      };
    });
    setRows((prev) => [...prev, ...next]);
    void runBatch(next.filter((r) => r.state === "pending"));
  }

  // Re-runs ONLY the rows still marked error — succeeded rows are never
  // re-uploaded and never produce a duplicate record.
  function retryFailed() {
    const failed = rows.filter((r) => r.state === "error");
    void runBatch(failed);
  }

  const hasFailed = rows.some((r) => r.state === "error");

  return (
    <div>
      <div
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) addFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
        className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center"
      >
        <label
          htmlFor="document-upload-input"
          className={`block ${busy ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
        >
          <p className="text-sm font-medium text-neutral-900">
            Arrastra archivos aquí o pulsa para seleccionar
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            PDF, JPG, PNG, WebP, HEIC/HEIF — hasta {formatBytes(MAX_FILE_BYTES)}
          </p>
        </label>
        <input
          id="document-upload-input"
          type="file"
          multiple
          accept={ACCEPT}
          disabled={busy}
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {rows.length > 0 && (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-neutral-900">{row.name}</p>
                <p className="text-xs text-neutral-500">
                  {formatBytes(row.size)}
                  {row.state === "uploading" && ` · Subiendo… ${row.progress}%`}
                  {row.state === "done" && " · Subido"}
                  {row.state === "error" && row.message ? ` · ${row.message}` : ""}
                </p>
              </div>
              {row.state === "error" && (
                <span className="shrink-0 text-xs font-medium text-[#b91c1c]">
                  Error
                </span>
              )}
              {row.state === "done" && (
                <span className="shrink-0 text-xs font-medium text-emerald-600">
                  Listo
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasFailed && (
        <button
          type="button"
          onClick={retryFailed}
          disabled={busy}
          className="mt-3 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
