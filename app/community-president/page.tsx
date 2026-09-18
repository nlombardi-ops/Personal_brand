import Cockpit from "@/app/components/community/Cockpit";
import { getOpenLoops } from "@/lib/community/open-loops-store";
import { getDocuments } from "@/lib/community/documents-store";
import { getPresupuestos } from "@/lib/community/presupuestos-store";
import { groupLoopsByUrgency } from "@/lib/community/urgency";
import { documentsForLoop } from "@/lib/community/document-defaults";
import type { Document, Presupuesto } from "@/lib/types";

// Server Component: reads the store directly at request time (the layout already
// gates the segment, so no AuthGuard here). Never static-import the seed JSON —
// that bakes in a build-time snapshot and created loops never appear. No client
// fetch, so there is no skeleton and no loading state on first paint.
//
// Grouping runs HERE, on the server, so the ranked board is correct on first
// paint (SC-3). Moving it into a client effect would flash an ungrouped board.
// Slice 2: the loop→documents resolution follows the same rule — it runs
// here too, via documentsForLoop, so the detail panel never opens with an
// empty attachment list and then pops.
export default async function CommunityPresidentPage() {
  const [loops, documents, presupuestos] = await Promise.all([
    getOpenLoops(),
    getDocuments(),
    getPresupuestos(),
  ]);
  const grouped = groupLoopsByUrgency(loops);

  const documentsByLoop: Record<string, Document[]> = {};
  const attachmentCounts: Record<string, number> = {};
  for (const loop of loops) {
    const attachments = documentsForLoop(documents, loop.id);
    documentsByLoop[loop.id] = attachments;
    // Derived from the SAME documentsForLoop result the panel resolves —
    // never a second, independent filter over the raw documents array — so
    // the board chip and the panel can never disagree.
    attachmentCounts[loop.id] = attachments.length;
  }

  // Library picker (AttachDocumentControl): every non-archived document,
  // newest-first. Linking a document to a loop never mutates its `type`.
  const libraryDocuments = documents
    .filter((doc) => doc.status !== "archived")
    .sort((a, b) =>
      a.uploaded_at < b.uploaded_at ? 1 : a.uploaded_at > b.uploaded_at ? -1 : 0,
    );

  // Slice 3: resolved server-side, obra loops only, non-archived — so the
  // detail panel never opens with a stale or empty presupuesto list and then
  // pops (same rule as documentsByLoop above).
  const presupuestosByLoop: Record<string, Presupuesto[]> = {};
  for (const loop of loops) {
    if (loop.kind !== "obra") continue;
    presupuestosByLoop[loop.id] = presupuestos.filter(
      (p) => p.loop_id === loop.id && p.status !== "archived",
    );
  }

  return (
    <div className="px-6 py-8 lg:px-8">
      <Cockpit
        loops={loops}
        grouped={grouped}
        documentsByLoop={documentsByLoop}
        libraryDocuments={libraryDocuments}
        attachmentCounts={attachmentCounts}
        presupuestosByLoop={presupuestosByLoop}
      />
    </div>
  );
}
