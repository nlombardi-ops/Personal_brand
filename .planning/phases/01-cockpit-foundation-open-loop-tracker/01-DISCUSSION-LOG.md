# Phase 1: Cockpit Foundation & Open-Loop Tracker - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-08
**Phase:** 1-Cockpit Foundation & Open-Loop Tracker
**Areas discussed:** Urgency ranking & grouping, Capture flow, Cockpit view & layout

(Not selected for discussion: Completed loops & sidebar — left to planning / per-phase.)

---

## Urgency ranking & grouping

### Q1 — Overdue loop where you're also waiting on someone else: which group?

| Option | Description | Selected |
|--------|-------------|----------|
| Waiting-on-others wins | Ball in someone else's court → waiting group regardless of date; overdue/due-soon only hold loops where you act next | |
| Overdue wins | Blown date pulls it into overdue even while waiting; waiting group holds only not-yet-overdue waits | |
| Show in both | Appears in overdue AND tagged "waiting on <owner>"; nothing hidden from overdue | ✓ |

**User's choice:** Show in both.
**Notes:** User first asked to step back and re-ground on what an "OpenLoop" is; concept was re-explained with concrete comunidad examples, then the question was re-asked and answered.

### Q2 — What counts as "due-soon", and where do no-due-date loops go?

| Option | Description | Selected |
|--------|-------------|----------|
| 7 days, no-date separate | Due-soon = 7 days; no-date loops in their own bottom group | |
| 14 days, no-date separate | Due-soon = 14 days; no-date loops in their own bottom group | ✓ |
| 7 days, no-date hidden | Due-soon = 7 days; no-date loops not shown in the passive cockpit | |
| You decide | Pick during planning | |

**User's choice:** 14 days, no-date = separate.

### Q3 — Ordering within each group?

| Option | Description | Selected |
|--------|-------------|----------|
| By date only | Overdue: most overdue first; Due-soon: soonest first; No-date: most recently updated | ✓ |
| Date, then kind | Same, tiebreak incidencia/obra above follow_up/commitment | |
| Date, then staleness | Same, tiebreak by how long since last touched | |

**User's choice:** By date only.

### Q4 — What puts a loop in the waiting-on-others group: status or owner?

| Option | Description | Selected |
|--------|-------------|----------|
| Status drives it | Waiting only when status = waiting_on_other; owner just records who | |
| Owner drives it | Any loop with owner ≠ me counts automatically | |
| Either one | status = waiting_on_other OR owner ≠ me | ✓ |

**User's choice:** Either one.

**Continue check:** Moved on to Capture flow. Blocked-loop placement and done/dropped
visibility left to planning.

---

## Capture flow

### Q1 — What surface does create/edit open in?

| Option | Description | Selected |
|--------|-------------|----------|
| Slide-over panel | Panel from the right, cockpit visible behind; new pattern for this app | ✓ |
| Modal dialog | Centered dialog over dimmed cockpit; simplest, tighter on mobile | |
| Dedicated page | /loops/new and /loops/[id]/edit; room to grow, more clicks | |

**User's choice:** Slide-over panel.

### Q2 — Minimum fields to save a new loop?

| Option | Description | Selected |
|--------|-------------|----------|
| Title + kind only | Everything else optional; fastest capture | |
| Title + kind + next action | Forces naming the single next step every time | ✓ |
| Title + kind + owner + next action | Also forces "who's next"; most friction | |

**User's choice:** Title + kind + next action. (status defaults open, owner defaults me, due optional.)

### Q3 — Lock the enum vocabularies from the data-model sketch?

| Option | Description | Selected |
|--------|-------------|----------|
| Lock as-is | Use the three enum sets exactly; owner_detail free text shown when owner is neighbour/provider | ✓ |
| Lock, owner_detail always visible | Same enums, owner-detail box always shown | |
| I want to adjust one | Something wrong/missing for the comunidad | |

**User's choice:** Lock as-is.

### Q4 — How does closing/updating a loop work from the cockpit?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline row actions | Quick buttons per row: mark done, mark waiting, bump due; full edit in slide-over | ✓ |
| Everything in the slide-over | Click loop → slide-over with all fields; nothing inline | |
| Status inline, rest in panel | Only a status dropdown inline; every other edit in slide-over | |

**User's choice:** Inline row actions.

**Continue check:** Chose to write the context doc, then opted to also discuss Cockpit view & layout.

---

## Cockpit view & layout

### Q1 — Overall structure on open?

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked group sections | One vertical scroll, collapsible sections by priority | |
| Kanban-style columns | Overdue / Due-soon / Waiting side by side as columns of cards | ✓ |
| Single list, group badges | One flat sorted list, colored badge per row | |

**User's choice:** Kanban-style columns.

### Q2 — Which columns, and mobile behaviour?

| Option | Description | Selected |
|--------|-------------|----------|
| 3 columns + No-date below, stack on mobile | Overdue/Due-soon/Waiting columns; No-date collapsed beneath; columns stack vertically on mobile; no drag-and-drop | ✓ |
| 4 equal columns, stack on mobile | No-date as a 4th equal column | |
| 3 columns, swipe on mobile | Keep column metaphor on mobile via swipe/tabs | |

**User's choice:** 3 columns + No-date tucked below, stack on mobile.

### Q3 — What shows on each loop card?

| Option | Description | Selected |
|--------|-------------|----------|
| Title, next action, due, owner, kind | Full triage card | |
| Title, due, owner only | Lean card; next action + kind only in slide-over; more cards per screen | ✓ |
| Title, next action, due + kind color | Kind as left-border color; owner only if not "me" | |

**User's choice:** Title, due, owner only.

### Q4 — Top of the cockpit and first-run state?

| Option | Description | Selected |
|--------|-------------|----------|
| Count strip + friendly empty state | Header "X overdue · Y due soon · Z waiting"; zero-loops shows explainer + "Add your first loop"; no seed data | ✓ |
| Just a title + Add button | Minimal header; plain "No open loops" empty state | |
| Count strip, minimal empty state | Count strip reads all zeros + Add button | |

**User's choice:** Count strip + friendly empty state.

**Continue check:** Ready for context.

---

## Claude's Discretion

- Due-date input mechanics (calendar picker vs relative presets), validation/error copy, slide-over field layout.
- Placement of `blocked`-status loops (expected: with waiting-on-others).
- Whether `done`/`dropped` get an archive / "all loops" view in Phase 1 or later.
- Whether LPH-aware `OpenLoop` fields are declared now (nullable) or in Phase 3.
- Naming of the shared auth helper module.

## Deferred Ideas

- Visual palette / design tokens for the new surface → UI spec (`/gsd-ui-phase 1`).
- "All loops" / archive view for done/dropped loops.
- Sidebar placeholder entries for future surfaces (Documents, Juntas, Q&A) — keep Phase 1 sidebar minimal.
- Drag-and-drop between columns — rejected for v1.
- Dedicated loop detail page — slide-over suffices for Phase 1; revisit when documents/presupuestos/acuerdos attach.
- All REQUIREMENTS.md "v2" and "Out of Scope" items remain out.
