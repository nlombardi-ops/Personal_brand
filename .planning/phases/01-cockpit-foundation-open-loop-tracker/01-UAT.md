---
status: testing
phase: 01-cockpit-foundation-open-loop-tracker
source: [01-VERIFICATION.md]
started: 2026-09-09T00:00:00Z
updated: 2026-09-09T00:00:00Z
---

## Current Test

number: 1
name: Slide-over create / edit / discard round-trip in the browser
expected: |
  Logged in, at /community-president: click "Añadir bucle" → the slide-over animates in from
  the right over the still-visible board; fill Título + Tipo + Próxima acción, press "Crear
  bucle" → the panel closes and the new loop appears on the board; hard-reload the page → the
  loop is still there. Then click a card → the slide-over opens in edit mode ("Editar bucle");
  change the title, owner and due date, press "Guardar cambios", hard-reload → all three
  changes persist. Then open a loop, click "Descartar bucle" → an inline confirmation appears
  ("¿Descartar este bucle? Dejará de aparecer en el panel."); confirm → the card leaves the
  board but the record is still in data/community-open-loops.json with status "dropped".
  Also check: Esc and a backdrop click both close the panel; focus returns to the trigger on
  close; with OS "reduce motion" on, the panel appears without the slide animation.
awaiting: user response

## Tests

### 1. Slide-over create / edit / discard round-trip in the browser
expected: The slide-over animates in from the right over the still-visible board; on submit the panel closes and the new loop appears; after a full reload the loop is still present. Editing a loop's title/owner/due and saving persists all three across a reload. "Descartar bucle" → confirm → the card leaves the board but stays in data/community-open-loops.json with status dropped. Esc / backdrop-click dismiss work; focus trap + restore work; reduce-motion disables the slide animation.
result: [pending]

### 2. Mobile (D-15) at 390px, plus 1440px no-regression
expected: |
  At a 390px viewport (device toolbar): the sidebar is a top bar with a working hamburger
  drawer (opens over a backdrop, closes on backdrop click / Esc / navigating); the three
  columns stack vertically in priority order Vencidos → Vencen pronto → A la espera de otros,
  then the "Sin fecha" section; every quick-action button is visible without hovering and its
  tap target is at least 44px; the slide-over is near-full-width and its footer stays reachable
  when the on-screen keyboard is open.
  At 1440px: three side-by-side columns, fixed 240px left sidebar, 420px slide-over — nothing
  regressed from the desktop layout.
result: [pending]

### 3. D-02 / assumption A1 — overdue-and-waiting loop placement (product decision)
expected: |
  Create an overdue loop whose owner is "administrador" (or whose status is waiting_on_other).
  It appears in the "Vencidos" column ONLY, carrying an "Administrador" owner chip that names
  who it is waiting on — it does NOT also appear under "A la espera de otros", and the header
  count strip counts it once.
  Decision to confirm: "Your overdue loops that are waiting on the administrador show up in
  Vencidos with an Administrador chip, not also under A la espera — OK?" If dual-listing is
  wanted instead, groupLoopsByUrgency must push into multiple arrays and the count strip
  switches to unique-loop wording (a small follow-up change).
result: [pending]

### 4. DASHBOARD_TOKEN set in every environment before ship
expected: |
  DASHBOARD_TOKEN is set in the local .env, in Vercel Preview, and in Vercel Production.
  With it set: a valid dashboard_auth cookie passes the layout gate and requireAuth(); the
  surface loads and the API returns 200/201.
  Without it: the layout redirects to /dashboard/login and every /api/community/* route returns
  401 — the surface is unusable rather than exposed (correct fail-closed behaviour), but the
  var MUST be set for the phase to actually ship. This is a pre-existing STATE.md blocker;
  .env is not writable from the build agent and Vercel env vars are out of band.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

<!-- Appended by /gsd-verify-work only when a test reports an issue -->
