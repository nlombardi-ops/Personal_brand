"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { KIND_LABELS, STATUS_LABELS } from "@/lib/community/loop-defaults";
import { formatRelativeDue } from "@/lib/community/relative-date";
import { formatEuros, parseEurosToCents } from "@/lib/community/presupuesto-defaults";
import { DOCUMENT_TYPE_LABELS } from "@/lib/community/document-defaults";
import type { Document, OpenLoop, Presupuesto } from "@/lib/types";
import AttachDocumentControl from "./AttachDocumentControl";
import PresupuestoForm from "./PresupuestoForm";
import PresupuestoComparison from "./PresupuestoComparison";

const PRESUPUESTO_SAVE_ERROR =
  "No se ha podido guardar el presupuesto. Revisa tu conexión e inténtalo de nuevo.";

interface PresupuestoEditForm {
  provider: string;
  baseRaw: string;
  ivaPct: number;
  scope: string;
  receivedAt: string;
  validUntil: string;
  documentId: string;
}

function editFormFromPresupuesto(p: Presupuesto): PresupuestoEditForm {
  return {
    provider: p.provider,
    baseRaw: (p.base_imponible_cents / 100).toFixed(2).replace(".", ","),
    ivaPct: p.iva_pct,
    scope: p.scope,
    receivedAt: p.received_at ?? "",
    validUntil: p.valid_until ?? "",
    documentId: p.document_id ?? "",
  };
}

interface Props {
  open: boolean;
  loop: OpenLoop | null;
  // Already resolved (non-archived, newest-first) attachments for this loop —
  // documentsForLoop runs server-side, in page.tsx, for first paint.
  documents: Document[];
  libraryDocuments: Document[];
  // Slice 3: this loop's non-archived presupuestos, resolved server-side in
  // page.tsx. Only meaningful when loop.kind === "obra" (D-10).
  presupuestos: Presupuesto[];
  onClose: () => void;
  onEdit: (loop: OpenLoop) => void;
}

const chipClass =
  "inline-flex items-center border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600";
const sectionLabelClass =
  "text-xs font-semibold uppercase tracking-wide text-neutral-500";
const fieldClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400";
const labelClass = "text-xs font-semibold text-neutral-700";

// D-17 "detail mode": a SEPARATE component from LoopSlideOver, sharing only
// the framer-motion wrapper (RESEARCH A4). LoopSlideOver is a tight form
// state machine; this panel is read-oriented, materially wider on desktop,
// and hosts sibling controls — never a wrapping form element (a form nested
// inside another form is invalid HTML, the same class of mistake as the
// Phase 1 button-inside-button rework).
export default function LoopDetailPanel({
  open,
  loop,
  documents,
  libraryDocuments,
  presupuestos,
  onClose,
  onEdit,
}: Props) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [addingPresupuesto, setAddingPresupuesto] = useState(false);
  const [editingPresupuestoId, setEditingPresupuestoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PresupuestoEditForm | null>(null);
  const [archivingPresupuestoId, setArchivingPresupuestoId] = useState<string | null>(null);
  // Keyed by presupuesto id so one row's spinner/error never blocks another.
  const [presupuestoPending, setPresupuestoPending] = useState<Record<string, boolean>>({});
  const [presupuestoError, setPresupuestoError] = useState<Record<string, string | null>>({});

  // DOM focus management (external system — an effect is correct here).
  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      const t = window.setTimeout(() => {
        panelRef.current?.querySelector<HTMLElement>("a[href], button")?.focus();
      }, 0);
      return () => window.clearTimeout(t);
    }
    restoreFocusRef.current?.focus?.();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  function startEditPresupuesto(p: Presupuesto) {
    setEditingPresupuestoId(p.id);
    setEditForm(editFormFromPresupuesto(p));
    setArchivingPresupuestoId(null);
  }

  function cancelEditPresupuesto() {
    setEditingPresupuestoId(null);
    setEditForm(null);
  }

  function setEditField<K extends keyof PresupuestoEditForm>(
    key: K,
    value: PresupuestoEditForm[K],
  ) {
    setEditForm((f) => (f ? { ...f, [key]: value } : f));
  }

  // The ONE mutation path for an existing presupuesto (PATCH the single
  // allow-listed endpoint) — edit and archive both funnel through here.
  async function patchPresupuesto(id: string, body: Record<string, unknown>) {
    setPresupuestoPending((m) => ({ ...m, [id]: true }));
    setPresupuestoError((m) => ({ ...m, [id]: null }));
    try {
      const res = await fetch(`/api/community/presupuestos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setPresupuestoError((m) => ({ ...m, [id]: PRESUPUESTO_SAVE_ERROR }));
        return;
      }
      router.refresh();
    } catch {
      setPresupuestoError((m) => ({ ...m, [id]: PRESUPUESTO_SAVE_ERROR }));
    } finally {
      setPresupuestoPending((m) => ({ ...m, [id]: false }));
    }
  }

  function submitEditPresupuesto(e: React.FormEvent, id: string) {
    e.preventDefault();
    if (!editForm) return;
    if (!editForm.provider.trim()) {
      setPresupuestoError((m) => ({ ...m, [id]: "Añade el proveedor" }));
      return;
    }
    const baseCents = parseEurosToCents(editForm.baseRaw);
    if (baseCents === null) {
      setPresupuestoError((m) => ({
        ...m,
        [id]: "Introduce un importe válido, por ejemplo 1.234,56",
      }));
      return;
    }
    void patchPresupuesto(id, {
      provider: editForm.provider.trim(),
      base_imponible_cents: baseCents,
      iva_pct: editForm.ivaPct,
      scope: editForm.scope,
      received_at: editForm.receivedAt || null,
      valid_until: editForm.validUntil || null,
      document_id: editForm.documentId || null,
    });
    setEditingPresupuestoId(null);
    setEditForm(null);
  }

  function archivePresupuesto(id: string) {
    setArchivingPresupuestoId(null);
    // Kept, only hidden — the record stays in the store with an archived
    // status, never removed.
    void patchPresupuesto(id, { status: "archived" });
  }

  if (!loop) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-[rgba(10,10,10,0.2)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.15 }}
            onClick={onClose}
          />
          {/* D-17: widens toward full-width on desktop (materially wider than
              the 420px quick-edit slide-over), a narrower mobile inset than
              the quick panel so a phone screen signals a different mode. */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={loop.title}
            className="fixed right-0 top-0 z-50 flex h-full w-[calc(100vw-16px)] flex-col border-l border-neutral-200 bg-white shadow-xl md:w-[680px] lg:w-[880px]"
            initial={{ x: reduce ? 0 : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: reduce ? 0 : "100%" }}
            transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold text-neutral-900">
                  {loop.title}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={chipClass}>{KIND_LABELS[loop.kind]}</span>
                  <span className={chipClass}>{STATUS_LABELS[loop.status]}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(loop)}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="rounded-md p-1 text-neutral-500 transition-colors hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172a]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* min-h-0 lets the body scroll inside the flex column so wide
                content never scrolls the page body — Phase 1 learned that
                flex-1 overflow-y-auto without min-h-0 pushes content
                off-screen with the mobile keyboard open. */}
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
              <section>
                <h3 className={sectionLabelClass}>Próximo paso</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-900">
                  {loop.next_action}
                </p>
                {loop.due ? (
                  <p className="mt-1 font-mono text-xs tabular-nums text-neutral-600">
                    {formatRelativeDue(loop.due)}
                  </p>
                ) : null}
              </section>

              <section>
                <h3 className={sectionLabelClass}>Documentos</h3>
                {documents.length === 0 && (
                  <p className="mt-2 text-sm text-neutral-600">
                    Este bucle no tiene documentos adjuntos.
                  </p>
                )}
                <div className="mt-3">
                  <AttachDocumentControl
                    loopId={loop.id}
                    attached={documents}
                    library={libraryDocuments}
                  />
                </div>
              </section>

              {/* Slice 3, D-10: presupuestos are gated on the loop's kind, not
                  hidden with CSS — a non-obra loop's DOM contains no
                  presupuesto markup at all. Compare-only: the outcome of a
                  quote round is recorded on the loop's next_action and
                  status, never here (D-11). */}
              {loop.kind === "obra" && (
                <section>
                  <h3 className={sectionLabelClass}>Presupuestos</h3>
                  {presupuestos.length > 0 && (
                    <PresupuestoComparison
                      presupuestos={presupuestos}
                      documents={libraryDocuments}
                    />
                  )}
                  {presupuestos.length === 0 ? (
                    <p className="mt-2 text-sm text-neutral-600">
                      Aún no has registrado ningún presupuesto.
                    </p>
                  ) : (
                    <ul className="mt-3 flex flex-col gap-2">
                      {presupuestos.map((p) => {
                        const pending = presupuestoPending[p.id] ?? false;
                        const rowError = presupuestoError[p.id];
                        const isEditing = editingPresupuestoId === p.id && editForm;
                        const isArchiving = archivingPresupuestoId === p.id;

                        return (
                          <li
                            key={p.id}
                            className="rounded-lg border border-neutral-200 bg-white p-3"
                            aria-busy={pending}
                          >
                            {isEditing && editForm ? (
                              <form
                                onSubmit={(e) => submitEditPresupuesto(e, p.id)}
                                className="flex flex-col gap-3"
                              >
                                <label className="flex flex-col gap-1">
                                  <span className={labelClass}>Proveedor</span>
                                  <input
                                    value={editForm.provider}
                                    onChange={(e) => setEditField("provider", e.target.value)}
                                    maxLength={160}
                                    className={fieldClass}
                                  />
                                </label>
                                <label className="flex flex-col gap-1">
                                  <span className={labelClass}>Base imponible (€)</span>
                                  <input
                                    value={editForm.baseRaw}
                                    onChange={(e) => setEditField("baseRaw", e.target.value)}
                                    className={fieldClass}
                                  />
                                </label>
                                <label className="flex flex-col gap-1">
                                  <span className={labelClass}>IVA (%)</span>
                                  <input
                                    type="number"
                                    value={editForm.ivaPct}
                                    onChange={(e) =>
                                      setEditField("ivaPct", Number(e.target.value))
                                    }
                                    min={0}
                                    max={100}
                                    className={fieldClass}
                                  />
                                </label>
                                <label className="flex flex-col gap-1">
                                  <span className={labelClass}>Alcance</span>
                                  <textarea
                                    value={editForm.scope}
                                    onChange={(e) => setEditField("scope", e.target.value)}
                                    rows={3}
                                    maxLength={2000}
                                    className={`${fieldClass} resize-none`}
                                  />
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                  <label className="flex flex-col gap-1">
                                    <span className={labelClass}>Recibido el</span>
                                    <input
                                      type="date"
                                      value={editForm.receivedAt}
                                      onChange={(e) =>
                                        setEditField("receivedAt", e.target.value)
                                      }
                                      className={fieldClass}
                                    />
                                  </label>
                                  <label className="flex flex-col gap-1">
                                    <span className={labelClass}>Válido hasta</span>
                                    <input
                                      type="date"
                                      value={editForm.validUntil}
                                      onChange={(e) =>
                                        setEditField("validUntil", e.target.value)
                                      }
                                      className={fieldClass}
                                    />
                                  </label>
                                </div>
                                <label className="flex flex-col gap-1">
                                  <span className={labelClass}>Documento</span>
                                  <select
                                    value={editForm.documentId}
                                    onChange={(e) =>
                                      setEditField("documentId", e.target.value)
                                    }
                                    className={fieldClass}
                                  >
                                    <option value="">Sin documento vinculado</option>
                                    {libraryDocuments
                                      .filter((d) => d.status !== "archived")
                                      .map((d) => (
                                        <option key={d.id} value={d.id}>
                                          {d.title} — {DOCUMENT_TYPE_LABELS[d.type]}
                                        </option>
                                      ))}
                                  </select>
                                </label>
                                {rowError && (
                                  <p className="text-xs font-semibold text-[#b91c1c]">
                                    {rowError}
                                  </p>
                                )}
                                <div className="flex items-center justify-end gap-3">
                                  <button
                                    type="button"
                                    onClick={cancelEditPresupuesto}
                                    className="text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-900"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={pending}
                                    className="rounded-lg bg-[#0f172a] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1e293b] disabled:opacity-50"
                                  >
                                    Guardar
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="min-w-0 flex-1 truncate text-sm text-neutral-900">
                                    {p.provider}
                                  </span>
                                  <span className="font-mono text-sm tabular-nums text-neutral-700">
                                    {formatEuros(p.total_cents)} €
                                  </span>
                                  {p.received_at && (
                                    <span className="font-mono text-xs tabular-nums text-neutral-500">
                                      {p.received_at}
                                    </span>
                                  )}
                                </div>

                                {isArchiving ? (
                                  <div className="mt-2 flex flex-col gap-2">
                                    <p className="text-xs text-neutral-700">
                                      ¿Archivar este presupuesto? Se conserva; solo deja de
                                      aparecer en la lista y en la comparación.
                                    </p>
                                    <div className="flex items-center gap-3">
                                      <button
                                        type="button"
                                        onClick={() => setArchivingPresupuestoId(null)}
                                        className="text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-900"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        type="button"
                                        disabled={pending}
                                        onClick={() => archivePresupuesto(p.id)}
                                        className="rounded-lg bg-[#b91c1c] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#991b1b] disabled:opacity-50"
                                      >
                                        Archivar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-2 flex items-center gap-3">
                                    <button
                                      type="button"
                                      disabled={pending}
                                      onClick={() => startEditPresupuesto(p)}
                                      className="text-xs font-medium text-[#0f172a] transition-colors hover:text-[#1e293b] disabled:opacity-50"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      disabled={pending}
                                      onClick={() => setArchivingPresupuestoId(p.id)}
                                      className="text-xs font-medium text-[#b91c1c] transition-colors hover:text-[#991b1b] disabled:opacity-50"
                                    >
                                      Archivar
                                    </button>
                                  </div>
                                )}

                                {rowError && (
                                  <p className="mt-1 text-xs font-semibold text-[#b91c1c]">
                                    {rowError}
                                  </p>
                                )}
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="mt-3">
                    {addingPresupuesto ? (
                      <PresupuestoForm
                        loopId={loop.id}
                        documents={libraryDocuments}
                        onSettle={(ok) => {
                          if (ok) setAddingPresupuesto(false);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingPresupuesto(true)}
                        className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                      >
                        Añadir presupuesto
                      </button>
                    )}
                  </div>
                </section>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
