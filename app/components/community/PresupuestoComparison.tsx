"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  comparePresupuestos,
  type PresupuestoSortKey,
} from "@/lib/community/presupuesto-compare";
import { formatEuros } from "@/lib/community/presupuesto-defaults";
import type { Document, Presupuesto } from "@/lib/types";

interface Props {
  presupuestos: Presupuesto[];
  // The library, to resolve document_id -> title/status for the "Documento" row.
  documents: Document[];
}

interface RowSpec {
  key: string;
  label: string;
}

// D-18: attributes down the rows, one quote per column, in this fixed order.
const ROWS: RowSpec[] = [
  { key: "provider", label: "Proveedor" },
  { key: "base", label: "Base imponible" },
  { key: "iva", label: "IVA %" },
  { key: "total", label: "Total" },
  { key: "scope", label: "Alcance" },
  { key: "received_at", label: "Recibido" },
  { key: "valid_until", label: "Válido hasta" },
  { key: "document", label: "Documento" },
];

function formatYmd(ymd: string | null | undefined): string {
  if (!ymd) return "—";
  try {
    return format(new Date(ymd), "d MMM yyyy");
  } catch {
    return "—";
  }
}

// D-19: the cheapest-total column is a reading aid only — no ranking badge,
// no call to action of any kind. Compare-only: the outcome of a quote round
// is recorded on the loop's next_action and status, never here (D-11).
export default function PresupuestoComparison({ presupuestos, documents }: Props) {
  const [sortKey, setSortKey] = useState<PresupuestoSortKey>("total");
  // Pure module, re-called on every render — there is no derived state to
  // keep in sync with a sort-key change.
  const { cheapestId, order } = comparePresupuestos(presupuestos, sortKey);
  const byId = new Map(presupuestos.map((p) => [p.id, p]));
  const docsById = new Map(documents.map((d) => [d.id, d]));

  if (order.length === 0) {
    return (
      <p className="mt-2 text-sm text-neutral-600">
        Aún no hay presupuestos que comparar.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <div className="mb-2 flex gap-2">
        <button
          type="button"
          onClick={() => setSortKey("total")}
          className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
            sortKey === "total"
              ? "border-neutral-400 bg-neutral-100 text-neutral-900"
              : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
          }`}
        >
          Por total
        </button>
        <button
          type="button"
          onClick={() => setSortKey("received_at")}
          className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
            sortKey === "received_at"
              ? "border-neutral-400 bg-neutral-100 text-neutral-900"
              : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
          }`}
        >
          Por fecha
        </button>
      </div>

      {/* Scrolls inside its OWN container — the detail panel body and the
          page never scroll sideways at any viewport width (Phase 1 mobile
          rule, RESEARCH Pitfall 6). */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="min-w-full border-collapse text-sm">
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-b border-neutral-100 last:border-b-0">
                <th className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2 text-left text-xs font-semibold text-neutral-500">
                  {row.label}
                </th>
                {order.map((entry) => {
                  const p = byId.get(entry.id);
                  if (!p) return <td key={entry.id} className="px-3 py-2" />;
                  const isCheapest = entry.id === cheapestId;
                  const cellClass = `px-3 py-2 align-top ${
                    isCheapest ? "border-x-2 border-[#0f172a] bg-neutral-50" : ""
                  }`;
                  const linkedDoc = p.document_id ? docsById.get(p.document_id) : undefined;

                  return (
                    <td key={entry.id} className={cellClass}>
                      {row.key === "provider" && (
                        <span className="text-neutral-900">{p.provider}</span>
                      )}
                      {row.key === "base" && (
                        <span className="font-mono tabular-nums text-neutral-900">
                          {formatEuros(p.base_imponible_cents)} €
                        </span>
                      )}
                      {row.key === "iva" && (
                        <span className="font-mono tabular-nums text-neutral-900">
                          {p.iva_pct}%
                        </span>
                      )}
                      {row.key === "total" && (
                        <div className="flex flex-col gap-0.5">
                          {isCheapest && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#0f172a]">
                              Más barato
                            </span>
                          )}
                          <span className="font-mono tabular-nums text-neutral-900">
                            {formatEuros(entry.total_cents)} €
                          </span>
                          {entry.delta_cents > 0 && (
                            <span className="font-mono text-xs tabular-nums text-neutral-500">
                              +{formatEuros(entry.delta_cents)} €
                            </span>
                          )}
                        </div>
                      )}
                      {row.key === "scope" && (
                        <p className="max-w-[220px] overflow-hidden whitespace-pre-wrap break-words text-xs text-neutral-700">
                          {p.scope}
                        </p>
                      )}
                      {row.key === "received_at" && (
                        <span className="font-mono text-xs tabular-nums text-neutral-700">
                          {formatYmd(p.received_at)}
                        </span>
                      )}
                      {row.key === "valid_until" && (
                        <span className="font-mono text-xs tabular-nums text-neutral-700">
                          {formatYmd(p.valid_until)}
                        </span>
                      )}
                      {row.key === "document" &&
                        (linkedDoc && linkedDoc.status !== "archived" ? (
                          <a
                            href={`/api/community/documents/${linkedDoc.id}/file`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-[#0f172a] underline underline-offset-2 hover:text-[#1e293b]"
                          >
                            Ver
                          </a>
                        ) : (
                          <span className="text-xs text-neutral-500">—</span>
                        ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
