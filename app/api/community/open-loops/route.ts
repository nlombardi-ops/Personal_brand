import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/community/require-auth";
import { getOpenLoops, saveOpenLoops } from "@/lib/community/open-loops-store";
import {
  applyCreateDefaults,
  validateLoopInput,
} from "@/lib/community/loop-defaults";
import type { OpenLoop } from "@/lib/types";

export async function GET(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;

  return NextResponse.json(await getOpenLoops());
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

  const invalid = validateLoopInput(body, { create: true });
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  try {
    const now = new Date().toISOString();
    const loop: OpenLoop = {
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      ...applyCreateDefaults(body as Record<string, unknown>),
    };

    const loops = await getOpenLoops();
    loops.push(loop);
    await saveOpenLoops(loops);

    return NextResponse.json(loop, { status: 201 });
  } catch (err) {
    // Never log the request body — loop text can contain neighbour names (ASVS V7).
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to save loop: ${msg}` },
      { status: 500 },
    );
  }
}
