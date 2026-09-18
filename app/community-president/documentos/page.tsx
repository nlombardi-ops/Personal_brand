import DocumentUpload from "@/app/components/community/DocumentUpload";
import DocumentList from "@/app/components/community/DocumentList";
import { getDocuments } from "@/lib/community/documents-store";

// Server Component: reads the store directly at request time (the layout
// already gates the segment, so no AuthGuard here). Never static-import the
// seed JSON — that bakes in a build-time snapshot and uploaded documents
// would never appear (Phase 1 anti-pattern).
export default async function DocumentosPage() {
  const documents = (await getDocuments())
    .filter((d) => d.status !== "archived")
    // Newest first: ISO-8601 strings sort chronologically with a plain string
    // comparator, and V8's Array#sort is stable, so documents sharing an
    // identical uploaded_at keep the store's insertion order.
    .sort((a, b) => (a.uploaded_at < b.uploaded_at ? 1 : a.uploaded_at > b.uploaded_at ? -1 : 0));

  return (
    <div className="px-6 py-8 lg:px-8">
      <h1 className="text-[28px] font-semibold leading-[1.2] text-neutral-900">
        Documentos
      </h1>

      <div className="mt-6">
        <DocumentUpload />
      </div>

      <div className="mt-6">
        <DocumentList documents={documents} />
      </div>
    </div>
  );
}
