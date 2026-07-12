# Design System — LinkUp

## Color Palette

### Brand Colors

| Token | HEX | Usage |
|-------|-----|-------|
| `--color-primary` | `#40E0D0` (Turquoise) | Logo, CTA buttons, primary icons |
| `--color-primary-hover` | `#36C9B9` | Primary button hover |
| `--color-primary-active` | `#2EB3A3` | Primary button active/click |
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

| Token | HEX | Light BG | Usage |
|-------|-----|----------|-------|
| `--color-success` | `#388E3C` | `#E8F5E9` | Success states |
| `--color-warning` | `#FBC02D` | `#FFF8E1` | Warning states |
| `--color-danger` | `#D32F2F` | `#FFEBEE` | Error/danger states |
| `--color-info` | `#1976D2` | `#E3F2FD` | Informational |

### Dark Mode Overrides

```css
[data-theme="dark"] {
  --color-primary: #40E0D0;
  --color-primary-hover: #5CE8DA;
  --color-primary-active: #72EDE2;

  --color-secondary: #0A1F44;
  --color-secondary-hover: #0D2A5A;
  --color-secondary-active: #0F3570;

  --color-bg: #0A1F44;
  --color-bg-secondary: #112D5E;
  --color-text: #FFFFFF;
  --color-text-secondary: #B0B0B0;

  --color-card: #112D5E;
  --color-border: #1E3A6E;
  --color-divider: #1A3360;
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

Use `next/font/google` in `app/layout.tsx` — self-hosted, no external requests:

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

Apply via `<body className={`${montserrat.variable} ${openSans.variable}`}>`

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
| `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.05)` |
| `--shadow-md` | `0 4px 6px rgba(0, 0, 0, 0.07)` |
| `--shadow-lg` | `0 10px 15px rgba(0, 0, 0, 0.1)` |

### Dark Mode

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.3)` |
| `--shadow-md` | `0 4px 6px rgba(0, 0, 0, 0.4)` |
| `--shadow-lg` | `0 10px 15px rgba(0, 0, 0, 0.5)` |

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
│          │       Navbar (56px)         │
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
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: var(--radius-md);
  font: var(--text-body);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-secondary);
}
.btn-primary:hover {
  background: var(--color-primary-hover);
}
.btn-primary:active {
  background: var(--color-primary-active);
}

.btn-secondary {
  background: var(--color-secondary);
  color: var(--color-primary);
}
.btn-secondary:hover {
  background: var(--color-secondary-hover);
}

.btn-accent {
  background: var(--color-accent);
  color: #FFFFFF;
}
.btn-accent:hover {
  background: var(--color-accent-hover);
}
```

Sizes:
- `.btn-sm`: padding `var(--space-xs) var(--space-sm)`
- `.btn-md`: default
- `.btn-lg`: padding `var(--space-sm) var(--space-md)`

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
  background: var(--color-bg);
  color: var(--color-text);
  font: var(--text-body);
  transition: border-color 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(64, 224, 208, 0.2);
}

.input::placeholder {
  color: var(--color-text-secondary);
}
```

### Badge / Status

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-pill);
  font: var(--text-caption);
  font-weight: 600;
}

.badge-success {
  background: var(--color-success);
  color: #FFFFFF;
}

.badge-warning {
  background: var(--color-warning);
  color: var(--color-secondary);
}

.badge-danger {
  background: var(--color-danger);
  color: #FFFFFF;
}

.badge-info {
  background: var(--color-info);
  color: #FFFFFF;
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

| State | Primary | Secondary | Accent |
|-------|---------|-----------|--------|
| Default | `--color-primary` | `--color-secondary` | `--color-accent` |
| Hover | `--color-primary-hover` | `--color-secondary-hover` | `--color-accent-hover` |
| Active | `--color-primary-active` | `--color-secondary-active` | `--color-accent-active` |
| Focus | `outline: 2px solid --color-primary` | `outline: 2px solid --color-primary` | `outline: 2px solid --color-primary` |

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
var(--color-secondary)
var(--color-accent)
var(--color-bg)
var(--color-bg-secondary)
var(--color-text)
var(--color-text-secondary)
var(--color-card)
var(--color-border)
var(--color-divider)
var(--color-success)
var(--color-warning)
var(--color-danger)
var(--color-info)

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
- Use `var(--space-*)` for all spacing
- Use `var(--radius-*)` for all border-radius
- Use `var(--text-*)` for font shorthand
- Import fonts via `next/font/google`, not `<link>` CDN
- Use `data-theme="dark"` for dark mode toggle
- Write mobile-first CSS with `min-width` media queries
- Use `var(--shadow-*)` for all box-shadows
- Add `transition` for interactive state changes
- Use semantic color tokens (`--color-success`, `--color-danger`) for status

### Don't

- Don't use `px` values directly — always use spacing tokens
- Don't hardcode `#FFFFFF` or `#000000` — use `var(--color-bg)` / `var(--color-text)`
- Don't use `!important`
- Don't use `@import url()` for fonts — use `next/font`
- Don't create separate CSS files per component — use CSS modules or globals.css
- Don't use Tailwind classes (removed) with plain CSS
- Don't skip `:hover` / `:active` states on interactive elements
- Don't use `outline: none` without providing a focus-visible alternative
- Don't hardcode font families — use `var(--font-family-*)`
