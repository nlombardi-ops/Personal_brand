import { format } from "date-fns";
import DocumentUpload from "@/app/components/community/DocumentUpload";
import { getDocuments } from "@/lib/community/documents-store";

// Server Component: reads the store directly at request time (the layout
// already gates the segment, so no AuthGuard here). Never static-import the
// seed JSON — that bakes in a build-time snapshot and uploaded documents
// would never appear (Phase 1 anti-pattern).
//
// Task 1 renders a minimal inline list (title + upload date); Task 2 extracts
// this into DocumentList / DocumentRow with the "Ver" proxy link.
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
        {documents.length === 0 ? (
          <p className="text-sm text-neutral-600">
            Aún no has subido ningún documento.
          </p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm"
              >
                <p className="font-medium text-neutral-900">{doc.title}</p>
                <p className="text-xs text-neutral-500">
                  {format(new Date(doc.uploaded_at), "d MMM yyyy")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
