import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/community/require-auth";
import { getOpenLoops, saveOpenLoops } from "@/lib/community/open-loops-store";
import { applyPatch, validateLoopInput } from "@/lib/community/loop-defaults";

// Only PATCH is exported. Next returns 405 for every other verb automatically,
// and there is deliberately NO removal endpoint on this resource: discarding a
// loop is a status change to `dropped` (D-10, UI-SPEC Destructive action), not a
// deletion. The id-scoped route is the sole mutation path for an existing loop,
// shared by the slide-over edit form and the inline quick actions.
//
// `ctx.params` is typed inline (Promise of { id }) mirroring the repo's existing
// dynamic route `app/api/cv/versions/[id]/route.ts`; the generated RouteContext
// global is not available until typegen has seen this new path.
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

  // Non-create mode: every supplied field is re-checked against the same length
  // caps and enum allow-lists as create — an edit is not a way around them.
  const invalid = validateLoopInput(body, { create: false });
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  try {
    const loops = await getOpenLoops();
    const index = loops.findIndex((loop) => loop.id === id);
    if (index === -1) {
      // Nothing is written on a miss — the document stays byte-identical.
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = applyPatch(loops[index], body as Record<string, unknown>);
    loops[index] = updated;
    await saveOpenLoops(loops);

    return NextResponse.json(updated);
  } catch (err) {
    // Never log the request body — loop text can contain neighbour names (ASVS V7).
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to save loop: ${msg}` },
      { status: 500 },
    );
  }
}
