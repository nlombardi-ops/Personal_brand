# Phase 1: Cockpit Foundation & Open-Loop Tracker - Pattern Map

**Mapped:** 2026-09-08
**Files analyzed:** 20 new / 1 modified
**Analogs found:** 16 / 21 (5 new-logic files have no analog)

All analog files were read directly from disk on 2026-09-08. Where RESEARCH.md §"Recommended Project Structure" / Patterns 1–6 quote an excerpt, any difference from the on-disk source is flagged under **DRIFT** below. The important one: the RESEARCH.md auth excerpts add a `!process.env.DASHBOARD_TOKEN` fail-open guard that **does not exist in any current repo file** — it is a deliberate hardening recommendation (Pitfall 1), not a copy.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/types.ts` (MODIFY — add banner + `OpenLoop`/`Submission`) | model / types | — | existing `// ── Dashboard ──` banked interfaces in same file | exact |
| `lib/community/open-loops-store.ts` | store / persistence | CRUD (whole-file JSON rewrite) | `lib/cv/versions-store.ts` | exact |
| `lib/community/require-auth.ts` | middleware / guard | request-response | cookie check in `app/api/dashboard/contracts-chat/route.ts` L60–63 | role-match (inline → extracted) |
| `lib/community/urgency.ts` | utility (pure) | transform | — none (new logic) | no analog |
| `lib/community/relative-date.ts` | utility (pure) | transform | `fmtMonth` in `SyncButton.tsx` L16–22; `today` slice in contracts-chat L93 | partial (helper style only) |
| `lib/community/loop-defaults.ts` | utility (pure validation) | transform | inline field checks in `contracts-chat` L72–80; `versions/route.ts` body typing | partial |
| `lib/community/urgency.test.ts` (optional) | test | — | — none (no test infra) | no analog |
| `data/community-open-loops.json` (NEW, `[]`) | config / seed | — | `data/cv-versions.json` + STRUCTURE.md §"Where to Add" step 5 | exact |
| `app/community-president/layout.tsx` | route / auth gate | request-response | `app/cv/layout.tsx` (+ `app/dashboard/layout.tsx` for `metadata`) | exact |
| `app/community-president/page.tsx` | route / page (Server Component) | request-response (reads store) | `app/dashboard/page.tsx` L1–12 (server component reads `getBillsData()`) | exact |
| `app/api/community/open-loops/route.ts` | controller / route handler | CRUD (GET list + POST create) | `app/api/cv/versions/route.ts` | exact |
| `app/api/community/open-loops/[id]/route.ts` | controller / route handler | CRUD (PATCH) | `app/api/cv/versions/route.ts` + dynamic-segment folders (`app/api/cv/versions/[id]/`) | role-match |
| `app/components/community/CommunitySidebar.tsx` | component (client) | event-driven (nav + logout) | `app/components/dashboard/Sidebar.tsx` | exact |
| `app/components/community/Cockpit.tsx` | component (client, stateful island) | event-driven + request-response (fetch → refresh) | `app/components/dashboard/SyncButton.tsx` | role-match |
| `app/components/community/LoopColumn.tsx` | component (presentational) | — | — (new); nearest: dashboard table components | no analog |
| `app/components/community/LoopCard.tsx` | component (presentational) | — | DESIGN.md tag-chip / section-label patterns | partial |
| `app/components/community/QuickActions.tsx` | component (client) | request-response (PATCH) | `SyncButton.tsx` button + pending state | partial |
| `app/components/community/LoopSlideOver.tsx` | component (client, form panel) | request-response (POST/PATCH) | `app/dashboard/login/page.tsx` (form + error state); `SyncButton.tsx` | partial |
| `app/components/community/NoDateSection.tsx` | component (presentational) | — | — none | no analog |
| `app/components/community/CountStrip.tsx` | component (presentational) | — | — none (pure derived) | no analog |
| `app/components/community/EmptyState.tsx` | component (presentational) | — | — none | no analog |

---

## Shared Patterns

### Auth — surface layout gate (PLAT-01)
**Source:** `app/cv/layout.tsx` (whole file, 19 lines) — identical logic in `app/components/dashboard/AuthGuard.tsx` L4–13.
**Apply to:** `app/community-president/layout.tsx`
```tsx
// app/cv/layout.tsx — ON DISK, verbatim
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CvSidebar from "@/app/components/cv/CvSidebar";

export default async function CvLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("dashboard_auth")?.value;

  if (token !== process.env.DASHBOARD_TOKEN) {
    redirect("/dashboard/login");
  }

  return (
    <div className="flex min-h-screen bg-stone-50">
      <CvSidebar />
      <main className="ml-56 flex-1 min-w-0">{children}</main>
    </div>
  );
}
```
- `await cookies()` — async in Next 16, already correct here.
- `redirect()` called at top level (no try/catch) — correct; keep it that way.
- **DRIFT vs RESEARCH.md Pattern 1:** research adds `if (!token || !process.env.DASHBOARD_TOKEN || token !== process.env.DASHBOARD_TOKEN)` and `export const metadata`. Neither is on disk. The extra `!process.env.DASHBOARD_TOKEN` guard is the Pitfall 1 fail-open fix — **adopt it** (planner: this is an intentional improvement over the analog, not a copy). For `metadata`, copy the one-liner from `app/dashboard/layout.tsx` L1–6 (`import type { Metadata } from "next"; export const metadata: Metadata = { title: "..." };`).
- **DRIFT (palette):** analog uses `bg-stone-50` / `ml-56`. UI-SPEC mandates `bg-[#fafafa]` and `md:ml-60` (sidebar `w-60` = 240px). Do NOT copy the stone classes.

### Auth — API route guard (PLAT-02)
**Source:** `app/api/dashboard/contracts-chat/route.ts` L59–63 (the strict form; this is the only route that compares the cookie *value*).
**Apply to:** new `lib/community/require-auth.ts`, called first line of every `app/api/community/*` handler.
```ts
// app/api/dashboard/contracts-chat/route.ts L60-63 — ON DISK, verbatim
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value || authCookie.value !== process.env.DASHBOARD_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
```
- `request.cookies.get()` on `NextRequest` is **synchronous** (not the `next/headers` async API).
- **DRIFT vs RESEARCH.md Pattern 2:** research's helper adds `!process.env.DASHBOARD_TOKEN` to the condition — again the Pitfall 1 hardening, adopt it.
- **DRIFT (weaker analogs exist — do NOT copy these):** `app/api/cv/versions/route.ts` L10–13 & L22–25 check only `!authCookie?.value` (presence, not value). CONVENTIONS.md explicitly says new code must follow the *stricter* form. Use the contracts-chat form.
- Body-parse pattern from the same file, L65–70: wrap `await request.json()` in try/catch → `400 { error: "Invalid JSON" }`, then validate → `400 { error: "Missing X" }`.

### Error handling — API
**Source:** `app/api/cv/versions/route.ts` L67–70; `contracts-chat/route.ts` L114–117.
**Apply to:** all `app/api/community/*` handlers.
```ts
// app/api/cv/versions/route.ts L67-70 — ON DISK, verbatim
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to save CV version: ${msg}` }, { status: 500 });
  }
```
Success shape: return the resource directly (`NextResponse.json(loop, { status: 201 })` for create, `NextResponse.json(loop)` for patch) — matches `versions/route.ts` L66.

### Storage — dual-mode JSON store
**Source:** `lib/cv/versions-store.ts` (whole file, 43 lines) — reproduced under Pattern Assignments below.
**Apply to:** `lib/community/open-loops-store.ts`.

### Client mutation + refresh
**Source:** `app/components/dashboard/SyncButton.tsx` L30–52.
**Apply to:** `Cockpit.tsx`, `QuickActions.tsx`, `LoopSlideOver.tsx`.
```tsx
// SyncButton.tsx L30-52 — ON DISK, verbatim
  const router = useRouter();
  const [state, setSyncState] = useState<SyncState>("idle");
  const [result, setResult] = useState<{ synced?: Record<string, number>; error?: string } | null>(null);

  async function handleSync() {
    setSyncState("syncing");
    setResult(null);
    try {
      const res = await fetch("/api/dashboard/sync", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setSyncState("done");
        setResult({ synced: data.synced });
        router.refresh();
      } else {
        setSyncState("error");
        setResult({ error: data.error });
      }
    } catch {
      setSyncState("error");
      setResult({ error: "Request failed" });
    }
  }
```
- Pattern: `fetch` → branch on response → `router.refresh()` re-runs the Server Component tree (the community page reads the store, so the board updates). No `revalidatePath` (no `cacheComponents` in this project).
- Community version: send `{ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }`, branch on `res.ok`, Spanish error copy from UI-SPEC (`No se ha podido guardar el bucle. Revisa tu conexión e inténtalo de nuevo.`).

### Logout
**Source:** `app/components/dashboard/Sidebar.tsx` L27–30 + `app/api/auth/route.ts` L26–30 (`DELETE` clears the cookie).
```tsx
// Sidebar.tsx L27-30 — ON DISK, verbatim
  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/dashboard/login");
  }
```

### Input validation (V5 / Pitfall 6, 7)
No dedicated analog. Nearest: inline checks in `contracts-chat/route.ts` L72–80 (`Array.isArray` guard, `.trim()` check, explicit `400`). Build `loop-defaults.ts` as small explicit guards (no `zod` — not a dependency; adding it is a gated decision per RESEARCH.md). Derive enum allow-list `Set`s from a single label `const` record per enum (the Spanish label maps in UI-SPEC §"Enum display labels").

---

## Pattern Assignments

### `lib/community/open-loops-store.ts` (store, CRUD)

**Analog:** `lib/cv/versions-store.ts` — structural copy, rename `CvVersion`→`OpenLoop`, `getVersions`→`getOpenLoops`, `saveVersions`→`saveOpenLoops`, pathname→`community-open-loops.json`.

**Full analog** (`lib/cv/versions-store.ts`, on disk, 43 lines):
```ts
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { get, put } from "@vercel/blob";
import type { CvVersion } from "@/lib/types";

const BLOB_PATHNAME = "cv-versions.json";
const LOCAL_PATH = join(process.cwd(), "data/cv-versions.json");

export async function getVersions(): Promise<CvVersion[]> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      // useCache: false bypasses Vercel's CDN cache layer — needed because
      // the pathname is stable (addRandomSuffix: false), so the CDN would
      // otherwise keep serving the pre-save copy after every write.
      const result = await get(BLOB_PATHNAME, { access: "private", useCache: false });
      if (result) {
        const text = await new Response(result.stream).text();
        return JSON.parse(text) as CvVersion[];
      }
    } catch {
      // fall through to local
    }
  }
  try {
    return JSON.parse(readFileSync(LOCAL_PATH, "utf-8"));
  } catch {
    return [];
  }
}

export async function saveVersions(versions: CvVersion[]): Promise<void> {
  const json = JSON.stringify(versions, null, 2);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(BLOB_PATHNAME, json, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } else {
    writeFileSync(LOCAL_PATH, json);
  }
}
```
- **DRIFT vs RESEARCH.md Pattern 3:** research writes `JSON.parse(await new Response(result.stream).text())` inline and omits the `if (result)` guard's separate `text` var — cosmetic only; the on-disk two-step form is the one to copy. Research also omits the load-bearing `useCache: false` comment — **keep the comment** (CONVENTIONS.md: "load-bearing... keep them").
- The `access: "private"` is mandatory — never `"public"` (PROJECT.md: regressed silently once).
- Create `data/community-open-loops.json` containing exactly `[]` and commit it (so the local-mode read succeeds in dev; D-18: no seed data).

### `lib/community/require-auth.ts` (guard, request-response)

**Analog:** `app/api/dashboard/contracts-chat/route.ts` L60–63 (see Shared Patterns → Auth API). Extract to `export function requireAuth(request: NextRequest): NextResponse | null` returning the `401` response or `null`. Add the `!process.env.DASHBOARD_TOKEN` guard (Pitfall 1). Unauthorized body: `{ error: "Unauthorized" }` (CONVENTIONS.md standard).

### `app/community-president/layout.tsx` (auth gate)

**Analog:** `app/cv/layout.tsx` (verbatim in Shared Patterns → Auth surface). Add `metadata` per `app/dashboard/layout.tsx` L1–6. Render `<CommunitySidebar />` + `<main className="flex-1 min-w-0 md:ml-60">`; wrapper `bg-[#fafafa]` (UI-SPEC, not `bg-stone-50`).

### `app/community-president/page.tsx` (Server Component, reads store)

**Analog:** `app/dashboard/page.tsx` L1–12 — Server Component imports a store fn and calls it directly, no `"use client"`, no fetch.
```tsx
// app/dashboard/page.tsx L1-12 — ON DISK
import { Zap, Landmark, Calendar, AlertTriangle, Wifi, ShieldCheck } from "lucide-react";
import AuthGuard from "../components/dashboard/AuthGuard";
import StatCard from "../components/dashboard/StatCard";
import CostChart from "../components/dashboard/CostChart";
import SyncButton from "../components/dashboard/SyncButton";
import { getBillsData } from "@/lib/drive/sync";
```
- Community page: `const loops = await getOpenLoops();` then `const grouped = groupLoopsByUrgency(loops);` then `return <Cockpit initial={grouped} .../>`.
- Do **not** static-`import` `data/community-open-loops.json` (ARCHITECTURE.md anti-pattern; Pitfall 4). Note `app/dashboard/page.tsx` L7–9 *does* static-import `insurance.json` etc. — that is the documented anti-pattern; do not imitate it, go through `getOpenLoops()`.
- No `<AuthGuard>` needed inside the page — the layout already gates the segment (unlike `app/dashboard` where the gate is the in-page `AuthGuard` component).

### `app/api/community/open-loops/route.ts` (route handler, GET list + POST create)

**Analog:** `app/api/cv/versions/route.ts` (whole file, 71 lines).
```ts
// app/api/cv/versions/route.ts — ON DISK, key excerpts
import { NextRequest, NextResponse } from "next/server";
import { getVersions, saveVersions } from "@/lib/cv/versions-store";
import type { CvContent, CvVersion } from "@/lib/types";

export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {                                   // ← WEAK form — do NOT copy; use requireAuth()
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const versions = await getVersions();
  return NextResponse.json(versions.sort(/* ... */));
}

export async function POST(request: NextRequest) {
  // ... auth ...
  const { content, job_url }: { content: CvContent; job_url: string } = await request.json();
  const id = crypto.randomUUID();
  try {
    // ... build resource ...
    const version: CvVersion = { id, /* ... */ generated_at: new Date().toISOString(), /* ... */ };
    const versions = await getVersions();
    versions.push(version);
    await saveVersions(versions);
    return NextResponse.json(version, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to save CV version: ${msg}` }, { status: 500 });
  }
}
```
**Copy:** `crypto.randomUUID()` for `id` (top-level, before try), `new Date().toISOString()` for `created_at`/`updated_at`, the get→push→save sequence, the catch shape, `{ status: 201 }` on create.
**Replace / add:** `requireAuth(request)` as first line of both verbs (the on-disk presence-only check is the weak form CONVENTIONS.md warns against). Wrap `request.json()` in try/catch → `400` (the analog does NOT — it destructures raw; contracts-chat L65–70 is the better model). Run `validateLoopInput` / `applyCreateDefaults` between parse and work.

### `app/api/community/open-loops/[id]/route.ts` (route handler, PATCH)

**Analog:** folder convention `app/api/cv/versions/[id]/` (dynamic segment) + the POST body of `versions/route.ts` for the get→mutate→save→return loop.
- Next 16: `params` is a Promise — `const { id } = await ctx.params;` (RESEARCH.md Pattern 4; Pitfall 2). Fallback signature `{ params }: { params: Promise<{ id: string }> }` if `RouteContext<...>` global type isn't generated.
- `404 { error: "Not found" }` when `findIndex` returns `-1`.
- Merge only allow-listed fields (Pitfall: prototype pollution) — do not spread raw `patch`.
- Quick actions (D-12) are just PATCH bodies (`{ status: "done" }`, `{ status: "waiting_on_other" }`, `{ due: "<ymd>" }`) — no separate endpoints.

### `app/components/community/CommunitySidebar.tsx` (client component)

**Analog:** `app/components/dashboard/Sidebar.tsx` (whole file, 90 lines).
```tsx
// Sidebar.tsx — ON DISK, key structure
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, /* ... */ LogOut, ChevronLeft } from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  /* ... */
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/dashboard/login");
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 flex w-60 flex-col bg-stone-100 border-r border-stone-200">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-stone-200">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">F10</div>
        <div>
          <p className="text-sm font-semibold text-stone-900">Fourquet 10</p>
          <p className="text-[11px] text-stone-500">Finance Dashboard</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active ? "bg-stone-200 text-stone-900 font-medium" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              }`}>
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-stone-200 px-3 py-3 space-y-1">
        <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to Portfolio
        </Link>
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
```
**Copy:** the `"use client"` + `usePathname`/`useRouter` structure, `NAV_ITEMS` map, active-state logic, `fixed` aside with header/nav/footer, `handleLogout`, lucide icons, "Back to portfolio" `Link href="/"`.
**Replace per UI-SPEC:**
- Palette: `bg-stone-100`→`bg-neutral-100`, `border-stone-200`→`border-neutral-200`, all `stone-*` text → `neutral-*`.
- Brand tile: `bg-emerald-600` → `bg-[#0f172a]` (`--cta-accent`), label "CP", text `Presidente` / `Comunidad`.
- `NAV_ITEMS`: single entry `{ label: "Panel", href: "/community-president", icon: <pick> }` (keep minimal — CONTEXT deferred).
- Copy → Spanish: `Volver al portfolio`, `Cerrar sesión`; logout redirects `/dashboard/login`.
- Width `w-60` (240px) already matches UI-SPEC; add mobile top-bar + drawer collapse `< md` (no analog — new; DESIGN.md mobile pattern).

### `app/components/community/Cockpit.tsx` (client island, owns slide-over + optimistic state)

**Analog:** `app/components/dashboard/SyncButton.tsx` L1–52 for the `"use client"` + `useRouter` + `useState` + `fetch`→`router.refresh()` mutation loop (see Shared Patterns → Client mutation). No analog for the board layout / column composition / slide-over orchestration — build to UI-SPEC §"Interaction & Layout Contract". Calls the pure `groupLoopsByUrgency` (re-run client-side after optimistic mutation). Wrap columns in the existing `FadeUp` (`app/components/FadeUp.tsx`, 24 lines — `initial/whileInView/viewport once`), do not hand-roll motion.

### `lib/community/urgency.ts` / `relative-date.ts` / `loop-defaults.ts` (pure utilities)

**No analog.** These are the reviewable novelty of the phase. Full specs in RESEARCH.md Pattern 6 + §"Code Examples". Conventions to follow: named exports, pure (no `next/*` / `fs` imports), `date-fns` `differenceInCalendarDays` (already a dep), module-level `const` for `DUE_SOON_DAYS = 14` / `HIDDEN` set, banner comment style. `relative-date.ts` Spanish vocabulary is fixed by UI-SPEC §"Relative due-date formatting".

### `lib/types.ts` (MODIFY)

**Analog:** the file's own existing structure — `interface` declarations grouped under `// ── Dashboard ──` / `// ── CV ──` banner comments (CONVENTIONS.md). Add `// ── Smart Community President ──────` banner, then the enum unions + `OpenLoop` + `Submission` interfaces exactly as RESEARCH.md §"Code Examples". LPH-aware fields declared optional (`?:`) now (UI-SPEC note + Claude's Discretion resolved). Use `interface`, not `type`, for the object shapes; `export type` for the string unions.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/community/urgency.ts` | pure utility | transform | No grouping/sort logic exists in the codebase; new. Spec: RESEARCH.md Pattern 6. |
| `lib/community/relative-date.ts` | pure utility | transform | Only `fmtMonth`-style one-offs exist; no shared relative-date module. Spec: UI-SPEC + RESEARCH §Code Examples. |
| `lib/community/loop-defaults.ts` | pure validation | transform | No shared validator module; repo validates inline. Build explicit guards (no `zod`). |
| `lib/community/urgency.test.ts` | test | — | No test runner, no `*.test.*` in repo. Optional `node --test`; new infra. |
| `app/components/community/{LoopColumn,NoDateSection,CountStrip,EmptyState}.tsx` | presentational components | — | Kanban board / collapsed section / count strip / first-run state have no precedent (dashboard has none). Build to UI-SPEC tokens (DESIGN.md `neutral-*`, tag-chip, section-label patterns). |
| `app/components/community/LoopSlideOver.tsx` | client form panel | request-response | No slide-over / drawer pattern in the app (CONTEXT D-08: "New pattern for this app"). Form+error-state style from `app/dashboard/login/page.tsx`; motion from `framer-motion` directly (not `FadeUp` — needs transform transition); focus trap = WAI-ARIA dialog pattern, no library. |

---

## Key Patterns Identified

- **Auth is copy-with-hardening:** every gated surface copies `app/cv/layout.tsx` / `contracts-chat` L60–63, but Phase 1 must add the `!process.env.DASHBOARD_TOKEN` guard the analogs lack (Pitfall 1). The weak presence-only check in `app/api/cv/versions/route.ts` is explicitly the wrong model.
- **Stores are a verbatim template:** `lib/cv/versions-store.ts` → rename 4 identifiers + pathname. `useCache:false` / `addRandomSuffix:false` / `allowOverwrite:true` / `access:"private"` are load-bearing; keep the CDN-cache comment.
- **Server Component reads store directly, client island mutates via route + `router.refresh()`:** `app/dashboard/page.tsx` + `SyncButton.tsx` are the paired analog. No `revalidatePath` (no `cacheComponents`).
- **Route handlers:** `crypto.randomUUID()` + `new Date().toISOString()` + get→push→save + `err instanceof Error ? err.message : String(err)` catch + return resource directly. From `app/api/cv/versions/route.ts`.
- **Sidebar:** `app/components/dashboard/Sidebar.tsx` is a structural 1:1 copy; only palette (`stone-*`→`neutral-*`), brand, nav list (single item), and language (Spanish) change.
- **The novelty is small and pure:** `urgency.ts` + `relative-date.ts` + `loop-defaults.ts` + the type unions + the Spanish UI. Everything else is a repo-blessed copy.

## Metadata

**Analog search scope:** `lib/cv/`, `lib/drive/`, `app/cv/`, `app/dashboard/`, `app/api/cv/`, `app/api/dashboard/`, `app/api/auth/`, `app/components/dashboard/`, `app/components/`.
**Files read:** `lib/cv/versions-store.ts`, `app/cv/layout.tsx`, `app/components/dashboard/AuthGuard.tsx`, `app/api/cv/versions/route.ts`, `app/components/dashboard/Sidebar.tsx`, `app/components/dashboard/SyncButton.tsx`, `app/api/dashboard/contracts-chat/route.ts`, `app/dashboard/page.tsx`, `app/dashboard/layout.tsx`, `app/components/FadeUp.tsx`, `app/api/auth/route.ts`.
**Pattern extraction date:** 2026-09-08
