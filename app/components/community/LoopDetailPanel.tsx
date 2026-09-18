"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { KIND_LABELS, STATUS_LABELS } from "@/lib/community/loop-defaults";
import { formatRelativeDue } from "@/lib/community/relative-date";
import type { Document, OpenLoop } from "@/lib/types";
import AttachDocumentControl from "./AttachDocumentControl";

interface Props {
  open: boolean;
  loop: OpenLoop | null;
  // Already resolved (non-archived, newest-first) attachments for this loop —
  // documentsForLoop runs server-side, in page.tsx, for first paint.
  documents: Document[];
  libraryDocuments: Document[];
  onClose: () => void;
  onEdit: (loop: OpenLoop) => void;
}

const chipClass =
  "inline-flex items-center border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600";
const sectionLabelClass =
  "text-xs font-semibold uppercase tracking-wide text-neutral-500";

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
  onClose,
  onEdit,
}: Props) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

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

              {/* Slice 3 inserts the obra-only presupuesto section HERE, as a
                  sibling section — never nested inside this one or inside a
                  form element. */}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
