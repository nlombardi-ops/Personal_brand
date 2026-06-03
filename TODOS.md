# TODOS

## Design

### Create custom favicon
**What:** Replace the default Next.js favicon with a custom NL monogram.
**Why:** The browser tab currently shows the Next.js default icon. For a personal brand, the tab should show your initials. Consistent with the NL nav logo.
**Pros:** Completes the brand in one of the most visible persistent UI elements.
**Cons:** Small task, no real downside.
**How:** Create a 32×32 SVG or PNG with "NL" or a lettermark. Place in `/public/favicon.ico` (or use `app/favicon.ico` for Next.js app router). 10-minute task.

### Create og:image
**What:** Create the actual `/public/og-image.png` (1200×630px) — the metadata is already wired up in `layout.tsx`.
**Why:** LinkedIn, Twitter, and Slack previews will show a blank card until this image exists. For a BD professional sharing your own site, the first LinkedIn impression matters.
**Pros:** Fully branded link previews on all social platforms.
**Cons:** Requires design work for the image itself.
**How:** Create a 1200×630 PNG. Suggested content: dark background (#0f172a), "Nico Lombardi" in large Geist-style sans-serif, "Business Development · Fintech · AI · Operations" in smaller text, white on dark. Place at `/public/og-image.png`.

### Populate "Selected Work" section with real projects
**What:** The "Selected Work" section currently has Mottum Analytica and the UN partnership — both already mentioned in Work. Add 1–2 genuinely distinct entries.
**Why:** "Selected Work" should contain projects that go beyond job roles — tools built, initiatives led, side projects, or notable achievements that don't fit the timeline format.
**How:** Think about: any internal tools or dashboards built, published content, open source contributions, or discrete projects from your career. Add as new entries in `Projects.tsx`.

### Nav scroll active state
**What:** Highlight the current section in the nav as the user scrolls (e.g. "Work" is underlined when the Work section is in view).
**Why:** Improves wayfinding on a long single-page scroll. Users know where they are.
**How:** Use `IntersectionObserver` to track which section is in view, apply `text-neutral-900` (instead of `neutral-500`) to the corresponding nav link.
**Depends on:** Mobile nav drawer (already done).

### Fix font fallback (minor)
**What:** The body font stack currently uses `ui-sans-serif` as fallback. This is already improved from `system-ui`, but for completeness you could specify a named fallback like `'Helvetica Neue', Arial, sans-serif`.
**Why:** Extremely minor — Geist is loaded via `next/font` which is highly reliable. Only matters if the font CDN is unavailable.
