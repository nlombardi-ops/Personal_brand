"use client";

import DocumentRow from "./DocumentRow";
import type { Document } from "@/lib/types";

interface Props {
  documents: Document[];
}

// The per-document pending/error map (Cockpit.tsx lines 34-36 / 115-127
// shape) that keeps one row's spinner from blocking another is wired in
// Task 3, alongside the DocumentRow inline edit affordances that actually
// trigger a PATCH.
export default function DocumentList({ documents }: Props) {
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
        <DocumentRow key={doc.id} document={doc} />
      ))}
    </div>
  );
}
