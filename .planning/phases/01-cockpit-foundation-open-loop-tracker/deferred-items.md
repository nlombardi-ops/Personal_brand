# Deferred Items — Phase 01

Out-of-scope discoveries logged during execution. Not fixed (scope boundary: only
auto-fix issues directly caused by the current task's changes).

## Pre-existing `npm run lint` failures (baseline is red before Phase 1)

`npm run lint` exits 1 on `main` **before any Phase 1 change**, due to 4 errors +
6 warnings in files unrelated to this phase:

| File | Line | Rule | Severity |
|------|------|------|----------|
| `app/components/Contact.tsx` | 12:18 | `react/no-unescaped-entities` | error |
| `app/components/References.tsx` | 48:78, 48:88 | `react/no-unescaped-entities` | error |
| `app/cv/page.tsx` | 145:5 | `react-hooks/set-state-in-effect` | error |
| `app/components/cv/CvPreview.tsx` | 15:71 | `no-unused-vars` | warning |
| `app/dashboard/mortgage/page.tsx` | 2:44–2:70 | `no-unused-vars` | warning (x4) |
| `lib/cv/render.tsx` | 230:11 | `jsx-a11y/alt-text` | warning |

Impact on Phase 1: the plan's `<automated>` verify chains `npm run lint`, which
fails on this pre-existing debt. All **new** Phase 1 files
(`app/community-president/**`, `app/components/community/**`, `lib/community/**`)
lint clean — verified with `npx eslint <the new paths>` returning 0 problems.

Recommendation: a separate `/gsd-quick` to clear the lint baseline, or accept the
red baseline and gate Phase 1 on `npx tsc --noEmit` + a scoped
`npx eslint app/community-president app/components/community lib/community`.
