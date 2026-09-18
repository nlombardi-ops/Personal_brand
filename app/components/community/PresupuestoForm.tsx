"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_IVA_PCT,
  computeTotalCents,
  formatEuros,
  parseEurosToCents,
} from "@/lib/community/presupuesto-defaults";
import { DOCUMENT_TYPE_LABELS } from "@/lib/community/document-defaults";
import type { Document } from "@/lib/types";

const SAVE_ERROR =
  "No se ha podido guardar el presupuesto. Revisa tu conexión e inténtalo de nuevo.";
const BASE_ERROR = "Introduce un importe válido, por ejemplo 1.234,56";

interface Props {
  loopId: string;
  documents: Document[];
  onSettle?: (ok: boolean) => void;
}

interface FormState {
  provider: string;
  baseRaw: string;
  ivaPct: number;
  scope: string;
  receivedAt: string;
  validUntil: string;
  documentId: string;
}

const EMPTY_FORM: FormState = {
  provider: "",
  baseRaw: "",
  ivaPct: DEFAULT_IVA_PCT,
  scope: "",
  receivedAt: "",
  validUntil: "",
  documentId: "",
};

const fieldClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400";
const labelClass = "text-xs font-semibold text-neutral-700";

// D-13: the picker sorts presupuesto-typed documents first — the same
// convention AttachDocumentControl uses for its library picker. Selecting one
// here does not change that document's type.
function sortDocuments(documents: Document[]): Document[] {
  return [...documents]
    .filter((d) => d.status !== "archived")
    .sort((a, b) => {
      if (a.type === "presupuesto" && b.type !== "presupuesto") return -1;
      if (b.type === "presupuesto" && a.type !== "presupuesto") return 1;
      return a.uploaded_at < b.uploaded_at ? 1 : a.uploaded_at > b.uploaded_at ? -1 : 0;
    });
}

// Its own form element — a sibling of everything else in the detail panel,
// never nested inside another form.
export default function PresupuestoForm({ loopId, documents, onSettle }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const pickable = sortDocuments(documents);

  // A live preview only — the server computes and stores the authoritative
  // total; if the two ever disagree, the server wins.
  const previewCents = parseEurosToCents(form.baseRaw);
  const previewTotal =
    previewCents !== null ? computeTotalCents(previewCents, form.ivaPct) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.provider.trim()) {
      setFieldError("Añade el proveedor");
      return;
    }
    const baseCents = parseEurosToCents(form.baseRaw);
    if (baseCents === null) {
      setFieldError(BASE_ERROR);
      return;
    }
    setFieldError(null);
    setSaveError(null);
    setPending(true);
    try {
      const res = await fetch("/api/community/presupuestos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loop_id: loopId,
          provider: form.provider.trim(),
          base_imponible_cents: baseCents,
          iva_pct: form.ivaPct,
          scope: form.scope,
          received_at: form.receivedAt || null,
          valid_until: form.validUntil || null,
          document_id: form.documentId || null,
        }),
      });
      if (!res.ok) {
        setSaveError(SAVE_ERROR);
        onSettle?.(false);
        return;
      }
      router.refresh();
      setForm(EMPTY_FORM);
      onSettle?.(true);
    } catch {
      setSaveError(SAVE_ERROR);
      onSettle?.(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Proveedor</span>
        <input
          value={form.provider}
          onChange={(e) => set("provider", e.target.value)}
          maxLength={160}
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Base imponible (€)</span>
        <input
          value={form.baseRaw}
          onChange={(e) => set("baseRaw", e.target.value)}
          placeholder="1.234,56"
          inputMode="decimal"
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>IVA (%)</span>
        <input
          type="number"
          value={form.ivaPct}
          onChange={(e) => set("ivaPct", Number(e.target.value))}
          min={0}
          max={100}
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Alcance</span>
        <textarea
          value={form.scope}
          onChange={(e) => set("scope", e.target.value)}
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
            value={form.receivedAt}
            onChange={(e) => set("receivedAt", e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Válido hasta</span>
          <input
            type="date"
            value={form.validUntil}
            onChange={(e) => set("validUntil", e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className={labelClass}>Documento</span>
        <select
          value={form.documentId}
          onChange={(e) => set("documentId", e.target.value)}
          className={fieldClass}
        >
          <option value="">Sin documento vinculado</option>
          {pickable.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title} — {DOCUMENT_TYPE_LABELS[doc.type]}
            </option>
          ))}
        </select>
      </label>

      <p className="font-mono text-sm tabular-nums text-neutral-700">
        Total: {previewTotal !== null ? `${formatEuros(previewTotal)} €` : "—"}
      </p>

      {fieldError && (
        <p className="text-xs font-semibold text-[#b91c1c]">{fieldError}</p>
      )}
      {saveError && (
        <p className="text-xs font-semibold text-[#b91c1c]">{saveError}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1e293b] disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Añadir presupuesto"}
        </button>
      </div>
    </form>
  );
}
