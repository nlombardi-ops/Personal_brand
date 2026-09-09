"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { addMonths, addWeeks, format } from "date-fns";
import {
  KIND_LABELS,
  OWNER_DETAIL_OWNERS,
  OWNER_LABELS,
  STATUS_LABELS,
} from "@/lib/community/loop-defaults";
import type {
  OpenLoop,
  OpenLoopKind,
  OpenLoopOwner,
  OpenLoopStatus,
} from "@/lib/types";

export interface CreateLoopPayload {
  title: string;
  kind: OpenLoopKind;
  next_action: string;
  owner: OpenLoopOwner;
  owner_detail?: string;
  status: OpenLoopStatus;
  due: string | null;
}

// A PATCH body — only the fields the user actually changed in edit mode.
export type LoopPatch = Partial<CreateLoopPayload>;

interface Props {
  open: boolean;
  // null → create mode ("Nuevo bucle"); a loop → edit mode ("Editar bucle").
  editingLoop: OpenLoop | null;
  pending: boolean;
  saveError: string | null;
  onClose: () => void;
  onCreate: (payload: CreateLoopPayload) => void;
  onSave: (patch: LoopPatch) => void;
  onDiscard: () => void;
}

interface FormState {
  title: string;
  kind: OpenLoopKind | "";
  nextAction: string;
  owner: OpenLoopOwner;
  ownerDetail: string;
  status: OpenLoopStatus;
  due: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  kind: "",
  nextAction: "",
  owner: "me",
  ownerDetail: "",
  status: "open",
  due: "",
};

function formFromLoop(loop: OpenLoop | null): FormState {
  if (!loop) return EMPTY_FORM;
  return {
    title: loop.title,
    kind: loop.kind,
    nextAction: loop.next_action,
    owner: loop.owner,
    ownerDetail: loop.owner_detail ?? "",
    status: loop.status,
    due: loop.due ?? "",
  };
}

const KIND_ENTRIES = Object.entries(KIND_LABELS) as [OpenLoopKind, string][];
const OWNER_ENTRIES = Object.entries(OWNER_LABELS) as [OpenLoopOwner, string][];
const STATUS_ENTRIES = Object.entries(STATUS_LABELS) as [
  OpenLoopStatus,
  string,
][];

const fieldClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400";
const labelClass = "text-xs font-semibold text-neutral-700";

export default function LoopSlideOver({
  open,
  editingLoop,
  pending,
  saveError,
  onClose,
  onCreate,
  onSave,
  onDiscard,
}: Props) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const formId = useId();

  const mode: "create" | "edit" = editingLoop ? "edit" : "create";

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState(false);
  // Re-key on the open/target transition (render-phase state adjustment, the
  // idiomatic React pattern — no effect, no cascading-render lint warning).
  const formKey = open ? (editingLoop?.id ?? "create") : "closed";
  const [prevKey, setPrevKey] = useState(formKey);
  if (formKey !== prevKey) {
    setPrevKey(formKey);
    if (open) {
      setForm(formFromLoop(editingLoop));
      setFieldError(null);
      setDiscarding(false);
    }
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // DOM focus management (external system — an effect is correct here).
  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      const t = window.setTimeout(() => {
        panelRef.current
          ?.querySelector<HTMLElement>("input, select, textarea, button")
          ?.focus();
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

  const showOwnerDetail = OWNER_DETAIL_OWNERS.includes(form.owner);

  function buildPatch(loop: OpenLoop): LoopPatch {
    const patch: LoopPatch = {};
    const title = form.title.trim();
    if (title !== loop.title) patch.title = title;
    if (form.kind && form.kind !== loop.kind) patch.kind = form.kind;
    const nextAction = form.nextAction.trim();
    if (nextAction !== loop.next_action) patch.next_action = nextAction;
    if (form.owner !== loop.owner) patch.owner = form.owner;
    const ownerDetail =
      showOwnerDetail && form.ownerDetail.trim() ? form.ownerDetail.trim() : "";
    if (ownerDetail !== (loop.owner_detail ?? "")) patch.owner_detail = ownerDetail;
    if (form.status !== loop.status) patch.status = form.status;
    const due = form.due || null;
    if (due !== (loop.due ?? null)) patch.due = due;
    return patch;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return setFieldError("Añade un título");
    if (!form.kind) return setFieldError("Elige un tipo");
    if (!form.nextAction.trim()) return setFieldError("Indica la próxima acción");
    setFieldError(null);

    if (mode === "edit" && editingLoop) {
      onSave(buildPatch(editingLoop));
      return;
    }

    onCreate({
      title: form.title.trim(),
      kind: form.kind,
      next_action: form.nextAction.trim(),
      owner: form.owner,
      owner_detail:
        showOwnerDetail && form.ownerDetail.trim()
          ? form.ownerDetail.trim()
          : undefined,
      status: form.status,
      due: form.due || null,
    });
  }

  const today = new Date();
  const presets: [string, string][] = [
    ["En 1 semana", format(addWeeks(today, 1), "yyyy-MM-dd")],
    ["En 2 semanas", format(addWeeks(today, 2), "yyyy-MM-dd")],
    ["En 1 mes", format(addMonths(today, 1), "yyyy-MM-dd")],
  ];

  const panelTitle = mode === "edit" ? "Editar bucle" : "Nuevo bucle";
  const primaryLabel =
    mode === "edit"
      ? pending
        ? "Guardando…"
        : "Guardar cambios"
      : pending
        ? "Creando…"
        : "Crear bucle";

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
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={panelTitle}
            className="fixed right-0 top-0 z-50 flex h-full w-[calc(100vw-32px)] flex-col border-l border-neutral-200 bg-white shadow-xl md:w-[420px]"
            initial={{ x: reduce ? 0 : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: reduce ? 0 : "100%" }}
            transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h2 className="text-xl font-semibold text-neutral-900">
                {panelTitle}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="rounded-md p-1 text-neutral-500 transition-colors hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172a]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* min-h-0 lets the form body scroll inside the flex column so the
                pinned footer stays reachable with the mobile keyboard open. */}
            <form
              id={formId}
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5"
            >
              <label className="flex flex-col gap-1">
                <span className={labelClass}>Título</span>
                <input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  maxLength={200}
                  className={fieldClass}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className={labelClass}>Tipo</span>
                <select
                  value={form.kind}
                  onChange={(e) =>
                    set("kind", e.target.value as OpenLoopKind | "")
                  }
                  className={fieldClass}
                >
                  <option value="">Selecciona…</option>
                  {KIND_ENTRIES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className={labelClass}>Próxima acción</span>
                <textarea
                  value={form.nextAction}
                  onChange={(e) => set("nextAction", e.target.value)}
                  rows={3}
                  maxLength={2000}
                  className={`${fieldClass} resize-none`}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className={labelClass}>Responsable</span>
                <select
                  value={form.owner}
                  onChange={(e) =>
                    set("owner", e.target.value as OpenLoopOwner)
                  }
                  className={fieldClass}
                >
                  {OWNER_ENTRIES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              {showOwnerDetail && (
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Detalle del responsable</span>
                  <input
                    value={form.ownerDetail}
                    onChange={(e) => set("ownerDetail", e.target.value)}
                    maxLength={200}
                    className={fieldClass}
                  />
                </label>
              )}

              <label className="flex flex-col gap-1">
                <span className={labelClass}>Estado</span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    set("status", e.target.value as OpenLoopStatus)
                  }
                  className={fieldClass}
                >
                  {STATUS_ENTRIES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col gap-2">
                <span className={labelClass}>Fecha objetivo</span>
                <div className="flex flex-wrap gap-2">
                  {presets.map(([label, value]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => set("due", value)}
                      className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                        form.due === value
                          ? "border-neutral-400 bg-neutral-100 text-neutral-900"
                          : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => set("due", "")}
                    className="rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600 transition-colors hover:border-neutral-300"
                  >
                    Sin fecha
                  </button>
                </div>
                <input
                  type="date"
                  value={form.due}
                  onChange={(e) => set("due", e.target.value)}
                  className={fieldClass}
                />
              </div>

              {fieldError && (
                <p className="text-xs font-semibold text-[#b91c1c]">
                  {fieldError}
                </p>
              )}
              {saveError && (
                <p className="text-xs font-semibold text-[#b91c1c]">
                  {saveError}
                </p>
              )}
            </form>

            <div className="border-t border-neutral-200 px-5 py-4">
              {discarding ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-neutral-700">
                    ¿Descartar este bucle? Dejará de aparecer en el panel.
                  </p>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setDiscarding(false)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={onDiscard}
                      disabled={pending}
                      className="rounded-lg bg-[#b91c1c] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#991b1b] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c] focus-visible:ring-offset-2"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    {mode === "edit" && (
                      <button
                        type="button"
                        onClick={() => setDiscarding(true)}
                        className="rounded-md text-sm font-medium text-[#b91c1c] transition-colors hover:text-[#991b1b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c]"
                      >
                        Descartar bucle
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      form={formId}
                      disabled={pending}
                      className="rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1e293b] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172a] focus-visible:ring-offset-2"
                    >
                      {primaryLabel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
