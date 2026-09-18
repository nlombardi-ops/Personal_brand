import DocumentUpload from "@/app/components/community/DocumentUpload";
import DocumentList from "@/app/components/community/DocumentList";
import { getDocuments } from "@/lib/community/documents-store";
import { getOpenLoops } from "@/lib/community/open-loops-store";

// Server Component: reads the store directly at request time (the layout
// already gates the segment, so no AuthGuard here). Never static-import the
// seed JSON — that bakes in a build-time snapshot and uploaded documents
// would never appear (Phase 1 anti-pattern).
export default async function DocumentosPage() {
  const [rawDocuments, loops] = await Promise.all([
    getDocuments(),
    getOpenLoops(),
  ]);
  const documents = rawDocuments
    .filter((d) => d.status !== "archived")
    // Newest first: ISO-8601 strings sort chronologically with a plain string
    // comparator, and V8's Array#sort is stable, so documents sharing an
    // identical uploaded_at keep the store's insertion order.
    .sort((a, b) => (a.uploaded_at < b.uploaded_at ? 1 : a.uploaded_at > b.uploaded_at ? -1 : 0));

  // T-02-19: only the fields the assignment control needs — never ship the
  // full OpenLoop (its Phase 3 LPH fields never reach this surface).
  const loopSummaries = loops.map((loop) => ({
    id: loop.id,
    title: loop.title,
    kind: loop.kind,
    status: loop.status,
  }));

  return (
    <div className="px-6 py-8 lg:px-8">
      <h1 className="text-[28px] font-semibold leading-[1.2] text-neutral-900">
        Documentos
      </h1>

      <div className="mt-6">
        <DocumentUpload />
      </div>

      <div className="mt-6">
        <DocumentList documents={documents} loops={loopSummaries} />
      </div>
    </div>
  );
}
