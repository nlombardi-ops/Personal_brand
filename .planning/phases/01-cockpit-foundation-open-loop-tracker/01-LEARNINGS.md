---
phase: 1
phase_name: "cockpit-foundation-open-loop-tracker"
project: "Smart Community President"
generated: "2026-09-10"
counts:
  decisions: 12
  lessons: 9
  patterns: 13
  surprises: 7
missing_artifacts: []
---

# Phase 1 Learnings: cockpit-foundation-open-loop-tracker

## Decisions

### Standalone `/community-president` surface, not nested under `/dashboard`
The Community President cockpit ships as its own top-level App Router surface with its own auth-gated `layout.tsx` and sidebar.

**Rationale:** Cleaner separation, eases the later neighbour-portal fork, and avoids inheriting the finance dashboard's half-done light theme and zero mobile support.
**Source:** 01-01-SUMMARY.md, STATE.md

### Three-part fail-closed token guard, duplicated in layout and API helper
Both `app/community-president/layout.tsx` and `lib/community/require-auth.ts` use `!token || !process.env.DASHBOARD_TOKEN || token !== process.env.DASHBOARD_TOKEN`.

**Rationale:** The extra `!process.env.DASHBOARD_TOKEN` clause closes the fail-open hole the `app/cv/layout.tsx` analog has when the env var is unset (RESEARCH Pitfall 1). Copied deliberately into both places rather than shared, so neither path can regress independently.
**Source:** 01-01-SUMMARY.md, 01-VERIFICATION.md, 01-SECURITY.md (T-01-02)

### OpenLoop / Submission type split now, Submission empty of president internals
`OpenLoop` carries all LPH/owner/presupuesto fields; `Submission` is `id, submitter_name, submitter_unit, description, photos?, status:"triage", created_at` only, with zero v1 consumers.

**Rationale:** The one forward-compat move that makes the neighbour portal cheap later (PLAT-03 / SC-5). Declared in `lib/types.ts` for v2, wired nowhere in v1.
**Source:** 01-01-SUMMARY.md, 01-03-SUMMARY.md (PLAT-03 audit)

### LPH-aware `OpenLoop` fields declared optional now, not deferred to Phase 3
The optional LPH fields (`acuerdo_id`, deadlines, etc.) are added to the `OpenLoop` shape in Phase 1.

**Rationale:** Matches the UI-SPEC + RESEARCH recommendation and resolves a CONTEXT "Claude's Discretion" item — Phase 3 adds *behaviour*, not *shape*, so no later migration.
**Source:** 01-01-SUMMARY.md

### Enum single-source-of-truth via one Spanish label Record per enum
`KIND/STATUS/OWNER/SOURCE_LABELS` in `loop-defaults.ts`; validation allow-list Sets and the slide-over `<select>` options both derive from `Object.keys()` of those records.

**Rationale:** The display vocabulary and the validation vocabulary cannot drift apart (Pitfall 7). `SOURCE_LABELS` was added even though UI-SPEC lists no source display labels, purely so all four enums derive uniformly.
**Source:** 01-01-SUMMARY.md

### Urgency buckets are a disjoint priority cascade
`groupLoopsByUrgency` places each loop in exactly one of Vencidos > Vencen pronto > A la espera de otros (or Sin fecha). An overdue loop waiting on the administrador shows in Vencidos only, with an "Administrador" owner chip — not dual-listed.

**Rationale:** Keeps the D-17 header count strip readable as `X · Y · Z`. "Show in both" (D-02/D-04) is satisfied by the owner chip, not by column membership. Flagged as assumption A1 for UAT; **Nicola confirmed it at UAT** (A1 now resolved).
**Source:** 01-02-SUMMARY.md, 01-UAT.md (test 3)

### No hard-delete anywhere in the community namespace
"Descartar bucle" issues `PATCH { status: "dropped" }`; the record stays in the JSON document and is hidden by the plan-02 grouping. No `DELETE` handler exists under `app/api/community/`.

**Rationale:** A compromised or mistaken client cannot destroy a record; discard is reversible.
**Source:** 01-03-SUMMARY.md, 01-SECURITY.md (T-01-17)

### PATCH merges via a frozen `PATCHABLE_KEYS` allow-list, never a body spread
`applyPatch(existing, patch)` copies the existing loop, then overlays only the seven `Object.freeze`'d allow-listed keys via `Object.prototype.hasOwnProperty.call`.

**Rationale:** One structural choke point defeats both mass assignment (`id`/`created_at`/`source`/LPH fields are server-owned) and prototype pollution (`__proto__`/`constructor` are never read) — conclusive without a runtime test.
**Source:** 01-03-SUMMARY.md, 01-VERIFICATION.md

### The id-scoped route is the only mutation path for an existing loop
Quick actions (D-12) are just smaller `PATCH` bodies to `/api/community/open-loops/[id]` — no second endpoint, no second validation path.

**Rationale:** Every existing-loop write re-runs `validateLoopInput(body, { create: false })` and `applyPatch`; there is nowhere to bypass the caps and allow-list.
**Source:** 01-03-SUMMARY.md

### Pure isomorphic domain module for grouping and date formatting
`lib/community/urgency.ts` and `relative-date.ts` import only `date-fns` and the `OpenLoop` type — no `next/*`, no `fs`, no React.

**Rationale:** The same grouping runs server-side for first paint and could run client-side after a mutation without a refactor. (Note: no client re-group path exists yet — see Lessons.)
**Source:** 01-02-SUMMARY.md, 01-REVIEW.md (IN-03)

### `allowImportingTsExtensions: true` added to tsconfig.json
Unplanned tsconfig change so `tsc --noEmit` accepts the explicit `./urgency.ts` import specifiers that Node's built-in test runner requires.

**Rationale:** Safe under the repo's existing `noEmit: true` — it only permits `.ts` in import paths, does not change emit, and Turbopack builds are unaffected. Required to have both `node --test` and `npx tsc --noEmit` pass.
**Source:** 01-02-SUMMARY.md

### Slide-over form reset happens in the render phase, not a useEffect
`LoopSlideOver` resets form state with `if (open !== prevOpen)` during render; only DOM focus management stays in effects.

**Rationale:** The repo's ESLint config errors on `react-hooks/set-state-in-effect`, and `.claude/CLAUDE.md` requires following repo conventions.
**Source:** 01-01-SUMMARY.md

---

## Lessons

### `.env` / `.env.local` are not writable from the agent environment
Behaviour tests had to pass `DASHBOARD_TOKEN=… npm run dev` inline on a non-default port instead of writing a dotenv file.

**Context:** A Read deny rule blocks `.env*`. Every auth-path curl matrix in Phase 1 used an inline env var; no `.env` file was created or committed. Nicola must still set the var in local `.env` for day-to-day dev.
**Source:** 01-01-SUMMARY.md

### `npm run lint` baseline is red on `main` before any Phase 1 change
4 errors + 6 warnings in unrelated files (`Contact.tsx`, `References.tsx`, `app/cv/page.tsx`, `CvPreview.tsx`, `app/dashboard/mortgage/page.tsx`, `lib/cv/render.tsx`).

**Context:** The plan's `<automated>` verify chains `npm run lint`, which exits 1 on this pre-existing debt. Phase 1 gated instead on `npx tsc --noEmit` + a path-scoped `npx eslint app/community-president app/components/community lib/community`. Logged in `deferred-items.md`; a separate `/gsd-quick` could clear the baseline.
**Source:** deferred-items.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md

### Node's built-in test runner needs explicit `.ts` specifiers that tsc rejects by default
`node --test` resolves relative ESM imports only with an extension (`./urgency.ts`); `tsc` then fails `TS5097` without `allowImportingTsExtensions`.

**Context:** Discovered during Task 1 of plan 02 — the first test file in the repo. Resolved by the tsconfig flag (see Decisions).
**Source:** 01-02-SUMMARY.md

### A `<button>` card cannot host nested action buttons
`LoopCard` shipped in plan 02 as a single `<button>`; nesting the three quick-action `<button>`s and a date `<input>` in plan 03 is invalid HTML and breaks click handling.

**Context:** Forced a plan-03 restructure to a `<div class="group relative">` with an absolutely-positioned overlay `<button>` behind `pointer-events-none` content. An earlier slice's component shape did not anticipate the later slice's interaction.
**Source:** 01-03-SUMMARY.md

### `flex-1 overflow-y-auto` without `min-h-0` breaks scroll in a column flex
The pinned slide-over footer gets pushed off-screen when the mobile on-screen keyboard opens.

**Context:** Fixed by adding `min-h-0` to the `LoopSlideOver` form element; landed early with the Task 1 edit-mode change rather than the Task 3 mobile work.
**Source:** 01-03-SUMMARY.md

### `find … -exec grep -l …` exits 0 regardless of matches
An audit compound command printed "FOUND" for a non-existent `DELETE` handler because `find`'s exit code does not reflect `grep` matches.

**Context:** Re-checked with `grep -rn` / `test -z "$(…)"`, which is the plan's real gate. Prefer `grep -rn` for "does this string exist anywhere" checks.
**Source:** 01-03-SUMMARY.md

### PATCH required-ness checks are gated behind `opts.create`
`PATCH { "title": "" }` passes `validateLoopInput(body, { create: false })` and `applyPatch` writes the trimmed empty string, producing a stored `OpenLoop` that violates D-09.

**Context:** Code review WR-02. Unreachable from the UI (`LoopSlideOver` guards it), and the 01-03 must-have only claims length caps + enum allow-lists are re-checked — so not a goal blocker. But it is a real robustness gap for the Phase 3+ untrusted-document-driven write paths; recommended as a follow-up.
**Source:** 01-REVIEW.md, 01-VERIFICATION.md (Anti-Patterns)

### A no-op "Guardar cambios" still does a full-store write and reorders "Sin fecha"
`buildPatch()` returns `{}`, neither client nor server short-circuits, `applyPatch` still bumps `updated_at`, and `saveOpenLoops` rewrites the whole document — so a dateless loop silently jumps to the top of its bucket (sorted by `updated_at` desc) and a Blob write is burned.

**Context:** Code review WR-01. Cosmetic + a wasted write for a single-user tool; flagged as a follow-up (short-circuit an empty patch on the client and/or return the unchanged loop from the route).
**Source:** 01-REVIEW.md

### The pre-existing `DASHBOARD_TOKEN` blocker was already resolved in Vercel
`DASHBOARD_TOKEN` is an existing Vercel variable shared by the Finance Dashboard / CV surfaces; the community-president gate compares against the same value, so Preview + Production are covered on the next push.

**Context:** STATE.md tracked this as a hard ship blocker. UAT downgraded it: local dev runs on an inline token, a persistent `.env.local` is optional. One open follow-up remains — confirm the Vercel variable is scoped to *both* Production and Preview.
**Source:** 01-UAT.md (test 4)

---

## Patterns

### Auth copy-with-hardening
Duplicate the fail-closed token guard verbatim into every independent enforcement point (layout + API helper) rather than sharing one function, and harden the copy beyond the analog it was copied from.

**When to use:** New authenticated surface in a repo where auth is a shared-secret cookie compare with no middleware and existing analogs have known weak spots.
**Source:** 01-01-SUMMARY.md

### `requireAuth(request)` as the literal first statement
Every `/api/community/*` verb calls `const denied = requireAuth(request); if (denied) return denied;` before `ctx.params` is awaited, before body parse, before any store read.

**When to use:** Every route handler on an authenticated namespace — makes the auth check grep-verifiable and impossible to reach around.
**Source:** 01-01-SUMMARY.md, 01-03-SUMMARY.md

### Enum single-source-of-truth
One label `Record` per enum; derive validation allow-list `Set`s from `Object.keys()` and render form `<select>` options from the same record.

**When to use:** Any enum that appears in both a validator and a UI control, especially with localized display strings.
**Source:** 01-01-SUMMARY.md

### Server Component reads store directly; client island mutates via Route Handler + `router.refresh()`
No `revalidatePath` / `revalidateTag` (this repo has no `cacheComponents`); the page re-reads the store on refresh and re-computes derived state server-side.

**When to use:** App Router CRUD on a per-document JSON store where first paint should be fully rendered and mutations are infrequent.
**Source:** 01-01-SUMMARY.md, 01-VERIFICATION.md

### Pure isomorphic domain module
Put ranking/formatting logic in a module that imports only utility libs and types — no `next/*`, no `fs`, no React — so it runs identically server- and client-side and is unit-testable with `node --test`.

**When to use:** Any non-trivial derived-state computation (grouping, sorting, relative dates) that first paints on the server.
**Source:** 01-02-SUMMARY.md

### Localized copy vocabulary centralised in one tested module
`relative-date.ts` owns every Spanish date/count string and plural rule; JSX and the count strip both call into it. `COUNT_LABELS` is the shared word source for both the function and the component.

**When to use:** Any surface with locale-specific pluralization — never re-derive a plural rule in a component.
**Source:** 01-02-SUMMARY.md

### Frozen positive allow-list + `applyPatch` for existing-record mutations
Copy the existing record, overlay only `Object.freeze`'d allow-listed keys read as own-properties of the patch. Never `{ ...existing, ...body }`.

**When to use:** Any endpoint that merges an untrusted partial body into a stored object — one pattern blocks mass assignment and prototype pollution together.
**Source:** 01-03-SUMMARY.md

### Discard = soft status, hidden by grouping
No `DELETE` verb; "remove from view" is a status transition that the read-path grouping filters out (`HIDDEN_STATUSES` Set).

**When to use:** Single-writer JSON stores where accidental or malicious data loss must be structurally impossible.
**Source:** 01-03-SUMMARY.md

### Child owns the fetch, parent owns the keyed pending/error map
`QuickActions` performs the `fetch` + `router.refresh()`; `Cockpit` holds a `quickState` map keyed by loop id and receives transitions via `onStart` / `onSettle` callbacks.

**When to use:** Repeated inline actions across a list where each row needs an isolated spinner/error and two rows must never share one.
**Source:** 01-03-SUMMARY.md

### Overlay `<button>` behind `pointer-events-none` content
Make the whole card clickable with an absolutely-positioned, keyboard-focusable `<button>` layered behind the visible content; the content re-enables pointer events only for its own nested buttons and stops propagation.

**When to use:** A "click anywhere to open" card that also contains real interactive controls — keeps the HTML valid and the two gestures separate.
**Source:** 01-03-SUMMARY.md

### One nav array, two responsive shells
Fixed 240px `<aside>` at `md+` XOR a fixed 56px top bar + sheet drawer below `md`; a single `NAV_ITEMS` array feeds a shared `NavLinks` component used by both. Bounded column `max-h`/`overflow` made `lg:`-only so stacked mobile columns are not nested scroll traps.

**When to use:** Adding mobile support to a desktop-first sidebar layout without forking the nav content.
**Source:** 01-03-SUMMARY.md

### Local-only Node built-in test file
`node:test` + `node:assert/strict`, explicit `.ts` specifiers, `import type` for type-only imports, a pinned `NOW` for determinism. Never referenced by `next build` or Vercel.

**When to use:** A repo with no test runner where you want to prove one pure module without adding a framework or a CI gate. Follow red→green manually (confirm `ERR_MODULE_NOT_FOUND` first).
**Source:** 01-02-SUMMARY.md

### Threat model authored at plan time
Every `PLAN.md` carries a `<threat_model>` block with trust boundaries and a threat register; `/gsd-secure-phase` then short-circuits to L1 grep-depth verification with `threats_open: 0`.

**When to use:** Any phase touching auth, a trust boundary, or untrusted input — front-loading the register makes the retroactive audit cheap and the dispositions explicit (20 threats, all closed here).
**Source:** 01-SECURITY.md

---

## Surprises

### All three plans came in fast, and the logic-heavy slice was the quickest
Plan 01 ≈ 50 min (12 files), Plan 02 ≈ 35 min (10 files), Plan 03 ≈ 45 min (10 files). The TDD/urgency-cascade slice (02) was shorter than the two CRUD/UI slices.

**Impact:** Slicing the phase into three thin vertical cuts kept each plan small enough to execute in one sitting; the pure-function slice benefited most from a tight, testable scope.
**Source:** 01-01/02/03-SUMMARY.md frontmatter, STATE.md

### The tracked ship blocker was already resolved
`DASHBOARD_TOKEN` — carried in STATE.md as "must be set in every environment before Phase 1 ships" — was already a live Vercel variable shared with the existing dashboard surfaces.

**Impact:** Removed the only hard external dependency for shipping the phase; downgraded to a single "confirm Preview scope" follow-up.
**Source:** 01-UAT.md (test 4)

### An unplanned tsconfig change was needed to satisfy two green gates at once
Wanting both `node --test` and `npx tsc --noEmit` to pass forced `allowImportingTsExtensions: true` into `tsconfig.json`.

**Impact:** A shared config file touched by a phase that is otherwise almost entirely additive; judged safe under `noEmit: true` but worth noting for anyone auditing tsconfig history.
**Source:** 01-02-SUMMARY.md

### A plan-02 component had to be structurally rebuilt in plan 03
The `LoopCard` `<button>` shape could not host the plan-03 quick actions and became a `<div>` + overlay button.

**Impact:** A reminder that "wire the callback now, build the UI later" forward-wiring still leaves structural assumptions that the later slice may have to undo.
**Source:** 01-02-SUMMARY.md (Known Stubs), 01-03-SUMMARY.md (Deviations)

### Code review found zero critical and zero blocker issues
3 warnings + 5 info, every warning a raw-API or cosmetic gap that the UI already guards against (empty-title PATCH, no-op save write, past-date "aplazar").

**Impact:** Verification could pass the phase goal on the committed code; all warnings were routed to a follow-up rather than a gap-closure plan.
**Source:** 01-REVIEW.md, 01-VERIFICATION.md

### A `find`-based audit briefly reported a DELETE handler that does not exist
`find … -exec grep -l 'function DELETE' … && echo FOUND` printed "FOUND" purely because `find` exits 0.

**Impact:** Cost a re-verification pass; reinforced using `grep -rn` / `test -z "$(…)"` for existence checks in acceptance gates.
**Source:** 01-03-SUMMARY.md

### Verification closed at `human_needed`, then UAT passed 4/4 with no issues
The four human items — slide-over round-trip, mobile D-15 at 390px/1440px, the D-02 disjoint-cascade product decision, and the env-var prerequisite — all passed cleanly, and Nicola confirmed the assumption A1 product call.

**Impact:** The propose-then-confirm split between automated verification and human UAT worked as intended; no rework resulted from the handoff.
**Source:** 01-VERIFICATION.md, 01-UAT.md
