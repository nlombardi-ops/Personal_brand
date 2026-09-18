"use client";

import { format } from "date-fns";
import { DOCUMENT_TYPE_LABELS, formatBytes } from "@/lib/community/document-defaults";
import type { Document } from "@/lib/types";

interface Props {
  document: Document;
}

// Card shell copied from LoopCard.tsx. All free text (title) renders as
// ordinary React text children — the raw-HTML injection prop is prohibited
// on this surface, since a title may quote a neighbour's name.
export default function DocumentRow({ document }: Props) {
  const typeLabel = DOCUMENT_TYPE_LABELS[document.type];
  const dateLabel = format(
    new Date(document.doc_date ?? document.uploaded_at),
    "d MMM yyyy",
  );
  const isHeic =
    document.file_kind === "image" &&
    (document.content_type === "image/heic" || document.content_type === "image/heif");

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-sm font-semibold leading-[1.4] text-neutral-900">
        {document.title}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
          {typeLabel}
        </span>
        <span className="font-mono text-xs tabular-nums text-neutral-500">
          {dateLabel}
        </span>
        <span className="text-xs text-neutral-500">
          {formatBytes(document.size_bytes)}
        </span>
        <a
          href={`/api/community/documents/${document.id}/file`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-[#0f172a] underline underline-offset-2 hover:text-[#1e293b]"
        >
          Ver
        </a>
      </div>
      {isHeic ? (
        <p className="mt-2 text-xs text-neutral-500">
          Algunos navegadores descargan las fotos HEIC en lugar de mostrarlas
          — se previsualizan en Safari.
        </p>
      ) : null}
    </div>
  );
}
