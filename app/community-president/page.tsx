import Cockpit from "@/app/components/community/Cockpit";
import { getOpenLoops } from "@/lib/community/open-loops-store";
import { getDocuments } from "@/lib/community/documents-store";
import { groupLoopsByUrgency } from "@/lib/community/urgency";
import { documentsForLoop } from "@/lib/community/document-defaults";
import type { Document } from "@/lib/types";

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
  const [loops, documents] = await Promise.all([
    getOpenLoops(),
    getDocuments(),
  ]);
  const grouped = groupLoopsByUrgency(loops);

  const documentsByLoop: Record<string, Document[]> = {};
  for (const loop of loops) {
    documentsByLoop[loop.id] = documentsForLoop(documents, loop.id);
  }

  // Library picker (AttachDocumentControl): every non-archived document,
  // newest-first. Linking a document to a loop never mutates its `type`.
  const libraryDocuments = documents
    .filter((doc) => doc.status !== "archived")
    .sort((a, b) =>
      a.uploaded_at < b.uploaded_at ? 1 : a.uploaded_at > b.uploaded_at ? -1 : 0,
    );

  return (
    <div className="px-6 py-8 lg:px-8">
      <Cockpit
        loops={loops}
        grouped={grouped}
        documentsByLoop={documentsByLoop}
        libraryDocuments={libraryDocuments}
      />
    </div>
  );
}
