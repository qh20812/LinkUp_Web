# Design System — LinkUp

## Color Palette

### Brand Colors

| Token | HEX | Usage |
|-------|-----|-------|
| `--color-primary` | `#12A5A1` (Turquoise) | Logo, links, active states, primary icons; CTA outline/light pills |
| `--color-primary-hover` | `#0C918D` | Primary hover |
| `--color-primary-active` | `#0A7D79` | Primary active/click |
| `--color-secondary` | `#0A1F44` (Navy) | Header, footer, dark backgrounds |
| `--color-secondary-hover` | `#0D2A5A` | Secondary button hover |
| `--color-secondary-active` | `#0F3570` | Secondary button active |
| `--color-accent` | `#FF6F00` (Orange) | Highlights, notifications, badges |
| `--color-accent-hover` | `#E66300` | Accent button hover |
| `--color-accent-active` | `#CC5800` | Accent button active |

### Neutral Colors (Light Mode)

| Token | HEX | Usage |
|-------|-----|-------|
| `--color-bg` | `#FFFFFF` | Main background |
| `--color-bg-secondary` | `#F5F5F5` | Secondary background, cards |
| `--color-text` | `#000000` | Primary text |
| `--color-text-secondary` | `#666666` | Secondary/muted text |
| `--color-card` | `#FFFFFF` | Card surfaces |
| `--color-border` | `#E0E0E0` | Borders, outlines |
| `--color-divider` | `#EEEEEE` | Section dividers |

### Semantic Colors

| Token | HEX | Light BG (Light Mode) | Dark BG (Dark Mode) | Usage |
|-------|-----|----------------------|---------------------|-------|
| `--color-success` | `#388E3C` | `--color-success-light`: `#E8F5E9` | `--color-success-light`: `#064E3B` | Success states, active badges |
| `--color-warning` | `#FBC02D` | `--color-warning-light`: `#FFF8E1` | `--color-warning-light`: `#78350F` | Warning states, suspended badges |
| `--color-danger` | `#D32F2F` | `--color-danger-light`: `#FFEBEE` | `--color-danger-light`: `#7F1D1D` | Error/danger states, banned badges |
| `--color-info` | `#1976D2` | `--color-info-light`: `#E3F2FD` | `--color-info-light`: `#1E3A5F` | Informational, reviewed badges |
| `--color-primary-light` | `rgba(18,165,161,0.12)` | used as-is | `rgba(63,191,186,0.22)` | Hover/focus highlights, active rows |

### Dark Mode Overrides

```css
[data-theme="dark"] {
  --color-primary: #3FBFBA;
  --color-primary-hover: #2BB0AC;
  --color-primary-active: #1FA3A0;
  --color-primary-light: rgba(63, 191, 186, 0.22);

  --color-secondary: #1A1A1A;
  --color-secondary-hover: #222222;
  --color-secondary-active: #2A2A2A;

  --color-bg: #111111;
  --color-bg-secondary: #1A1A1A;
  --color-text: #E5E7EB;
  --color-text-secondary: #9CA3AF;

  --color-card: #1E1E1E;
  --color-border: #333333;
  --color-divider: #2A2A2A;

  --color-success-light: #064E3B;
  --color-warning-light: #78350F;
  --color-danger-light: #7F1D1D;
  --color-info-light: #1E3A5F;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.6);
}
```

---

## Typography

### Font Families

| Token | Font | Usage |
|-------|------|-------|
| `--font-family-heading` | Montserrat | Headings, titles |
| `--font-family-body` | Open Sans | Body text, UI elements |

### Text Styles

| Token | Weight | Size | Line Height | Usage |
|-------|--------|------|-------------|-------|
| `--text-h1` | Bold (700) | 32px | 130% | Page titles |
| `--text-h2` | SemiBold (600) | 24px | 130% | Section headings |
| `--text-body` | Regular (400) | 16px | 150% | Body text |
| `--text-caption` | Light (300) | 13px | 140% | Captions, helper text |

### Responsive Adjustments

| Breakpoint | H1 | H2 |
|------------|-----|-----|
| Desktop (>768px) | 32px | 24px |
| Mobile (<=768px) | 24px | 20px |

### Font Loading

Use `next/font/google` in `app/layout.tsx` — fonts are self-hosted by Next.js:

```tsx
import { Montserrat, Open_Sans } from 'next/font/google'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-family-heading',
  weight: ['400', '600', '700'],
})

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-family-body',
  weight: ['300', '400'],
})
```

Apply via `<html className={`${montserrat.variable} ${openSans.variable}`}>` in `app/layout.tsx` (on `<html>`, not `<body>`).

---

## Spacing

| Token | Value |
|-------|-------|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Small elements, chips |
| `--radius-md` | 8px | Buttons, inputs |
| `--radius-lg` | 20px | Cards, panels |
| `--radius-pill` | 9999px | Pill shapes, badges |
| `--radius-circle` | 50% | Avatars, circular icons |

---

## Shadows

### Light Mode

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0, 0, 0, 0.08)` |
| `--shadow-md` | `0 4px 12px rgba(0, 0, 0, 0.1)` |
| `--shadow-lg` | `0 12px 28px rgba(0, 0, 0, 0.15)` |

### Dark Mode

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0, 0, 0, 0.45)` |
| `--shadow-md` | `0 4px 12px rgba(0, 0, 0, 0.55)` |
| `--shadow-lg` | `0 12px 28px rgba(0, 0, 0, 0.65)` |

---

## Layout

### Breakpoints

| Name | Range | Usage |
|------|-------|-------|
| Mobile | <= 576px | Phones |
| Tablet | 577px — 768px | Small tablets |
| Desktop | > 768px | Desktop, large screens |

### Sidebar + Content (Admin Dashboard)

```
┌──────────┬────────────────────────────┐
│          │       Navbar (56px)        │
│ Sidebar  ├────────────────────────────┤
│ (230px)  │                            │
│          │       Main Content         │
│          │       padding: 32px 24px   │
│          │                            │
└──────────┴────────────────────────────┘
```

- Sidebar width: `230px` (collapsed: `60px`)
- Content margin-left: `230px` (collapsed: `60px`)
- Content transition: `margin-left 0.3s ease`
- Sidebar z-index: `2000`
- Navbar height: `56px`, sticky top, z-index: `1000`
- Main padding: `var(--space-xl) var(--space-lg)`

### Grid System

Use native CSS Grid — no framework:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-lg);
}
```

---

## Component Patterns

### Button

```css
.buttonPrimary,
.buttonSecondary,
.buttonDanger,
.buttonSuccess {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  font: var(--text-body);
  transition: background 0.2s ease, transform 0.2s ease;
}

.buttonPrimary {
  background: var(--color-secondary);
  color: #FFFFFF;
}
.buttonPrimary:hover {
  background: var(--color-secondary-hover);
}

.buttonSecondary {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}
.buttonSecondary:hover {
  background: var(--color-bg-secondary);
  filter: brightness(0.95);
}

.buttonDanger {
  background: var(--color-danger);
  color: #FFFFFF;
}
.buttonDanger:hover {
  background: var(--color-danger);
  filter: brightness(1.1);
}

.buttonSuccess {
  background: var(--color-success);
  color: #FFFFFF;
}
.buttonSuccess:hover {
  background: #2e7d32;
}

.buttonPrimary:disabled,
.buttonSecondary:disabled,
.buttonDanger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

### Card

```css
.card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
}
```

### Input

```css
.input {
  height: 40px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-card);
  color: var(--color-text);
  font: var(--text-body);
  outline: none;
  transition: border-color 0.2s;
}

.input:focus {
  border-color: var(--color-primary);
}

.input::placeholder {
  color: var(--color-text-secondary);
}
```

### Badge / Status

```css
.badge {
  display: inline-flex;
  padding: 2px var(--space-sm);
  border-radius: var(--radius-pill);
  font: var(--text-caption);
  font-weight: 600;
  font-size: 11px;
}

.badgeActive {
  background: var(--color-success-light);
  color: var(--color-success);
}

.badgeBanned,
.badgeArchived,
.badgeFlagged {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.badgeSuspended,
.badgePending,
.badgePaused {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.badgeReviewed {
  background: var(--color-info-light);
  color: var(--color-info);
}
```

---

## Interactive States

### Focus Ring (Accessibility)

```css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

### Button States

| State | `.buttonPrimary` | `.buttonSecondary` | `.buttonDanger` | `.buttonSuccess` |
|-------|-----------------|-------------------|----------------|-----------------|
| Default | `--color-secondary` bg | `--color-bg-secondary` bg | `--color-danger` bg | `--color-success` bg |
| Hover | `--color-secondary-hover` | filter brightness 0.95 | filter brightness 1.1 | `#2e7d32` |
| Disabled | opacity 0.6 | opacity 0.6 | opacity 0.6 | opacity 0.6 |
| Focus | `outline: 2px solid var(--color-primary)` (global `:focus-visible`) | | | |

---

## Dark Mode Implementation

Toggle via `data-theme` attribute on `<html>`:

```html
<!-- Light mode (default) -->
<html lang="vi">

<!-- Dark mode -->
<html lang="vi" data-theme="dark">
```

Toggle with JavaScript:

```javascript
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? '' : 'dark');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// Load saved theme on page load
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
}
```

---

## Design Tokens Reference (CSS Variables)

All tokens are defined in `app/globals.css` and can be used in any component:

```css
/* Colors */
var(--color-primary)
var(--color-primary-hover)
var(--color-primary-active)
var(--color-primary-light)
var(--color-secondary)
var(--color-secondary-hover)
var(--color-secondary-active)
var(--color-accent)
var(--color-accent-hover)
var(--color-accent-active)
var(--color-bg)
var(--color-bg-secondary)
var(--color-text)
var(--color-text-secondary)
var(--color-card)
var(--color-border)
var(--color-divider)
var(--color-success)
var(--color-success-light)
var(--color-warning)
var(--color-warning-light)
var(--color-danger)
var(--color-danger-light)
var(--color-info)
var(--color-info-light)

/* Typography */
var(--font-family-heading)
var(--font-family-body)
var(--text-h1)
var(--text-h2)
var(--text-body)
var(--text-caption)

/* Spacing */
var(--space-xs)
var(--space-sm)
var(--space-md)
var(--space-lg)
var(--space-xl)

/* Border Radius */
var(--radius-sm)
var(--radius-md)
var(--radius-lg)
var(--radius-pill)
var(--radius-circle)

/* Shadows */
var(--shadow-sm)
var(--shadow-md)
var(--shadow-lg)
```

---

## Do's and Don'ts

### Do

- Always use CSS variables from DESIGN.md — never hardcode colors/sizes
- **Solid CTA buttons use `--color-secondary` (navy) + white text** for high contrast; `--color-primary` is reserved for links, active/inactive states, pill/outline buttons, and borders — not large filled buttons
- Use `var(--space-*)` for all spacing
- Use `var(--radius-*)` for all border-radius
- Use `var(--text-*)` for font shorthand
- Import fonts via `next/font/google` (self-hosted), icons via Boxicons CDN `<link>` in root layout
- Use `data-theme="dark"` for dark mode toggle
- Use `var(--shadow-*)` for all box-shadows
- Add `transition` for interactive state changes
- Use semantic color tokens (`--color-success`, `--color-danger`) for status
- Use CSS Modules (`*.module.css`) for component styles; `globals.css` is for reset + tokens only

### Don't

- Don't use `px` values directly — always use spacing tokens
- Don't hardcode `#FFFFFF` or `#000000` — use `var(--color-bg)` / `var(--color-text)`
- Don't use `!important`
- Don't use `@import url()` for fonts — use `next/font`
- Don't use Tailwind classes (removed) with plain CSS
- Don't skip `:hover` / `:active` states on interactive elements
- Don't use `outline: none` without providing a focus-visible alternative
- Don't hardcode font families — use `var(--font-family-*)`
