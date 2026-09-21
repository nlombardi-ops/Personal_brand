# Deferred Items — quick-260921-k2p

Pre-existing issues discovered during execution that are out of scope for this
plan (structural mobile-shell fix only). Not fixed here per the deviation-rules
scope boundary — logged instead.

## `react-hooks/set-state-in-effect` in `app/cv/page.tsx:145`

- **Found during:** Task 2 verification (`npx eslint app/components/cv app/cv`)
- **Pre-existing:** confirmed via `git diff --stat HEAD -- app/cv/page.tsx` —
  zero diff at the time this was found, i.e. the violation predates this plan.
- **Not touched by this plan's Task 3** — Task 3 edits the same file for
  layout/className reasons only, around different line ranges (root div,
  panels, centring blocks, preview wrapper). The `setQuestionState("loading")`
  call inside a `useEffect` at line ~145 is unrelated application logic.
- **Recommendation:** address in a dedicated fix/refactor task — likely needs
  restructuring the analyze→angle/questions effect chain, not a one-line
  change.
