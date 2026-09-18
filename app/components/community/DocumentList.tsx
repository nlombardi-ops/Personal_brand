"use client";

import { useState } from "react";
import DocumentRow, { type LoopSummary } from "./DocumentRow";
import type { Document } from "@/lib/types";

interface Props {
  documents: Document[];
  // D-05 (document side): the lightweight loop list DocumentRow's assignment
  // control needs — never the full OpenLoop (T-02-19).
  loops: LoopSummary[];
}

interface RowState {
  pending: boolean;
  error: boolean;
}

const SAVE_ERROR =
  "No se ha podido guardar el documento. Revisa tu conexión e inténtalo de nuevo.";

// Per-document pending/error map keyed by document id (Cockpit.tsx lines
// 34-36 / 115-127 shape) — one row's spinner and error notice never block
// another row from staying interactive.
export default function DocumentList({ documents, loops }: Props) {
  const [state, setState] = useState<Record<string, RowState>>({});

  function onStart(docId: string) {
    setState((m) => ({ ...m, [docId]: { pending: true, error: false } }));
  }

  function onSettle(docId: string, ok: boolean) {
    setState((m) => ({ ...m, [docId]: { pending: false, error: !ok } }));
  }

  if (documents.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        Aún no has subido ningún documento.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {documents.map((doc) => (
        <div key={doc.id}>
          <DocumentRow
            document={doc}
            loops={loops}
            pending={state[doc.id]?.pending ?? false}
            onStart={() => onStart(doc.id)}
            onSettle={(ok) => onSettle(doc.id, ok)}
          />
          {state[doc.id]?.error ? (
            <p className="mt-1 text-xs font-semibold text-[#b91c1c]">
              {SAVE_ERROR}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
