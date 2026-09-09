"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import FadeUp from "@/app/components/FadeUp";
import EmptyState from "./EmptyState";
import LoopSlideOver, { type CreateLoopPayload } from "./LoopSlideOver";
import { KIND_LABELS, OWNER_LABELS } from "@/lib/community/loop-defaults";
import type { OpenLoop } from "@/lib/types";

const SAVE_ERROR =
  "No se ha podido guardar el bucle. Revisa tu conexión e inténtalo de nuevo.";

interface Props {
  loops: OpenLoop[];
}

export default function Cockpit({ loops }: Props) {
  const router = useRouter();
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
        <FadeUp className="flex flex-col gap-2">
          {loops.map((loop) => (
            <div
              key={loop.id}
              className="rounded-lg border border-neutral-200 bg-white p-4"
            >
              <p className="text-sm font-semibold text-neutral-900">
                {loop.title}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {KIND_LABELS[loop.kind]} · {OWNER_LABELS[loop.owner]}
              </p>
            </div>
          ))}
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
