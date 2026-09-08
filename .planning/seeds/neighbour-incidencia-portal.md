---
title: Neighbour-facing incidencia intake portal
trigger_condition: >
  Smart Community President cockpit v1 is in daily use by Nicola and has proven
  useful for at least one full junta cycle. At that point, evaluate opening a
  public intake form AND forking the feature to its own repo.
planted_date: 2026-09-08
---

# Neighbour-facing incidencia intake portal

## The idea

A public web page where any vecino can report a fact or a problem about the
building — "el ascensor hace un ruido raro", "hay una gotera en el garaje",
"la luz del portal 3 está fundida". Nicola triages each submission into an
`OpenLoop` (see `.planning/notes/data-model-sketch.md`).

## Why it's a seed, not v1

- v1 is deliberately a **private president's cockpit** — single user, manual feed.
  Adding neighbour access means auth/identity for owners, moderation, notifications,
  spam handling, and a support surface. That is a different product with a different
  risk profile.
- Better to learn what a real open-loop actually looks like from one junta cycle
  before designing the intake schema neighbours will fill.

## What must be true in v1 for this to be cheap later

- `OpenLoop.source` already supports a `neighbour_form` value.
- A separate `Submission` entity exists conceptually, holding only what a neighbour
  types + photos, with `status = triage`.
- President-internal fields (LPH deadlines, owner routing, presupuestos) live on
  `OpenLoop`, never on `Submission` — so publishing the form does not leak internals.

## This is also the fork moment

Opening the portal is the natural point to move Smart Community President out of
`Personal_brand` into its own repo with its own deploy, since it stops being
"Nicola's personal tool" and becomes multi-tenant-shaped (every comunidad has a
president with this exact problem).
