import { getOpenLoops } from "@/lib/community/open-loops-store";

// Server Component: reads the store directly at request time (the layout already
// gates the segment, so no AuthGuard here). Never static-import the seed JSON —
// that bakes in a build-time snapshot and created loops never appear.
export default async function CommunityPresidentPage() {
  const loops = await getOpenLoops();

  return (
    <div className="px-6 py-8 lg:px-8">
      <h1 className="text-[28px] font-semibold leading-[1.2] text-neutral-900">
        Bucles abiertos
      </h1>
      <p className="mt-8 text-sm text-neutral-500">
        {loops.length === 0
          ? "Aún no hay bucles abiertos."
          : `${loops.length} bucle(s) en seguimiento.`}
      </p>
    </div>
  );
}
