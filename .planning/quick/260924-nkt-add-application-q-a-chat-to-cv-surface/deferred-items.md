# Deferred Items — quick-260924-nkt

Out-of-scope discoveries found while executing this plan. Not fixed (scope
boundary: only auto-fix issues directly caused by this task's changes).

## Pre-existing `npm run lint` failures (unrelated to this plan)

Confirmed via `git stash` before making any change in this session — these
four errors and six warnings exist on the base branch, in files this plan
never touches:

- `app/components/Contact.tsx:12` — `react/no-unescaped-entities` (unescaped `'`)
- `app/components/References.tsx:48` — `react/no-unescaped-entities` (unescaped `"`, x2)
- `app/cv/page.tsx:145` — `react-hooks/set-state-in-effect` (setState called synchronously in an effect)
- `app/components/cv/CvPreview.tsx:15` — unused `meta` var (warning)
- `app/dashboard/mortgage/page.tsx:2` — unused icon imports `Home`, `Shield`, `CreditCard`, `Bell` (warnings)
- `lib/cv/render.tsx:230` — `jsx-a11y/alt-text` missing `alt` prop (warning)

`npx tsc --noEmit` is clean. `npx eslint` scoped to this plan's three changed
files (`app/api/cv/answer-chat`, `app/cv/answers`, `app/components/cv/CvSidebar.tsx`)
is also clean. The repo-wide `npm run lint` gate fails only because of the
items above, none of which are `files_modified` by this plan.
