---
phase: 02-documents-presupuestos-workflow
plan: 03
subsystem: api
tags: [nextjs, node-test, money-cents, presupuestos]

# Dependency graph
requires:
  - phase: 02-01
    provides: Document type, dual-mode documents-store.ts, document-defaults.ts (validateDocumentInput/applyDocumentPatch/PATCHABLE_DOCUMENT_KEYS), PATCH /api/community/documents/[id]
  - phase: 02-02
    provides: LoopDetailPanel.tsx (D-17 detail-mode panel with the Slice 3 insertion placeholder), documentsForLoop/attachLoopId/detachLoopId helpers, AttachDocumentControl.tsx pattern
provides:
  - Presupuesto/PresupuestoStatus type (lib/types.ts) — provider/base_imponible_cents/iva_pct/total_cents/scope/received_at/valid_until/document_id/status, compare-only by design (no decision field)
  - Dual-mode presupuestos-store.ts (getPresupuestos/savePresupuestos, Blob-or-local)
  - presupuesto-defaults.ts — DEFAULT_IVA_PCT, computeTotalCents (half-up integer-cents rounding), parseEurosToCents (Spanish keyboard formats), formatEuros, PATCHABLE_PRESUPUESTO_KEYS (total_cents deliberately absent), validatePresupuestoInput, applyPresupuestoPatch (unconditional total recompute), applyPresupuestoCreateDefaults
  - presupuesto-compare.ts — pure isomorphic comparePresupuestos (cheapest-by-total with first-in-order tie resolution, per-quote deltas, archived exclusion, stable sort by total/received_at, cheapestId invariant across sort keys)
  - GET/POST /api/community/presupuestos (loop_id filter, server-enforced obra-kind gate), PATCH /api/community/presupuestos/[id] (sole mutation path)
  - PresupuestoForm, PresupuestoComparison components; obra-gated PRESUPUESTOS section in LoopDetailPanel with list + inline edit + archive controls
affects: [phase-2-verification, any future phase reading Presupuesto records]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Integer-cents money with a single Math.round rounding step (computeTotalCents) — server always recomputes total_cents from the merged base+IVA on every create and PATCH, never trusts a client-sent total; total_cents is structurally absent from PATCHABLE_PRESUPUESTO_KEYS"
    - "A second pure, isomorphic comparison module (presupuesto-compare.ts) following urgency.ts's exact shape — cheapestId computed before sorting so the highlight is invariant under the active sort key"
    - "Server-side business-rule gate beyond auth: the obra-kind check on POST /api/community/presupuestos lives in the route, not only in which UI section renders (D-10 enforced against hand-crafted requests too)"

key-files:
  created:
    - lib/community/presupuesto-defaults.ts
    - lib/community/presupuesto-defaults.test.ts
    - lib/community/presupuesto-compare.ts
    - lib/community/presupuesto-compare.test.ts
    - lib/community/presupuestos-store.ts
    - data/community-presupuestos.json
    - app/api/community/presupuestos/route.ts
    - app/api/community/presupuestos/[id]/route.ts
    - app/components/community/PresupuestoForm.tsx
    - app/components/community/PresupuestoComparison.tsx
  modified:
    - lib/types.ts
    - app/community-president/page.tsx
    - app/components/community/Cockpit.tsx
    - app/components/community/LoopDetailPanel.tsx

key-decisions:
  - "PresupuestoComparison is only mounted when a loop has at least one non-archived presupuesto, so its own 'Aún no hay presupuestos que comparar.' empty state never stacks visually under the plain list's 'Aún no has registrado ningún presupuesto.' empty state — the plan specifies both empty states independently but doesn't address them co-occurring."
  - "Task 3's inline Editar form is built directly inside LoopDetailPanel (not by extending PresupuestoForm into an edit mode) because Task 3's files_modified list only names the [id] route and LoopDetailPanel.tsx, not PresupuestoForm.tsx — keeping the create-only form single-purpose and putting the edit form as its own sibling form in the row, matching the plan's 'own sibling form' wording."
  - "Single top-level editingPresupuestoId/editForm state (not a form-state map keyed by id) since only one row can be in edit mode at a time by construction — the pending/error maps ARE keyed by id, per the plan's explicit requirement that one row's spinner never blocks another."

patterns-established:
  - "computeTotalCents/formatEuros/parseEurosToCents form the single money-arithmetic boundary for this entity — no component does /100 or .toFixed() cents math outside these three functions (grep-asserted in PresupuestoComparison.tsx)."

requirements-completed: [LOOP-03]

coverage:
  - id: D1
    description: "On an obra-kind OpenLoop, Nicola records multiple Presupuestos (provider, base imponible, IVA %, scope, optional received/valid dates, optional linked Document) with a server-computed integer-cents total that persists across reload; non-obra loops show no presupuesto section (server-enforced, not just UI-hidden)."
    requirement: "LOOP-03"
    verification:
      - kind: unit
        ref: "lib/community/presupuesto-defaults.test.ts (42 tests: computeTotalCents half-up rounding, parseEurosToCents Spanish-keyboard formats, validatePresupuestoInput, applyPresupuestoPatch unconditional recompute, applyPresupuestoCreateDefaults, PATCHABLE_PRESUPUESTO_KEYS)"
        status: pass
      - kind: integration
        ref: "curl auth-matrix + POST/GET against a live `npm run dev` instance: non-obra loop POST returns 400 and writes no record; obra-loop POST with base 123456/iva 21 returns 201 with total_cents 149382; a spoofed total_cents in the same POST body still stores 149382; GET ?loop_id= filters correctly; unauthenticated GET returns 401"
        status: pass
    human_judgment: true
    rationale: "Visual confirmation of the live total preview, the multi-line scope textarea, and the obra-gated section's absence in a real browser DOM needs a running dev server session — the curl/unit evidence above proves the data and auth contracts, not the rendered UI."
  - id: D2
    description: "The attributes x quotes comparison table reads provider/base/IVA/total/scope/received/valid/documento per quote, highlights the cheapest total, spells out each delta, re-sorts by total or received date without the highlight moving, and scrolls horizontally inside its own container."
    requirement: "LOOP-03"
    verification:
      - kind: unit
        ref: "lib/community/presupuesto-compare.test.ts (13 tests: cheapest+deltas incl. ties, archived exclusion incl. all-archived-equals-empty, stable sort by total and by received_at with nulls/absent last, cheapestId invariance across sort keys, non-mutation)"
        status: pass
      - kind: other
        ref: "grep gates: overflow-x-auto present, formatEuros used >=2x with zero ad-hoc /100 or toFixed cents arithmetic, comparePresupuestos is the only min/delta source, no elegir/recomend/ganador vocabulary, no framework imports in presupuesto-compare.ts — all pass; tsc/eslint clean"
        status: pass
    human_judgment: true
    rationale: "The visual table layout (sticky row labels, tinted cheapest column, horizontal scroll containment at 390px, the linked-document 'Ver' link opening inline) needs a running browser to confirm — not reproducible from unit tests or curl in this non-interactive session."
  - id: D3
    description: "A recorded presupuesto can be corrected (server recomputes total_cents) or archived (kept, hidden from list and comparison, highlight moves to the next cheapest) through the single allow-listed PATCH endpoint; no decision/winner/accept/reject vocabulary or control exists anywhere in the presupuesto surface."
    requirement: "LOOP-03"
    verification:
      - kind: integration
        ref: "curl against a live `npm run dev` instance: PATCH base_imponible_cents recomputes total_cents (100000->200000 @21% gives 242000); PATCH scope-only leaves total_cents byte-identical; PATCH carrying total_cents/id/loop_id changes none of them; PATCH status:archived returns 200 and the record stays in the JSON store with status archived; malformed JSON returns 400 Invalid JSON; iva_pct:150 returns 400 with a Spanish message; PATCH with no cookie returns 401"
        status: pass
      - kind: other
        ref: "grep gates: PATCH is the only exported verb on the [id] route, applyPresupuestoPatch used (never a body spread), no DELETE anywhere under app/api/community/, no aceptar/rechazar/elegir/ganador vocabulary in LoopDetailPanel.tsx — all pass; tsc/eslint clean; all 4 node --test suites (presupuesto-defaults, presupuesto-compare, document-defaults, urgency = 118 tests) green"
        status: pass
    human_judgment: true
    rationale: "Visual confirmation that the highlight actually re-renders to a different column after archiving the cheapest quote, and that the inline edit form pre-fills and the confirm-to-archive step reads correctly, needs a running browser — the curl evidence proves the server-side contract, not the client re-render."

duration: 55min
completed: 2026-09-18
status: complete
---

# Phase 2 Plan 3: Presupuestos Comparison Workflow (LOOP-03) Summary

**Integer-cents Presupuesto entity on obra-kind loops with a server-computed IVA total, a pure `comparePresupuestos` powering a sortable attributes x quotes comparison table with an invariant cheapest highlight, and a single allow-listed PATCH endpoint for correcting or archiving a quote.**

## Performance

- **Duration:** ~55 min
- **Completed:** 2026-09-18
- **Tasks:** 3
- **Files modified:** 14 (10 created, 4 modified)

## Accomplishments

- `Presupuesto`/`PresupuestoStatus` type and `presupuesto-defaults.ts`: `computeTotalCents` (half-up integer-cents rounding — `computeTotalCents(123456, 21) === 149382` exactly), `parseEurosToCents` (accepts `1234.56`, `1234,56`, `1.234,56`, bare integers; rejects negatives and ambiguous double-separator strings), `formatEuros`, and the frozen `PATCHABLE_PRESUPUESTO_KEYS` with `total_cents` deliberately absent — 42/42 `node --test` assertions passing
- `GET`/`POST /api/community/presupuestos`: the obra-kind gate is enforced server-side (a hand-crafted POST against a non-obra loop returns 400 and writes nothing), and a client-sent `total_cents` is silently overwritten by the server's own computation
- `presupuesto-compare.ts`: a pure, isomorphic `comparePresupuestos` — cheapest-by-total with first-in-input-order tie resolution, a delta of 0 for every co-cheapest quote (not only the flagged one), archived quotes fully excluded (an all-archived list behaves like the empty list), stable sort by total or by received date with nulls sorted last, and `cheapestId` invariant across both sort keys — 13/13 tests passing
- `PresupuestoComparison`: the D-18 attributes x quotes table (8 rows: Proveedor, Base imponible, IVA %, Total, Alcance, Recibido, Válido hasta, Documento), scrolling horizontally inside its own `overflow-x-auto` container, the cheapest column tinted and labelled "Más barato" with "+X €" deltas on the rest, a linked-document "Ver" proxy link that degrades to plain text for an archived/missing target
- `PATCH /api/community/presupuestos/[id]`: the sole mutation path — verified live to recompute the total unconditionally from the merged record, leave the total byte-identical on a scope-only edit, reject a spoofed `total_cents`/`id`/`loop_id`, and archive (kept, hidden) rather than delete
- `LoopDetailPanel`'s obra-gated PRESUPUESTOS section: list + comparison + create form (Task 1/2) plus per-row Editar (inline sibling form, pre-filled) and Archivar (confirm step) controls with a keyed pending/error map (Task 3)

## Task Commits

Each task was committed atomically:

1. **Task 1: Record a presupuesto on an obra loop and see it listed there** - `1f9f685` (feat, TDD RED+GREEN combined per the same local-test convention as 02-01/02-02)
2. **Task 2: Line the quotes up side by side with the cheapest flagged and the difference spelled out** - `34418cf` (feat, TDD RED+GREEN combined)
3. **Task 3: Correct a figure or retire a quote that is no longer valid** - `4881e01` (feat)

_Both TDD-marked tasks (1 and 2) wrote the failing test file first, confirmed a module-resolution error (RED), then implemented until green, then committed test+implementation together as a single atomic task commit — the same convention 02-01 and 02-02 used, since these local-only `node --test` suites are never run by CI and the plan itself specifies one commit per task._

## Files Created/Modified

- `lib/types.ts` — `PresupuestoStatus`, `Presupuesto` interface under the Smart Community President banner, with an explicit comment marking the entity as compare-only (D-11) without enumerating the rejected field names
- `lib/community/presupuesto-defaults.ts` — `DEFAULT_IVA_PCT`, `computeTotalCents`, `parseEurosToCents`, `formatEuros`, `PATCHABLE_PRESUPUESTO_KEYS`, `validatePresupuestoInput`, `applyPresupuestoPatch`, `applyPresupuestoCreateDefaults`
- `lib/community/presupuesto-defaults.test.ts` — local-only `node --test`, 42 assertions
- `lib/community/presupuesto-compare.ts` — pure isomorphic `comparePresupuestos`, `PresupuestoSortKey`, `ComparisonRow`, `ComparisonResult`
- `lib/community/presupuesto-compare.test.ts` — local-only `node --test`, 13 assertions
- `lib/community/presupuestos-store.ts` — `getPresupuestos`/`savePresupuestos`, Blob-or-local dual mode
- `data/community-presupuestos.json` — committed `[]` seed
- `app/api/community/presupuestos/route.ts` — `GET` (with `?loop_id=` filter) and `POST` (server-enforced obra-kind gate, server-computed total)
- `app/api/community/presupuestos/[id]/route.ts` — `PATCH` only; frozen-key overlay via `applyPresupuestoPatch`, unconditional total recompute
- `app/components/community/PresupuestoForm.tsx` — create form: euros-as-text input converted on submit, live (non-authoritative) total preview, optional document link
- `app/components/community/PresupuestoComparison.tsx` — the sortable attributes x quotes comparison table
- `app/components/community/LoopDetailPanel.tsx` — obra-gated PRESUPUESTOS section: comparison, list, create toggle, per-row Editar/Archivar
- `app/community-president/page.tsx` — reads `getPresupuestos()`, resolves `presupuestosByLoop` (obra loops only, non-archived) server-side
- `app/components/community/Cockpit.tsx` — threads `presupuestosByLoop` through to `LoopDetailPanel`

## Decisions Made

- `PresupuestoComparison` only mounts when a loop has at least one non-archived presupuesto, so its own empty state never stacks under the plain list's empty state when both are simultaneously empty.
- Task 3's inline edit form lives directly in `LoopDetailPanel.tsx` as its own sibling `<form>`, rather than adding an edit mode to `PresupuestoForm.tsx` — consistent with Task 3's `files_modified` list, which does not include `PresupuestoForm.tsx`.
- A single `editingPresupuestoId`/`editForm` pair (not a map) tracks which row is being edited, since only one row can be in edit mode at once; the pending/error state IS a map keyed by presupuesto id, satisfying the "one row's spinner never blocks another" requirement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reworded two comments containing the literal substring `<form`**
- **Found during:** Task 1 and Task 2 verification (`grep -c '<form'` acceptance gates)
- **Issue:** A comment in `PresupuestoForm.tsx` used the literal text `<form>` to explain "this is its own form element", and a comment in `PresupuestoComparison.tsx` used the word "elegir" inside quotes while explaining what the highlight must NOT imply — both tripped their own file's grep-count acceptance gate as false positives (no actual extra `<form>` JSX and no actual "choose" call-to-action existed).
- **Fix:** Reworded both comments to describe the same constraint without the literal trigger text.
- **Files modified:** `app/components/community/PresupuestoForm.tsx`, `app/components/community/PresupuestoComparison.tsx`
- **Verification:** `grep -c '<form' app/components/community/PresupuestoForm.tsx` now returns 1 (the real `<form>` element only); `grep -riEc 'elegir|recomend|ganador|mejor opción' app/components/community/PresupuestoComparison.tsx` now returns 0.
- **Committed in:** `1f9f685` (Task 1), `34418cf` (Task 2)

### Noted, not fixed — plan-authored grep-count artifacts

Same category of artifact documented in 02-01-SUMMARY.md and 02-02-SUMMARY.md: several of this plan's grep-count assertions expect an import-count-excluded call count, but `grep -c` counts LINES, and a named import used once produces import-line + call-line = 2, not 1:

- `grep -c 'requireAuth' app/api/community/presupuestos/route.ts` — plan expects `2`, actual is `3` (1 import + 2 calls, one per exported verb).
- `grep -c 'requireAuth' 'app/api/community/presupuestos/[id]/route.ts'` — plan expects `1`, actual is `2` (1 import + 1 call).
- `grep -c 'applyPresupuestoPatch' 'app/api/community/presupuestos/[id]/route.ts'` — plan expects `1`, actual is `2` (1 import + 1 call).

Not "fixed" for the same reason as 02-01/02-02: removing the import statement, or deviating from the established analog pattern (`open-loops/route.ts` has the identical `requireAuth` x 3 for the identical reason) to force the grep count down would be strictly worse than the count mismatch itself. The underlying invariant each gate intends to check — `requireAuth` present and the literal first statement of every exported verb, `applyPresupuestoPatch` used and never a body spread — is independently verified true by direct inspection, by the adjacent `grep -cE '\.\.\.body|\.\.\.patch'` gate (returns 0), and by the live curl behavior tests documented in the coverage block above.

---

**Total deviations:** 2 auto-fixed (Rule 1, grep-false-positive comment rewords); 3 noted pre-existing plan-authoring grep-count artifacts (no code change — same class as 02-01's and 02-02's, not implementation defects).
**Impact on plan:** No scope creep. Every security/correctness invariant in the threat register (mass-assignment mitigation on `total_cents`/`id`/`loop_id`/`created_at`, stored-XSS mitigation via React text children only, prototype-pollution immunity, auth-first on all three verbs, server-side obra-kind enforcement, no request-body logging, input caps, degrade-not-break for an archived/missing linked document, zero new packages) is independently grep- and test-verified and passes cleanly. All four `node --test` suites (presupuesto-defaults, presupuesto-compare, document-defaults, urgency — 118 tests total), `npx tsc --noEmit`, and the path-scoped `npx eslint` command are clean.

## Issues Encountered

None beyond the grep-count artifacts and comment rewording documented above. A local `npm run dev` session on a non-default port with `DASHBOARD_TOKEN` set was used to verify every route behavior in the plan's `<verification>` item 7 auth matrix and the POST/PATCH behavioral acceptance criteria end to end (obra-kind gate, total computation and recompute, spoofed-field rejection, archive-keeps-the-record, 400/401 paths) — the dev-mode local JSON stores this touched (`data/community-open-loops.json`, `data/community-presupuestos.json`) were reset back to their committed `[]` seed state afterward via `git checkout` / a fresh `[]` write before any commit, so no test data leaked into the committed seeds.

## User Setup Required

None - no external service configuration required. (The Blob token requirement from 02-01 already covers the store's production path; no new env vars.)

## Next Phase Readiness

- All ROADMAP Phase 2 success criteria 3 and 4 are met by this plan: multiple Presupuestos recorded on an obra loop with provider/amount/scope/dates/optional-document, read side by side with the cheapest flagged and deltas spelled out.
- The manual UAT items (live total preview and multi-line scope rendering in a real browser, the comparison table's sticky-column/tinted-highlight/horizontal-scroll behavior at 390px and 1440px, the inline edit form's pre-fill and the archive confirm step's visual re-render, the "Documento" cell's inline PDF open) are outstanding — they require a running `npm run dev` session with visual confirmation and are explicitly out of scope for this non-interactive execution session. Recorded as `human_judgment: true` in the `coverage:` block above for the verifier to route to UAT. The product question already flagged in the plan's `<verification>` item 8 — whether changing a loop's kind away from obra should silently hide its presupuestos or warn — is still open for Nicola.
- This is the last plan in Phase 2. No blockers for the phase-level goal-backward verification sweep (upload a PDF, reopen it, attach it to a loop, open it from the loop, record three presupuestos on an obra loop, read them side by side).

---
*Phase: 02-documents-presupuestos-workflow*
*Completed: 2026-09-18*

## Self-Check: PASSED

All 14 files listed under "Files Created/Modified" verified present on disk. All 3 task commit hashes (`1f9f685`, `34418cf`, `4881e01`) verified present in `git log`.
