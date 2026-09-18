import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/community/require-auth";
import { getPresupuestos, savePresupuestos } from "@/lib/community/presupuestos-store";
import { getOpenLoops } from "@/lib/community/open-loops-store";
import { getDocuments } from "@/lib/community/documents-store";
import {
  applyPresupuestoCreateDefaults,
  validatePresupuestoInput,
} from "@/lib/community/presupuesto-defaults";
import type { Presupuesto } from "@/lib/types";

// A presupuesto is removed by a status change (D-06), never by a removal
// endpoint — no DELETE is exported here or anywhere under app/api/community/.

export async function GET(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const loopId = request.nextUrl.searchParams.get("loop_id");
  const presupuestos = await getPresupuestos();
  if (loopId) {
    return NextResponse.json(presupuestos.filter((p) => p.loop_id === loopId));
  }
  return NextResponse.json(presupuestos);
}

export async function POST(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const invalid = validatePresupuestoInput(body, { create: true });
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  const { loop_id, document_id } = body as {
    loop_id: string;
    document_id?: string | null;
  };

  // D-10 is enforced by the API, not only by which section renders — a
  // hand-crafted request against a non-obra loop must fail too.
  const loops = await getOpenLoops();
  const loop = loops.find((l) => l.id === loop_id);
  if (!loop || loop.kind !== "obra") {
    return NextResponse.json(
      { error: "Solo puedes registrar presupuestos en bucles de tipo obra." },
      { status: 400 },
    );
  }

  if (document_id) {
    const documents = await getDocuments();
    const doc = documents.find((d) => d.id === document_id);
    if (!doc || doc.status === "archived") {
      return NextResponse.json(
        { error: "El documento vinculado no existe." },
        { status: 400 },
      );
    }
  }

  try {
    const now = new Date().toISOString();
    const presupuesto: Presupuesto = {
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      ...applyPresupuestoCreateDefaults(body as Record<string, unknown>),
    };

    const presupuestos = await getPresupuestos();
    presupuestos.push(presupuesto);
    await savePresupuestos(presupuestos);

    return NextResponse.json(presupuesto, { status: 201 });
  } catch (err) {
    // Never log the request body — provider and scope can name neighbours and providers (ASVS V7).
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to save presupuesto: ${msg}` },
      { status: 500 },
    );
  }
}
