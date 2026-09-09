import Cockpit from "@/app/components/community/Cockpit";
import { getOpenLoops } from "@/lib/community/open-loops-store";

// Server Component: reads the store directly at request time (the layout already
// gates the segment, so no AuthGuard here). Never static-import the seed JSON —
// that bakes in a build-time snapshot and created loops never appear. No client
// fetch, so there is no skeleton and no loading state on first paint.
export default async function CommunityPresidentPage() {
  const loops = await getOpenLoops();

  return (
    <div className="px-6 py-8 lg:px-8">
      <Cockpit loops={loops} />
    </div>
  );
}
