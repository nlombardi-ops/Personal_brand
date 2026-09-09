"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import FadeUp from "@/app/components/FadeUp";
import EmptyState from "./EmptyState";
import LoopColumn, { type QuickState } from "./LoopColumn";
import NoDateSection from "./NoDateSection";
import type { QuickActionKey } from "./QuickActions";
import LoopSlideOver, {
  type CreateLoopPayload,
  type LoopPatch,
} from "./LoopSlideOver";
import CountStrip from "./CountStrip";
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
  // null → the slide-over opens in create mode; a loop → edit mode.
  const [editingLoop, setEditingLoop] = useState<OpenLoop | null>(null);
  // Per-card quick-action state keyed by loop id — two cards never share one
  // spinner, and the rest of the board stays interactive during a mutation.
  const [quickState, setQuickState] = useState<QuickState>({});

  function openSlideOver() {
    setEditingLoop(null);
    setSaveError(null);
    setSlideOverOpen(true);
  }

  function openEdit(loop: OpenLoop) {
    setEditingLoop(loop);
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

  async function patchEditingLoop(body: LoopPatch | { status: "dropped" }) {
    if (!editingLoop) return;
    setPending(true);
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/community/open-loops/${editingLoop.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        setSaveError(SAVE_ERROR);
        return;
      }
      router.refresh();
      setSlideOverOpen(false);
      setEditingLoop(null);
    } catch {
      setSaveError(SAVE_ERROR);
    } finally {
      setPending(false);
    }
  }

  function handleSave(patch: LoopPatch) {
    void patchEditingLoop(patch);
  }

  function handleDiscard() {
    void patchEditingLoop({ status: "dropped" });
  }

  // Cockpit owns the per-card quick-action state; QuickActions performs the
  // PATCH + router.refresh() and reports the transitions back here so the
  // spinner and error notice stay isolated to the tapped card.
  function quickStart(loopId: string, key: QuickActionKey) {
    setQuickState((m) => ({
      ...m,
      [loopId]: { pendingAction: key, error: false },
    }));
  }

  function quickSettle(loopId: string, ok: boolean) {
    setQuickState((m) => ({
      ...m,
      [loopId]: { pendingAction: null, error: !ok },
    }));
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between">
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
        {/* D-17: at-a-glance state directly under the title, before the board.
            Not shown on the zero-loops first-run state. */}
        {loops.length > 0 && (
          <CountStrip counts={grouped.counts} className="mt-2" />
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
              onOpen={openEdit}
              quickState={quickState}
              onQuickStart={quickStart}
              onQuickSettle={quickSettle}
            />
            <LoopColumn
              title="Vencen pronto"
              tone="dueSoon"
              loops={grouped.dueSoon}
              emptyCopy="Nada vence en los próximos 14 días"
              onOpen={openEdit}
              quickState={quickState}
              onQuickStart={quickStart}
              onQuickSettle={quickSettle}
            />
            <LoopColumn
              title="A la espera de otros"
              tone="waiting"
              loops={grouped.waiting}
              emptyCopy="No estás esperando a nadie"
              onOpen={openEdit}
              quickState={quickState}
              onQuickStart={quickStart}
              onQuickSettle={quickSettle}
            />
          </div>
          <NoDateSection
            loops={grouped.noDate}
            onOpen={openEdit}
            quickState={quickState}
            onQuickStart={quickStart}
            onQuickSettle={quickSettle}
          />
        </FadeUp>
      )}

      <LoopSlideOver
        open={slideOverOpen}
        editingLoop={editingLoop}
        pending={pending}
        saveError={saveError}
        onClose={closeSlideOver}
        onCreate={handleCreate}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </>
  );
}
