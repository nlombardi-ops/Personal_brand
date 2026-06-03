# Design System — Nico Lombardi Portfolio

## Typography
- **Primary font:** Geist Sans (`--font-geist-sans`) via `next/font/google`
- **Mono font:** Geist Mono (`--font-mono`)
- **Fallback:** `ui-sans-serif, sans-serif` — no system-ui
- **Display size:** `clamp()` for responsive scale (e.g. `clamp(3rem, 8vw, 7rem)`)
- **Display weight:** `font-light` for headings, `font-medium` for labels
- **Tracking:** `tracking-tight` on display, `tracking-widest` on section labels

## Color Palette
| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#fafafa` | Page background |
| `--foreground` | `#0a0a0a` | Default text |
| `--cta-accent` | `#0f172a` | Primary CTA background |
| `--cta-accent-hover` | `#1e293b` | Primary CTA hover |
| `neutral-900` | `#171717` | Headings, primary text |
| `neutral-700` | `#404040` | Company names |
| `neutral-600` | `#525252` | Section labels, year dates (WCAG AA on #fafafa) |
| `neutral-500` | `#737373` | Body text, descriptions |
| `neutral-400` | `#a3a3a3` | Tag chips, decorative labels only |
| `neutral-200` | `#e5e5e5` | Borders, grid gaps |
| `neutral-100` | `#f5f5f5` | Section dividers |
| `neutral-50` | `#fafafa` | Alt section background |

**Contrast rule:** `neutral-600` or higher on `#fafafa` for any readable text. `neutral-400` is decorative only.

## Hero Visual
The hero uses a CSS dot grid (`radial-gradient`) as a subtle background texture:
```css
background-image: radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px);
background-size: 28px 28px;
```

## Section Label Pattern
```tsx
<p className="text-xs text-neutral-600 uppercase tracking-widest mb-12">Section Name</p>
```
Applied consistently to: Services, Work, Selected Work, References, Contact.

## Tag Chip Pattern
```tsx
<span className="text-xs text-neutral-400 border border-neutral-200 px-2 py-0.5">
  Label
</span>
```
Standard size: `px-2 py-0.5`. Do not use `px-3 py-1` — reserved for no component.

## Section Separators
- Heavy divider: `border-t border-neutral-200` between sections
- Light divider: `border-b border-neutral-100` within lists (Work, Selected Work)
- Grid gap divider: `gap-px bg-neutral-200` on grid containers (References)

## CTA Patterns
- **Primary:** `bg-[--cta-accent] text-white px-6 py-3 text-sm hover:bg-[--cta-accent-hover] transition-colors`
- **Secondary:** `border border-neutral-300 px-6 py-3 text-sm text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 transition-colors`
- **Text link:** `text-sm text-neutral-500 hover:text-neutral-900 transition-colors`

## Nav Link Hover
Underline slide: `relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-neutral-900 after:transition-all hover:after:w-full`

## Services Layout
Numbered vertical list with `grid-cols-[48px_1fr]` — not a card grid. Numbers use `tabular-nums`.

## Work Layout
Two-column grid: `grid-cols-[140px_1fr]` with year/company in left column.

## Mobile
- Nav: hamburger button + right-side sheet drawer at `md:` breakpoint
- Hero: dot grid maintained at all sizes; text uses `clamp()` for natural scaling
- Sections: single column on mobile, constrained to `max-w-4xl`
