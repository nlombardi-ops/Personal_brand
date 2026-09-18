"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DOCUMENT_TYPE_LABELS,
  attachLoopId,
  detachLoopId,
  formatBytes,
} from "@/lib/community/document-defaults";
import type { Document } from "@/lib/types";

const SAVE_ERROR =
  "No se ha podido adjuntar el documento. Revisa tu conexión e inténtalo de nuevo.";

interface Props {
  loopId: string;
  attached: Document[];
  library: Document[];
  onSettle?: (ok: boolean) => void;
}

// D-05 (loop side): attach from the library or detach — the ONE mutation
// path is PATCH /api/community/documents/{id} with the COMPLETE new
// linked_loop_ids array (attachLoopId / detachLoopId build it). There is no
// attach endpoint and no detach endpoint. Disables while a request is in
// flight so a double click cannot fire two racing whole-array writes.
export default function AttachDocumentControl({
  loopId,
  attached,
  library,
  onSettle,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState("");

  const attachedIds = new Set(attached.map((d) => d.id));
  const pickable = library
    .filter((doc) => !attachedIds.has(doc.id))
    .sort((a, b) => {
      if (a.type === "presupuesto" && b.type !== "presupuesto") return -1;
      if (b.type === "presupuesto" && a.type !== "presupuesto") return 1;
      return a.uploaded_at < b.uploaded_at ? 1 : a.uploaded_at > b.uploaded_at ? -1 : 0;
    });

  async function patchLinks(doc: Document, nextLinkedLoopIds: string[]) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linked_loop_ids: nextLinkedLoopIds }),
      });
      if (!res.ok) {
        setError(SAVE_ERROR);
        onSettle?.(false);
        return;
      }
      onSettle?.(true);
      router.refresh();
    } catch {
      setError(SAVE_ERROR);
      onSettle?.(false);
    } finally {
      setPending(false);
    }
  }

  function handleAttach() {
    const doc = library.find((d) => d.id === selected);
    if (!doc) return;
    setPickerOpen(false);
    setSelected("");
    void patchLinks(doc, attachLoopId(doc.linked_loop_ids, loopId));
  }

  function handleDetach(doc: Document) {
    void patchLinks(doc, detachLoopId(doc.linked_loop_ids, loopId));
  }

  return (
    <div className="flex flex-col gap-2">
      {attached.length > 0 && (
        <ul className="flex flex-col gap-2">
          {attached.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white p-3"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-neutral-900">
                {doc.title}
              </span>
              <span className="inline-flex items-center border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
                {DOCUMENT_TYPE_LABELS[doc.type]}
              </span>
              <span className="text-xs text-neutral-500">
                {formatBytes(doc.size_bytes)}
              </span>
              <a
                href={`/api/community/documents/${doc.id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-[#0f172a] underline underline-offset-2 hover:text-[#1e293b]"
              >
                Ver
              </a>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleDetach(doc)}
                className="text-xs font-medium text-[#b91c1c] transition-colors hover:text-[#991b1b] disabled:opacity-50"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      {pickerOpen ? (
        <div className="flex flex-wrap items-center gap-2">
          {pickable.length === 0 ? (
            <p className="text-xs text-neutral-500">
              No hay documentos disponibles. Súbelos desde la sección
              Documentos.
            </p>
          ) : (
            <>
              <select
                value={selected}
                disabled={pending}
                onChange={(e) => setSelected(e.target.value)}
                className="border border-neutral-200 bg-white px-2 py-1.5 text-sm text-neutral-900 outline-none focus:border-neutral-400"
              >
                <option value="">Selecciona un documento…</option>
                {pickable.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title} — {DOCUMENT_TYPE_LABELS[doc.type]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={pending || !selected}
                onClick={handleAttach}
                className="rounded-lg bg-[#0f172a] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1e293b] disabled:opacity-50"
              >
                Adjuntar
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            className="text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-900"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="self-start rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          Adjuntar documento
        </button>
      )}

      {error && (
        <p className="text-xs font-semibold text-[#b91c1c]">{error}</p>
      )}
    </div>
  );
}
