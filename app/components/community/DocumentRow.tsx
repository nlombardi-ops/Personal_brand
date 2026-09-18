"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { DOCUMENT_TYPE_LABELS, formatBytes } from "@/lib/community/document-defaults";
import type { Document, DocumentType } from "@/lib/types";

const TYPE_ENTRIES = Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, string][];

const fieldClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400";
const labelClass = "text-xs font-semibold text-neutral-700";

interface Props {
  document: Document;
  pending: boolean;
  onStart: () => void;
  onSettle: (ok: boolean) => void;
}

// Card shell copied from LoopCard.tsx. All free text (title) renders as
// ordinary React text children — the raw-HTML injection prop is prohibited
// on this surface, since a title may quote a neighbour's name. Every edit
// PATCHes the single mutation endpoint, reporting start/settle to the list's
// keyed map so only this row shows a spinner (D-04).
export default function DocumentRow({ document, pending, onStart, onSettle }: Props) {
  const router = useRouter();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(document.title);
  const [archiving, setArchiving] = useState(false);

  const dateLabel = format(
    new Date(document.doc_date ?? document.uploaded_at),
    "d MMM yyyy",
  );
  const isHeic =
    document.file_kind === "image" &&
    (document.content_type === "image/heic" || document.content_type === "image/heif");

  async function patchDoc(patch: Record<string, unknown>) {
    onStart();
    try {
      const res = await fetch(`/api/community/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        onSettle(false);
        return;
      }
      onSettle(true);
      router.refresh();
    } catch {
      onSettle(false);
    }
  }

  function commitTitle() {
    const trimmed = titleDraft.trim();
    setEditingTitle(false);
    if (!trimmed || trimmed === document.title) {
      setTitleDraft(document.title);
      return;
    }
    void patchDoc({ title: trimmed });
  }

  function revertTitle() {
    setTitleDraft(document.title);
    setEditingTitle(false);
  }

  return (
    <div className={`rounded-lg border border-neutral-200 bg-white p-4 ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
      {editingTitle ? (
        <input
          autoFocus
          value={titleDraft}
          maxLength={200}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle();
            if (e.key === "Escape") revertTitle();
          }}
          className={fieldClass}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingTitle(true)}
          disabled={pending}
          className="text-left text-sm font-semibold leading-[1.4] text-neutral-900 hover:underline"
        >
          {document.title}
        </button>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={document.type}
          disabled={pending}
          onChange={(e) => void patchDoc({ type: e.target.value })}
          className="border border-neutral-200 bg-white px-2 py-0.5 text-xs text-neutral-600 outline-none focus:border-neutral-400"
        >
          {TYPE_ENTRIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
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

      <label className="mt-3 flex flex-col gap-1">
        <span className={labelClass}>Fecha del documento</span>
        <input
          type="date"
          disabled={pending}
          value={document.doc_date ?? ""}
          onChange={(e) => void patchDoc({ doc_date: e.target.value || null })}
          className={`${fieldClass} max-w-[180px]`}
        />
      </label>

      <div className="mt-3">
        {archiving ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-neutral-700">
              ¿Archivar este documento? El archivo se conserva; solo deja de
              aparecer en la lista.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setArchiving(false)}
                className="rounded-md text-xs font-medium text-neutral-600 hover:text-neutral-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setArchiving(false);
                  void patchDoc({ status: "archived" });
                }}
                className="rounded-lg bg-[#b91c1c] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#991b1b] disabled:opacity-50"
              >
                Archivar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setArchiving(true)}
            disabled={pending}
            className="text-xs font-medium text-[#b91c1c] hover:text-[#991b1b]"
          >
            Archivar
          </button>
        )}
      </div>
    </div>
  );
}
