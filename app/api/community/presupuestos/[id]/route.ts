import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/community/require-auth";
import { getPresupuestos, savePresupuestos } from "@/lib/community/presupuestos-store";
import { getDocuments } from "@/lib/community/documents-store";
import {
  applyPresupuestoPatch,
  validatePresupuestoInput,
} from "@/lib/community/presupuesto-defaults";

// Only PATCH is exported. Next returns 405 for every other verb automatically,
// and there is deliberately NO removal endpoint on this resource: retiring a
// quote is a status change to archived (D-06), not a deletion. This id-scoped
// route is the ONLY mutation path for an existing presupuesto, so every write
// re-runs the same validator, the same frozen-key overlay and the same
// unconditional total recompute — there is nowhere to bypass the caps or to
// inject a total.
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Non-create mode: every supplied field is re-checked against the same
  // caps and enum allow-lists as create — an edit is not a way around them.
  const invalid = validatePresupuestoInput(body, { create: false });
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  const patch = body as Record<string, unknown>;

  if (
    Object.prototype.hasOwnProperty.call(patch, "document_id") &&
    patch.document_id
  ) {
    const documents = await getDocuments();
    const doc = documents.find((d) => d.id === patch.document_id);
    if (!doc || doc.status === "archived") {
      return NextResponse.json(
        { error: "El documento vinculado no existe." },
        { status: 400 },
      );
    }
  }

  try {
    const presupuestos = await getPresupuestos();
    const index = presupuestos.findIndex((p) => p.id === id);
    if (index === -1) {
      // Nothing is written on a miss — the document stays byte-identical.
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = applyPresupuestoPatch(presupuestos[index], patch);
    presupuestos[index] = updated;
    await savePresupuestos(presupuestos);

    return NextResponse.json(updated);
  } catch (err) {
    // Never log the request body — a presupuesto's provider and scope can
    // name real providers and neighbours (ASVS V7).
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to save presupuesto: ${msg}` },
      { status: 500 },
    );
  }
}
