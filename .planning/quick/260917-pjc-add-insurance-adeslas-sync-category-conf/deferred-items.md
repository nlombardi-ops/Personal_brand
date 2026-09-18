# Deferred Items — 260917-pjc

Pre-existing `npm run lint` failures discovered while verifying this plan, none in files
touched by this plan. Out of scope per deviation rules (scope boundary: only fix issues
directly caused by the current task's changes). Confirmed clean with
`npx eslint lib/drive/parsers.ts lib/drive/sync.ts app/api/dashboard/sync/route.ts
app/dashboard/bills/page.tsx app/components/dashboard/BillsTable.tsx` — zero output.

| File | Issue |
|------|-------|
| `app/components/Contact.tsx:12` | `react/no-unescaped-entities` — unescaped `'` |
| `app/components/References.tsx:48` | `react/no-unescaped-entities` — unescaped `"` (x2) |
| `app/components/cv/CvPreview.tsx:15` | `@typescript-eslint/no-unused-vars` — `meta` unused |
| `app/cv/page.tsx:145` | `react-hooks/set-state-in-effect` — setState called synchronously in effect |
| `app/dashboard/mortgage/page.tsx:2` | `@typescript-eslint/no-unused-vars` — `Home`, `Shield`, `CreditCard`, `Bell` unused imports |
| `lib/cv/render.tsx:230` | `jsx-a11y/alt-text` — `Image` missing `alt` prop |
