"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import FadeUp from "@/app/components/FadeUp";
import EmptyState from "./EmptyState";
import LoopColumn from "./LoopColumn";
import NoDateSection from "./NoDateSection";
import LoopSlideOver, { type CreateLoopPayload } from "./LoopSlideOver";
import type { GroupedLoops } from "@/lib/community/urgency";
import type { OpenLoop } from "@/lib/types";

const SAVE_ERROR =
  "No se ha podido guardar el bucle. Revisa tu conexión e inténtalo de nuevo.";

interface Props {
  loops: OpenLoop[];
  grouped: GroupedLoops;
}

export default function Cockpit({ loops, grouped }: Props) {
  const router = useRouter();
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Forward-wiring for D-16 card click → edit slide-over. Edit mode itself lands
  // in plan 03; the setter is called now so the board's onOpen contract is real.
  const [, setEditingLoop] = useState<OpenLoop | null>(null);

  function openSlideOver() {
    setSaveError(null);
    setSlideOverOpen(true);
  }

  function closeSlideOver() {
    if (pending) return;
    setSlideOverOpen(false);
  }

  async function handleCreate(payload: CreateLoopPayload) {
    setPending(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/community/open-loops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setSaveError(SAVE_ERROR);
        return;
      }
      router.refresh();
      setSlideOverOpen(false);
    } catch {
      setSaveError(SAVE_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-[28px] font-semibold leading-[1.2] text-neutral-900">
          Bucles abiertos
        </h1>
        {loops.length > 0 && (
          <button
            type="button"
            onClick={openSlideOver}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1e293b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172a] focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Añadir bucle
          </button>
        )}
      </div>

      {loops.length === 0 ? (
        <EmptyState onAdd={openSlideOver} />
      ) : (
        <FadeUp>
          {/* Column order is load-bearing: Vencidos top-left is the UI-SPEC
              primary focal point. Read-only board — no drag-and-drop (D-14). */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <LoopColumn
              title="Vencidos"
              tone="overdue"
              loops={grouped.overdue}
              emptyCopy="Nada vencido"
              onOpen={setEditingLoop}
            />
            <LoopColumn
              title="Vencen pronto"
              tone="dueSoon"
              loops={grouped.dueSoon}
              emptyCopy="Nada vence en los próximos 14 días"
              onOpen={setEditingLoop}
            />
            <LoopColumn
              title="A la espera de otros"
              tone="waiting"
              loops={grouped.waiting}
              emptyCopy="No estás esperando a nadie"
              onOpen={setEditingLoop}
            />
          </div>
          <NoDateSection loops={grouped.noDate} onOpen={setEditingLoop} />
        </FadeUp>
      )}

      <LoopSlideOver
        open={slideOverOpen}
        pending={pending}
        saveError={saveError}
        onClose={closeSlideOver}
        onCreate={handleCreate}
      />
    </>
  );
}
