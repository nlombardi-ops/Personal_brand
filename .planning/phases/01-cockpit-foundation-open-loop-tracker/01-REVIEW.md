---
phase: 01-cockpit-foundation-open-loop-tracker
reviewed: 2026-09-09T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - app/api/community/open-loops/route.ts
  - app/api/community/open-loops/[id]/route.ts
  - app/community-president/layout.tsx
  - app/community-president/page.tsx
  - app/components/community/Cockpit.tsx
  - app/components/community/CommunitySidebar.tsx
  - app/components/community/CountStrip.tsx
  - app/components/community/EmptyState.tsx
  - app/components/community/LoopCard.tsx
  - app/components/community/LoopColumn.tsx
  - app/components/community/LoopSlideOver.tsx
  - app/components/community/NoDateSection.tsx
  - app/components/community/QuickActions.tsx
  - lib/community/loop-defaults.ts
  - lib/community/open-loops-store.ts
  - lib/community/relative-date.ts
  - lib/community/require-auth.ts
  - lib/community/urgency.ts
  - lib/community/urgency.test.ts
  - lib/types.ts
findings:
  critical: 0
  warning: 3
  info: 5
  total: 8
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-09-09
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Reviewed the `/community-president` cockpit surface: two API routes, the auth
gate, the store, the pure grouping/formatting modules, and the client board.

The security-critical parts hold up under adversarial reading:

- `requireAuth()` is the literal first statement of every verb (`GET`/`POST` in
  `open-loops/route.ts`, `PATCH` in `[id]/route.ts`); the three-part fail-closed
  guard is correct and the comparison is exact.
- The layout uses the same guard and calls `redirect()` outside any try/catch.
- The PATCH allow-list is airtight: `applyPatch` never spreads the raw body, only
  iterates the frozen `PATCHABLE_KEYS` via `Object.prototype.hasOwnProperty.call`,
  and `id` / `created_at` / `source` / every LPH field are structurally
  unreachable. Prototype-polluting keys are never read. The blind `as` casts on
  `kind`/`status`/`owner` inside `applyPatch` are safe **only** because
  `validateLoopInput(body,{create:false})` runs first in the route and rejects
  every out-of-enum value (including `null`, `""`, objects via `String()`).
- `urgency.ts` and `relative-date.ts` are genuinely pure — only `date-fns` +
  the `OpenLoop` type. No `next/*`, no `fs`, no React.
- `dangerouslySetInnerHTML` appears nowhere; all free text renders as React
  children.
- The store matches the reference `lib/cv/profile-store.ts` pattern exactly
  (`access: "private"`, `addRandomSuffix: false`, `allowOverwrite: true`,
  `useCache: false` on reads).
- The `urgency.test.ts` suite is thorough and TZ-deterministic; `tsconfig`
  `allowImportingTsExtensions: true` is safe under `noEmit: true`.

No blocker-level defects were found. The findings below are correctness/quality
gaps that surface mainly through the raw API rather than the guarded UI, plus one
UI behaviour bug.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: No-op "Guardar cambios" issues a full-store write and reorders "Sin fecha"

**File:** `app/components/community/LoopSlideOver.tsx:169-184`, `app/components/community/Cockpit.tsx:104-106`, `app/api/community/open-loops/[id]/route.ts:38-50`
**Issue:** When the slide-over is opened in edit mode and the user presses
"Guardar cambios" without changing any field, `buildPatch()` returns `{}`.
Neither the client (`handleSave` → `patchEditingLoop` always fetches) nor the
server short-circuits on an empty patch. `applyPatch` iterates `PATCHABLE_KEYS`,
matches nothing, and still executes `next.updated_at = new Date().toISOString()`,
then `saveOpenLoops(loops)` rewrites the entire document (a full Blob `put` in
production). Because `groupLoopsByUrgency` sorts the `noDate` bucket by
`updated_at` descending (`urgency.ts:29-30,73`), a dateless loop that is "saved"
with no changes silently jumps to the top of the "Sin fecha" section. It also
burns a Blob write on every accidental double-save.
**Fix:** Short-circuit an empty patch on the client:
```ts
function handleSubmit(e: React.FormEvent) {
  // ...existing validation...
  if (mode === "edit" && editingLoop) {
    const patch = buildPatch(editingLoop);
    if (Object.keys(patch).length === 0) {
      setSlideOverOpen(false);
      setEditingLoop(null);
      return;
    }
    onSave(patch);
    return;
  }
  // ...
}
```
and/or make the route return the unchanged loop (no write, no `updated_at` bump)
when `applyPatch` produced no field changes.

### WR-02: PATCH does not re-enforce non-empty `title` / `next_action` — API can persist a loop that violates D-09

**File:** `lib/community/loop-defaults.ts:70-124` (`validateLoopInput`), `lib/community/loop-defaults.ts:162-165` (`applyPatch`)
**Issue:** `[id]/route.ts` calls `validateLoopInput(body, { create: false })` and
its own docstring claims "every supplied field is re-checked … an edit is not a
way around them." That is only true for length caps and enum allow-lists. The
required-ness checks (`if (!title)`, `if (!nextAction)`) are gated behind
`opts.create`. So `PATCH /api/community/open-loops/{id}` with `{"title":""}` or
`{"next_action":"   "}` passes validation, and `applyPatch` trims and writes the
empty string (`if (typeof value === "string") next[key] = value.trim()`). The
result is a stored `OpenLoop` with an empty `title` (D-09 says title and
next_action are required) — `LoopCard` then renders a blank card body and an
`aria-label="Editar bucle: "` with nothing after the colon. The slide-over form
guards this, but the raw API (the surface's stated threat model includes
untrusted document-driven writes in later phases) does not.
**Fix:** In `validateLoopInput`, when a key is *present* in a non-create body,
reject an empty trimmed value:
```ts
if (body.title !== undefined && !title) return "El título no puede quedar vacío.";
if (body.next_action !== undefined && !nextAction)
  return "La próxima acción no puede quedar vacía.";
```

### WR-03: "Aplazar" and the due-date fields accept past dates — "postpone" can move a card into Vencidos

**File:** `app/components/community/QuickActions.tsx:122-133`, `app/components/community/LoopSlideOver.tsx:383-388`
**Issue:** The inline "Aplazar fecha" quick action feeds whatever the native
`<input type="date">` yields straight into `run({ due: value }, "aplazar")` with
no lower bound, and the server only checks the `YYYY-MM-DD` shape
(`loop-defaults.ts:104-108`). Picking a past date via the action whose sole
purpose is to *push a deadline out* immediately relocates the card to the
"Vencidos" column (`urgency.ts:61` `days < 0 → overdue`). The slide-over date
input and its presets have the same missing `min`.
**Fix:** Add `min={format(new Date(), "yyyy-MM-dd")}` to both date inputs, and
(defensively) reject `due` earlier than today in `applyPatch`/`validateLoopInput`
for the postpone path, or at minimum in the quick-action handler:
```ts
onChange={(e) => {
  const value = e.target.value;
  if (!value || value < todayYmd) return;
  setShowDate(false);
  void run({ due: value }, "aplazar");
}}
```

## Info

### IN-01: Client can set `source` / `source_ref` freely on create

**File:** `lib/community/loop-defaults.ts:119-121, 199-219`
**Issue:** `validateLoopInput` accepts any value in `SOURCES` for `body.source`,
and `applyCreateDefaults` copies `body.source` and `body.source_ref` verbatim.
A loop created through the cockpit UI should always be `source: "manual"`, but
`POST /api/community/open-loops` with `{"source":"acta","source_ref":"…"}` is
accepted and stored. Harmless in v1 (nothing reads `source` on the board), but it
weakens provenance for the Phase 3 LPH/propose-then-confirm work that keys off
`source`.
**Fix:** Drop `source`/`source_ref` from `applyCreateDefaults` and hard-code
`source: "manual"` for this route; let the future acta/email ingestion paths set
`source` server-side.

### IN-02: `getOpenLoops` does no array-shape check on the parsed document

**File:** `lib/community/open-loops-store.ts:9-29`
**Issue:** Both branches do `JSON.parse(...) as OpenLoop[]` with no runtime
guard. A syntactically valid but non-array document (e.g. `{}` from a botched
manual Blob edit) is returned as-is; `groupLoopsByUrgency` then throws
`TypeError: loops is not iterable` during server render and the whole
`/community-president` surface 500s instead of degrading to the documented
"empty board" posture. The single-writer whole-file rewrite makes this unlikely
in practice, but the accepted degradation ("store read errors → empty board")
does not actually cover this case.
**Fix:** `const parsed = JSON.parse(text); return Array.isArray(parsed) ? parsed : [];`
in both branches.

### IN-03: `urgency.ts` "runs in the client island" rationale is aspirational

**File:** `lib/community/urgency.ts:1-7`
**Issue:** The header comment justifies the import restrictions by "the same
function runs … in the client island after an optimistic mutation." No client
code imports `groupLoopsByUrgency`; `Cockpit` mutates via `router.refresh()` and
re-receives server-computed `grouped` props. The purity is still worth keeping,
but the stated reason is not currently real and may mislead a future editor into
thinking a client re-group path exists.
**Fix:** Reword the comment to "kept pure so a future client re-group is
possible" or wire the client path if optimistic regrouping is actually wanted.

### IN-04: Mobile drawer is `aria-modal` without focus management

**File:** `app/components/community/CommunitySidebar.tsx:139-169`
**Issue:** The mobile drawer sets `role="dialog" aria-modal="true"` but never
moves focus into the panel on open, never traps Tab, and never restores focus or
locks body scroll on close (contrast with `LoopSlideOver`, which does all of
this). Escape-to-close is handled. Minor a11y gap on the secondary nav surface.
**Fix:** Mirror the `LoopSlideOver` focus-trap/restore effect, or reuse a shared
dialog helper.

### IN-05: Stale `owner_detail` survives an owner-only PATCH via the raw API

**File:** `lib/community/loop-defaults.ts:175-181`
**Issue:** `applyPatch` only clears `owner_detail` when the key is present in the
patch. `PATCH {"owner":"administrador"}` on a loop that had
`owner_detail: "Piso 3"` leaves the stale detail on the record. `LoopCard` and
the slide-over both guard rendering with `OWNER_DETAIL_OWNERS.includes(owner)`,
so it is invisible, and the slide-over's `buildPatch` always sends an explicit
`owner_detail: ""` on owner changes — so this is unreachable from the UI. Noted
only as a data-hygiene gap for direct API use.
**Fix:** In `applyPatch`, when `owner` is being set to a value not in
`OWNER_DETAIL_OWNERS`, `delete next.owner_detail` regardless of whether the patch
carried `owner_detail`.

---

_Reviewed: 2026-09-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
