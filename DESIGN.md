# Design System: LinkUp Social Network

**Project:** LinkUp — Vietnamese social networking platform (Web)
**Stack:** Next.js 16 (App Router), React 19, TypeScript 5, CSS Modules (plain CSS, no Tailwind)
**Language:** Vietnamese (primary), English (secondary). All UI text bilingual via i18n keys.

---

## Configuration

| Dial | Level | Rationale |
|------|-------|-----------|
| **Creativity** | `7` | Social networks need personality and warmth — not sterile Swiss minimalism, but not editorial chaos either. Confident layouts with personality. |
| **Density** | `5` | Balanced. Social feeds are content-dense (posts, comments, media), but sidebars and navigation stay airy. Not a data dashboard. |
| **Variance** | `7` | Feeds, auth forms, admin tables, settings panels — each section should feel distinct. No two screen types should look alike. |
| **Motion Intent** | `7` | Social platforms thrive on micro-interactions — reaction animations, typing indicators, smooth feed transitions, notification toasts. Motion communicates life. |

---

## 1. Visual Theme & Atmosphere

LinkUp feels like a warm, well-lit co-working space where friends gather. The atmosphere is **inviting yet professional** — turquoise accents evoke trust and freshness (like calm water), navy depth provides gravitas, and orange sparks energy for notifications and calls to action.

The interface breathes. Sidebars are generous, feed cards have room to stretch, and whitespace separates concerns without feeling empty. Density is balanced: the center feed is content-rich, but flanking sidebars and navigation stay calm.

Light mode is the default — crisp white surfaces with soft shadows. Dark mode shifts to deep charcoal with muted turquoise accents, like a nighttime cafe. Both modes feel cohesive, never jarring.

**Overall impression:** Modern Vietnamese social platform — not imitating Facebook or Instagram, but its own identity. Clean enough for daily use, distinctive enough to remember.

---

## 2. Color Palette & Roles

### Brand Colors

| Name | Hex | Role |
|------|-----|------|
| **Fresh Turquoise** | `#12A5A1` | Primary brand accent. Links, active nav states, focus rings, primary icons, outgoing message bubbles. The signature color — appears in logo, sidebar accents, and interactive highlights. |
| **Turquoise Hover** | `#0C918D` | Primary interactive hover state |
| **Turquoise Active** | `#0A7D79` | Primary pressed/active state |
| **Turquoise Wash** | `rgba(18,165,161,0.12)` | Hover background highlights, selected row tints, focus ring halos |
| **Deep Navy** | `#0A1F44` | Primary CTA buttons (solid fill), dark backgrounds, footer, admin sidebar. Provides weight and contrast against turquoise. |
| **Navy Hover** | `#0D2A5A` | CTA button hover |
| **Navy Active** | `#0F3570` | CTA button pressed |
| **Signal Orange** | `#FF6F00` | Notifications, badges, unread counts, warning highlights, live indicators. High-energy accent — used sparingly for attention-drawing elements only. |
| **Orange Hover** | `#E66300` | Orange interactive hover |
| **Orange Active** | `#CC5800` | Orange pressed |

### Neutral Canvas

| Name | Hex (Light) | Hex (Dark) | Role |
|------|-------------|------------|------|
| **Canvas White** | `#FFFFFF` | `#111111` | Primary background. The page canvas. |
| **Soft Surface** | `#F5F5F5` | `#1A1A1A` | Secondary background, sidebar tints, input backgrounds |
| **Hover Wash** | `#ECECEC` | `#242424` | Row hover, nav item hover |
| **Ink Black** | `#1A1A1A` | `#E5E7EB` | Primary text. Never pure black — always warm off-black. |
| **Muted Steel** | `#666666` | `#9CA3AF` | Secondary text, descriptions, timestamps |
| **Card Surface** | `#FFFFFF` | `#1E1E1E` | Card fills, modal backgrounds, dropdown menus |
| **Whisper Border** | `#E0E0E0` | `#333333` | Card borders, input borders, structural dividers |
| **Hairline** | `#EEEEEE` | `#2A2A2A` | Thin separators, table row borders |

### Semantic Signals

| Name | Hex | Light BG | Dark BG | Role |
|------|-----|----------|---------|------|
| **Success Green** | `#388E3C` | `#E8F5E9` | `#064E3B` | Active status, success toasts, online indicators |
| **Caution Amber** | `#FBC02D` | `#FFF8E1` | `#78350F` | Pending status, warning toasts |
| **Danger Crimson** | `#D32F2F` | `#FFEBEE` | `#7F1D1D` | Banned status, error toasts, delete actions |
| **Info Blue** | `#1976D2` | `#E3F2FD` | `#1E3A5F` | Informational badges, reviewed status |

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

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.45);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.55);
  --shadow-lg: 0 12px 28px rgba(0, 0, 0, 0.65);
}
```

### Color Rules

- **Primary CTA buttons** use Deep Navy (`#0A1F44`) fill + white text — high contrast, authoritative
- **Fresh Turquoise** is allowed for:
  - Compact accent buttons (Follow, Create Post, Send) — `padding` ≤ `12px 24px`
  - Outgoing message bubbles (chat)
  - Links, active nav states, focus rings, borders
  - Pill/badge variants
- **Fresh Turquoise** is NOT allowed for:
  - Large filled button surfaces (full-width buttons, large CTAs)
  - Decorative background fills
  - Card backgrounds
- **Signal Orange** appears only on notification badges, live dots, and urgent call-to-action — never on general UI chrome
- Maximum 1 accent color per context. Turquoise is the brand accent; Orange is the alert accent. They never compete on the same element
- Never use pure black (`#000000`) — always `#1A1A1A` (light) or `#E5E7EB` (dark)

---

## 3. Typography Rules

### Font Families

| Role | Font | Weights | Character |
|------|------|---------|-----------|
| **Display / Headings** | `Outfit` | 500, 600, 700 | Geometric sans-serif with subtle personality. Tight tracking, confident weight hierarchy. Modern without being trendy. |
| **Body / UI** | `DM Sans` | 400, 500, 600 | Humanist sans-serif with warm curves. Excellent readability at small sizes. Pairs naturally with Outfit. |

### Type Scale

| Token | Weight | Size | Line Height | Tracking | Usage |
|-------|--------|------|-------------|----------|-------|
| **H1** | 700 | `clamp(1.75rem, 4vw, 2rem)` | 1.25 | `-0.02em` | Page titles, hero headlines |
| **H2** | 600 | `clamp(1.25rem, 3vw, 1.5rem)` | 1.3 | `-0.01em` | Section headings, card titles |
| **H3** | 600 | `1.125rem` | 1.4 | `0` | Subsection headings |
| **Body** | 400 | `1rem` | 1.6 | `0` | Paragraphs, descriptions, form labels |
| **Body Strong** | 600 | `1rem` | 1.6 | `0` | Emphasized body text, names |
| **Caption** | 400 | `0.8125rem` | 1.4 | `0.01em` | Timestamps, metadata, helper text |
| **Small** | 500 | `0.75rem` | 1.3 | `0.02em` | Badges, labels, overlines |
| **Mono** | 400 | `0.8125rem` | 1.5 | `0` | Code, stats, verification tokens |

### Font Loading

```tsx
import { Outfit, DM_Sans } from 'next/font/google'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-family-heading',
  weight: ['500', '600', '700'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-family-body',
  weight: ['400', '500', '600'],
})
```

Apply via `<html className={`${outfit.variable} ${dmSans.variable}`}>` on `<html>`, not `<body>`.

### Typography Rules

- Headlines track tight (`-0.02em`) for visual density. Body tracks normal for readability
- Max body line length: `65ch` — wider lines hurt reading comprehension
- Hierarchy through **weight and color**, not just size. A `600` weight heading at `1.5rem` reads stronger than a `400` at `2rem`
- All numbers in dashboard stat cards use `--font-family-body` at `600` weight for clarity
- Vietnamese diacritics require generous line-height (`1.5` minimum for body) to avoid clipping

### Messaging Typography

Message content uses slightly tighter typography than long-form social content:

```
Message text:           14–15px, line-height: 1.45–1.55
Sender name:            12px, font-weight: 600
Message timestamp:      11–12px, muted
Chat header name:       15–16px, font-weight: 600
Chat status:            12–13px, muted
```

Do not make chat messages visually oversized. Do not make message text smaller than necessary for readability.

### Banned Fonts

- `Inter` — overused, lacks character. Banned everywhere
- Generic serif (`Times New Roman`, `Georgia`, `Garamond`) — banned in all contexts
- System font stacks (`-apple-system`, `Segoe UI`) — banned for display text

---

## 4. Component Stylings

### Buttons

**Primary (Deep Navy fill):**
- Background: `#0A1F44`, text: `#FFFFFF`, border: none
- Border-radius: `8px`, padding: `10px 20px`, font-weight: 600
- Hover: `#0D2A5A` background. Active: `translateY(-1px)` tactile push
- Disabled: `opacity: 0.5`, cursor: `not-allowed`
- Use for: primary page-level CTAs, form submissions, major actions

**Secondary (Ghost/Outline):**
- Background: transparent, border: `1px solid var(--color-border)`, text: `var(--color-text)`
- Hover: `var(--color-bg-secondary)` background
- Same radius and padding as primary

**Accent (Turquoise fill — compact buttons only):**
- Background: `#12A5A1`, text: `#FFFFFF`
- Border-radius: `8px` or `9999px` (pill variant)
- Padding: ≤ `12px 24px` (must be compact)
- Hover: `#0C918D`. Active: `translateY(-1px)`
- Use for: Follow buttons, Create Post, Send (chat), positive compact actions
- Do NOT use for: full-width buttons, large hero CTAs, card-level actions

**Danger (Crimson fill):**
- Background: `#D32F2F`, text: `#FFFFFF`
- Used for: Delete, ban, block, deactivate — destructive confirmations only

**Ghost:**
- Background: transparent, no border, text: `var(--color-text-secondary)`
- Hover: `var(--color-bg-secondary)` background
- Used for: Action bar buttons (like, comment, share), nav items

**Icon Button:**
- 36x36px minimum, border-radius: `50%`, background: transparent
- Hover: `var(--color-bg-secondary)`
- Contains a single Boxicon glyph
- Must have: `aria-label`, keyboard accessible, visible focus state

### Cards

- Background: `var(--color-card)`
- Border: `1px solid var(--color-border)`
- Border-radius: `16px` (post cards), `12px` (sidebar cards), `20px` (modals)
- Shadow: `var(--shadow-sm)` — subtle, never dramatic
- Internal padding: `16px` (compact), `24px` (standard)
- Hover: shadow elevates to `var(--shadow-md)` — never transform/scale
- **Post cards** have no top border-radius (flush with header), rounded bottom corners

### Inputs

- Height: `40px` (standard), `48px` (search, prominent)
- Border: `1px solid var(--color-border)`, border-radius: `8px`
- Background: `var(--color-card)`
- Padding: `0 16px`
- Focus: `border-color: var(--color-primary)`, `box-shadow: 0 0 0 3px var(--color-primary-light)`
- Placeholder: `var(--color-text-secondary)`
- Label positioned above input, `4px` gap. Error text below in `var(--color-danger)`, `12px` gap
- No floating labels. No animated label transitions

### Textarea (Post Composer)

- Min-height: `120px`, auto-expands with content
- Same border/focus treatment as input
- No resize handle visible — auto-height only
- Character counter at bottom-right when approaching limit

### Avatars

- Circular (`border-radius: 50%`)
- Sizes: `28px` (table rows, comments), `32px` (nav), `34px` (message groups), `40px` (post cards, suggestions), `42–46px` (chat header), `56px` (profile headers)
- Fallback: initials on `var(--color-bg-secondary)` background with `var(--color-text-secondary)` color
- No border ring by default. Online indicator: `8px` green dot at bottom-right

### Badges / Status Pills

- Border-radius: `9999px` (pill)
- Padding: `2px 10px`
- Font: `0.75rem` / `600` weight
- **Active:** green bg (`#E8F5E9`) + green text (`#388E3C`)
- **Banned:** red bg (`#FFEBEE`) + red text (`#D32F2F`)
- **Suspended/Pending:** amber bg (`#FFF8E1`) + amber text (`#FBC02D`)
- **Reviewed/Info:** blue bg (`#E3F2FD`) + blue text (`#1976D2`)

### Notification Badge (Orange Dot)

- `8px` circle, `#FF6F00` background, no border
- Positioned at top-right of bell icon
- Count display: `18px` circle, `#FF6F00` bg, white text, overlaps badge

### Modals

- Overlay: `rgba(0,0,0,0.5)` backdrop
- Container: `var(--color-card)`, `border-radius: 20px`, `max-width: 560px` (standard), `900px` (post detail)
- Padding: `24px` header, `0` body, `24px` footer
- Header: `H2` title + close button (X icon, 36px ghost)
- Close on: overlay click, Escape key, X button
- Body scroll locked when open
- Entrance: `opacity 0 → 1` + `translateY(8px) → 0`, `200ms ease-out`

### Tables (Admin)

- Header: `Caption` style, `600` weight, `var(--color-text-secondary)`, `12px` bottom padding, `1px` bottom border
- Rows: `14px` body text, `12px` vertical padding, `1px` bottom border
- Row hover: `var(--color-bg-secondary)` background
- Avatar in table: `28px` circular
- Striped rows: not used — hover highlight instead

### Skeletons (Loading States)

- Match exact layout dimensions of content they replace
- Background: `var(--color-bg-secondary)`
- Animation: `opacity 0.4 → 0.8 → 0.4`, `1.5s ease-in-out infinite`
- Circular skeletons for avatars, rectangular for text lines
- No spinner icons anywhere in the UI

### Toast Notifications

- Position: bottom-right, `16px` from edges
- Width: `360px` max
- Left border: `4px` solid (color matches type: green/red/amber/blue)
- Background: `var(--color-card)`, shadow: `var(--shadow-lg)`
- Auto-dismiss: 4 seconds with progress bar
- Types: success, error, warning, info — each with distinct icon and border color

---

## 5. Hero Section (Landing Page)

The landing page is the first impression for unauthenticated visitors.

### Layout

**Split gradient hero** — not a centered text blob:
- Full-width gradient background: `linear-gradient(135deg, #12A5A1, #0A1F44)` (turquoise to navy)
- Content centered within gradient, `max-width: 560px`
- Logo (white, inverted) + brand name at top
- Headline: large, white, tight tracking — the tagline in Vietnamese
- Two CTA buttons side by side:
  - Primary: white fill + navy text ("Get Started")
  - Secondary: white border + white text, transparent fill ("Log In")

### Rules

- No stock photos or hero images — the gradient IS the visual
- No "Scroll to explore" or arrow indicators
- Headline is `H1` scale, white, `font-weight: 700`
- CTA buttons: `padding: 12px 32px`, `border-radius: 8px`, `font-weight: 700`
- Below the hero: simple footer with copyright only
- Navbar overlays the gradient at top: brand logo + language toggle + theme toggle + login link

### Mobile

- Hero scales down gracefully, gradient remains full-width
- Buttons stack vertically if needed
- Footer stays minimal

---

## 6. Layout Principles

LinkUp has **five distinct layout tracks** — each screen type has its own spatial architecture.

### Track 1: Public Landing

```
┌──────────────────────────────────────────────┐
│  Navbar (transparent over gradient)          │
├──────────────────────────────────────────────┤
│                                              │
│         Gradient Hero (full width)           │
│         Logo + Tagline + CTAs                │
│                                              │
├──────────────────────────────────────────────┤
│  Footer                                      │
└──────────────────────────────────────────────┘
```

### Track 2: Auth Pages (Login, Register, Forgot Password)

**Split layout:**
```
┌──────────────────┬───────────────────────────┐
│                  │                           │
│  Brand Pane      │    Form Pane              │
│  (gradient bg)   │    (white bg)             │
│  Logo + Copy     │    AuthCard (max-w: 400px)│
│                  │                           │
└──────────────────┴───────────────────────────┘
```
- Brand pane: 50% width, gradient background, white text, logo + headline + tagline
- Form pane: 50% width, centered form card
- **Mobile:** Brand pane hidden. Form pane full-width, centered
- Brand pane disappears below `768px`

### Track 3: User Social (3-Column)

```
┌──────────┬──────────────────────────┬──────────────┐
│          │   UserNavbar (56px)      │              │
│ Left     ├──────────────────────────┤   Right      │
│ Sidebar  │                          │   Sidebar    │
│ (260px)  │   Feed / Page Content    │   (360px)    │
│ sticky   │                          │   sticky     │
│          │                          │              │
└──────────┴──────────────────────────┘
```
- **Left Sidebar (260px):** Logo, nav items (Home, Explore, Notifications, Messages, Friends, Groups, Saved, Profile), Create Post button, user profile dropdown at bottom. Sticky, full height, scrollable
- **Center Content:** `UserNavbar` (search + tabs) at top, then page content below. Flex-grow, scrollable
- **Right Sidebar (360px):** Search box, trending hashtags, follow suggestions. Sticky, full height
- **Tablet (< 1024px):** Right sidebar hidden
- **Mobile (< 768px):** Left sidebar hidden (hamburger menu). Right sidebar hidden. Content full-width

### Track 4: Admin Dashboard (Sidebar + Content)

```
┌──────────┬──────────────────────────────────┐
│          │   AdminNavbar (56px, sticky)     │
│ Admin    ├──────────────────────────────────┤
│ Sidebar  │                                  │
│ (230px)  │   Main Content                   │
│ collapse │   padding: 32px 24px             │
│ to 60px  │                                  │
│          │                                  │
└──────────┴──────────────────────────────────┘
```
- **AdminSidebar:** Logo, 8 nav items with icons, separator, Profile + Settings (super admin only), Logout. Collapsible to `60px` via toggle. Mobile: overlay drawer at `<= 576px`
- **AdminNavbar:** Hamburger toggle, search input (placeholder, readOnly), language toggle, theme toggle, notification bell with unread badge, profile dropdown
- **Content area:** `max-height: calc(100vh - 56px)`, scrollable, padding `32px 24px`
- Sidebar width transitions: `230px ↔ 60px` with `0.3s ease` margin-left transition

### Track 5: Messaging

Messaging is a dedicated workspace with its own spatial architecture:

```
┌────────────────┬────────────────────────────────────┐
│                │ Chat Header (68–76px)              │
│ Conversation   ├────────────────────────────────────┤
│ List           │                                    │
│                │ Message List                       │
│ 280–360px      │ (independently scrollable)         │
│                │                                    │
│                ├────────────────────────────────────┤
│                │ Message Composer (48–56px)         │
└────────────────┴────────────────────────────────────┘
```

- Conversation List: `280–360px`, fixed left panel
- Chat Header: `68–76px`, fixed at top
- Message Composer: `48–56px`, fixed at bottom
- Message area: independently scrollable, fills remaining height
- When an active conversation is open, DO NOT create additional page-level vertical scroll

### Spacing System

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` | Tight gaps (icon + text, badge padding) |
| `--space-sm` | `8px` | Compact gaps (list items, inline elements) |
| `--space-md` | `16px` | Standard gaps (card padding, form spacing) |
| `--space-lg` | `24px` | Section gaps (between cards, major sections) |
| `--space-xl` | `32px` | Page padding, large section gaps |

### Grid System

Use native CSS Grid — never flexbox percentage math:

```css
/* Dashboard stats */
.statsGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-lg);
}

/* Charts row */
.chartsRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
}

/* Responsive collapse */
@media (max-width: 768px) {
  .statsGrid { grid-template-columns: 1fr; }
  .chartsRow { grid-template-columns: 1fr; }
}
```

### Containment

- All page content within `max-width: 1400px` (admin), unconstrained (feed)
- Feed content: `max-width: 680px` centered in center column
- Horizontal padding: `16px` (mobile), `24px` (tablet), `32px` (desktop)
- Full-height sections: `min-height: 100dvh` — never `100vh` (iOS Safari jump)

---

## 7. Responsive Rules

**Responsive is mandatory. Every screen must work at 375px, 768px, and 1440px.**

### Breakpoints

| Name | Range | Behavior |
|------|-------|----------|
| Mobile | `≤ 576px` | Single column. Sidebar hidden. Full-width cards. Touch-first. |
| Tablet | `577px — 768px` | Single column. Right sidebar hidden. Left sidebar hidden. |
| Desktop | `> 768px` | Full 3-column layout. All sidebars visible. |

### Mobile-First Rules

- All multi-column layouts collapse to single column. No exceptions
- No horizontal scroll on mobile — `overflow-x: hidden` on body
- Touch targets: minimum `44px` tap area for all interactive elements
- Buttons go full-width on mobile when in form contexts
- Typography scales via `clamp()` — never shrinks below `14px` body
- Nav items in left sidebar become a slide-in drawer (hamburger trigger)
- Cards maintain `16px` internal padding
- Modals become near-fullscreen on mobile (`width: 95%`, `max-height: 90vh`)
- Messaging becomes full-screen conversation view on mobile

### Desktop Enhancements

- Sticky sidebars lock to viewport edges
- Hover states active on all interactive elements
- Dropdown menus appear on hover for nav items
- Skeleton loading matches exact content dimensions

---

## 8. Motion & Interaction

> **Note:** This section documents intended motion so the coding agent implements correct animations.

### Motion Philosophy

Motion in LinkUp uses two approaches:

1. **React/Framer Motion** — for interactive, physics-based animations (reactions, page transitions, gesture-driven UI). Use spring physics: `stiffness: 100, damping: 20`.
2. **CSS transitions** — for simple state changes (hover, focus, visibility). Use `ease-out` for entrances, `ease-in` for exits, `ease-in-out` for continuous state changes.

Do NOT use `linear` easing for UI interactions — it feels robotic and unnatural.

### Timing Guidelines

- Micro-interactions: `120–250ms`
- Larger transitions: `250–350ms`
- Entrance animations: `opacity 0 → 1` + `translateY(8px → 0)`, `200ms ease-out`
- Respect `prefers-reduced-motion` — disable all non-essential animations when set

### Micro-Interactions

- **Button press:** `translateY(-1px)` on active, `150ms ease-out`
- **Card hover:** shadow elevation `sm → md`, `150ms ease`
- **Nav item hover:** background wash `transparent → var(--color-bg-secondary)`, `150ms ease`
- **Like heart:** scale `1 → 1.3 → 1` with color change, `300ms spring` (Framer Motion)
- **Follow button:** text morphs "Follow" → "Following" with width transition, `200ms ease`
- **Toast entrance:** slide up from bottom + fade in, `200ms ease-out`
- **Toast exit:** fade out + slide down, `150ms ease-in`
- **Modal entrance:** overlay fade `0 → 0.5`, content `translateY(8px) → 0` + `opacity 0 → 1`, `200ms ease-out`
- **Skeleton shimmer:** `opacity 0.4 → 0.8 → 0.4`, `1.5s ease-in-out infinite`

### Page Transitions

- Feed content: staggered post card reveals, `animation-delay: calc(var(--index) * 50ms)`
- Admin tables: fade in rows on page load, `0.3s ease`
- Settings tabs: content crossfade, `150ms ease`

### Performance Rules

- Animate ONLY `transform` and `opacity`. Never `top`, `left`, `width`, `height`
- Loading skeletons match exact layout dimensions
- IntersectionObserver for lazy-loading media and infinite scroll
- `content-visibility: auto` on post cards for rendering performance

---

## 9. Anti-Patterns (Banned)

### Visual

- No emojis in UI chrome (user-generated message content MAY contain emojis)
- No `Inter` font — use `Outfit` + `DM Sans`
- No generic serif fonts (`Times New Roman`, `Georgia`, `Garamond`)
- No pure black (`#000000`) — always `#1A1A1A` or `var(--color-text)`
- No neon outer glows or default box-shadow glows
- No oversaturated accent colors above 80% saturation
- No excessive gradient text on large headers
- No custom mouse cursors
- No overlapping elements — clean spatial separation always
- No `z-index` spam — use only for intentional stacking contexts (Navbar, Modal, Overlay, messaging layers)
- No `h-screen` — always `min-height: 100dvh`

### Layout

- No 3-column equal card layouts for features — use asymmetric grids or zig-zag
- No centered Hero sections at high variance — use split screen or left-aligned
- No `calc()` percentage hacks for layout — use CSS Grid
- No flexbox for page-level structural layout

### Content

- No filler UI text: "Scroll to explore", "Swipe down", scroll arrows, bouncing chevrons
- No generic placeholder names: "John Doe", "Acme", "Nexus"
- No fake round numbers: `99.99%`, `50%` — use organic data: `47.2%`, `1,284`
- No AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen"
- No broken Unsplash links — use `picsum.photos/seed/{id}/800/600` or SVG avatars
- No generic `shadcn/ui` defaults — customize everything to match this system

### Loading

- No circular spinning loaders — skeletal shimmer only
- No generic "Loading..." text — show content-shaped skeletons
- No empty "No data found" states — composed illustrations with guidance

### Typography

- No text below `12px` — accessibility floor
- No all-caps text for labels — use `Small` token with `font-weight: 600`
- No center-aligned body text — always left-aligned
- No justified text — left alignment only

---

## 10. Screen Specifications

### Landing Page (`/`)

**Purpose:** Convert visitors to registered users. First impression.
**Layout:** Navbar + gradient hero + minimal footer
**Hero content:** Logo (white inverted), brand name "LinkUp", Vietnamese tagline, two CTA buttons
**Color:** Full gradient background `#12A5A1 → #0A1F44`, white text
**Mobile:** Brand pane hidden. Buttons stack. Footer minimal.

### Login (`/login`)

**Purpose:** Authenticate existing users. Quick, frictionless.
**Layout:** Split — brand pane (left, 50%) + form pane (right, 50%)
**Brand pane:** Gradient bg, logo, "Welcome back" headline, brief tagline
**Form pane:** Email input, password input, "Forgot password?" link, "Log in" primary button, Google OAuth button, "Create account" link
**Validation:** Inline errors below each field, red text
**Mobile:** Brand pane hidden. Form centered, full-width.

### Register (`/register`)

**Purpose:** Create new accounts. Onboarding starts here.
**Layout:** Same split as login
**Form:** Display name, email, password, confirm password, "Create account" button, Google OAuth, "Already have an account? Log in" link
**Validation:** Real-time field validation, password strength indicator

### Feed (`/` — authenticated)

**Purpose:** Content consumption. The core loop.
**Layout:** 3-column (LeftSidebar | Feed | RightSidebar)
**Center column:** PostComposer at top, infinite-scroll PostCard list below
**PostCard:** Author header (avatar 40px, name, follow badge, timestamp), content (truncated at 200 chars with expand), media grid (1-4 items), action bar (like, comment, share, save)
**Right sidebar:** Search input, trending hashtags (top 5), follow suggestions (top 5 with follow buttons)
**Left sidebar:** Navigation with active state highlighting, create post button (turquoise pill), user dropdown at bottom

### Messages (`/messages`)

**Purpose:** Focused private/group communication. Conversation-first experience.
**Layout:** Conversation List + Chat Window (Track 5)
**Conversation List:** Search, recent conversations, unread indicators, participant avatar, conversation preview, timestamp
**Chat Window:** ChatHeader, customizable background, MessageList with grouping, MessageComposer
**Messaging MUST follow the Messaging Design System defined in Section 11.**

### Admin Dashboard (`/admin/dashboard`)

**Purpose:** Platform overview. Key metrics at a glance.
**Layout:** Admin sidebar + AdminNavbar + content area
**Content:** 6 stat cards (3x2 grid) with animated counters and trend indicators, line chart (user/post/report growth over time), pie chart (user status distribution), two recent tables (top users, top posts), period selector dropdown
**Charts:** Recharts library, responsive, with loading skeletons

### Admin Users (`/admin/users`)

**Purpose:** User management. Table-driven CRUD.
**Content:** Search bar, status filter dropdown, paginated table (avatar, name, email, role, status badge, joined date), ban/unban action, detail modal on row click

### Settings (`/settings`)

**Purpose:** User account management. Tabbed interface.
**Tabs:** Change Password, Privacy, Appearance (theme toggle), Storage (quota info), Active Sessions, Deactivate Account
**Layout:** 3-column user layout, settings content in center column
**Form pattern:** Label above input, helper text below, save button at bottom

---

## 11. Messaging Design System

Messaging is one of LinkUp's primary product experiences. The messaging UI should feel personal, focused, fluid, premium, readable, and fast.

### 11.1 Messaging Principles

1. Conversation first
2. Readability first
3. Compact message grouping
4. Clear sender hierarchy
5. Minimal chrome
6. Background personalization
7. Fast interaction
8. Strong accessibility
9. Realtime-friendly layout
10. Mobile-first behavior

### 11.2 Chat Window Architecture

```
ChatWindow
├── ChatHeader
├── ChatBackgroundLayer
│   ├── Background
│   └── ReadabilityOverlay
├── MessageList
│   ├── DateSeparator
│   ├── MessageGroup
│   │   ├── Avatar
│   │   └── MessageItems
│   └── NewMessagesIndicator
└── MessageComposer
```

The background is a visual layer. It must NOT be coupled to message layout, message grouping, message scrolling, or composer logic.

### 11.3 Chat Header

- Height: `68–76px`
- Avatar: `42–46px`, border-radius: `50%`
- Display name: `15–16px`, font-weight: `600`
- Status: `12–13px`, muted color
- Actions: voice call, video call, conversation info, more
- Icon hit area: minimum `40px` (desktop), `44px` (mobile)
- Header must remain readable regardless of selected chat background
- Use semi-transparent surface + backdrop blur OR solid surface depending on design system

### 11.4 Message Area

- Desktop padding: `24px`
- Large desktop: `24–32px`
- Mobile: `16px`
- Message area is independently scrollable
- Messages should not stretch full width — use max-width constraints

### 11.5 Message Grouping

Messages from the same sender that occur consecutively should visually form a group.

**Default grouping threshold:** 5 minutes (or reuse existing application grouping rule if present)

A new group starts when:
- Sender changes
- Grouping threshold is exceeded
- Date separator interrupts
- System message interrupts
- Application-specific grouping rule requires it

### 11.6 Incoming Message Group

Incoming messages MUST use this pattern:

```
[Avatar] [Message]
         [Message]
         [Message]
```

**Avatar rules:**
- Positioned on the LEFT
- Appears only once per group
- Positioned at the TOP of the group (flex-start)
- Vertically aligned with the FIRST message
- Never vertically centered against the entire group
- Never repeated for every message
- Never placed at the bottom of the group

**CSS concept:**
```css
.messageGroup {
  display: flex;
  align-items: flex-start;  /* NOT center */
  gap: 8px;
}

.messageAvatar {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  align-self: flex-start;
}

.messageGroupContent {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
```

### 11.7 Message Group Spacing

- Within same group: `2–4px`
- Between separate groups: `16–20px`
- This creates clear visual distinction between same-group and different-group messages

### 11.8 Group Chat

For group conversations, show sender name only at the beginning of the group:

```
[Avatar] Nguyễn Văn A
         [Message]
         [Message]
```

Sender name: `12px`, font-weight: `600`, muted or subtle accent color. Do not repeat sender name for every message.

### 11.9 Direct Chat

In one-to-one conversations, do not show sender names above every message. The Chat Header already identifies the participant.

### 11.10 Outgoing Message Group

Current user's messages align RIGHT:

```
                         [Message]
                         [Message]
                         [Message]
```

- Do not reserve space for an incoming avatar
- Do not display the current user's avatar by default in direct conversations
- Outgoing messages should align naturally to the right edge

### 11.11 Message Bubble

**Incoming:**
- Dark neutral surface (dark mode) / light neutral surface (light mode)
- High-contrast text
- Subtle border
- Minimal shadow

**Outgoing:**
- LinkUp turquoise (`var(--color-primary)`)
- High-contrast text (white)
- Optional subtle gradient if appropriate
- No neon treatment

**Bubble Dimensions:**
- Padding: `10–12px` vertical, `14–16px` horizontal
- Border-radius: `14–16px`
- Max-width: `65–70%` desktop, `80–85%` mobile
- Message text: `14–15px`, line-height: `1.45–1.55`

### 11.12 Timestamp

Timestamp should remain secondary:
- `11–12px`, muted color
- May appear: on hover, on focus, after message, or per existing behavior
- Do not let timestamps dominate the conversation

### 11.13 Date Separator

Preferred style: `──────── Hôm qua ────────` or centered `Hôm qua`

Typography: `11–12px`, font-weight: `500`, muted text, subtle surface, border-radius: `9999px`

Do not use a large dark rectangle.

### 11.14 Message Hover Actions (Desktop)

Desktop hover may expose compact floating toolbar:
- Reaction (quick emoji picker)
- Reply
- More (pin, forward, delete)

Toolbar: compact, floating, rounded, subtle surface, subtle shadow, non-blocking.

Mobile must NOT depend on hover — use tap/long-press interaction.

### 11.15 Reactions

If reactions exist, use compact reaction pills attached to the message. Do not make reaction UI oversized.

### 11.16 Reply

If reply exists, show compact reply preview above the current message with sender name and original content preview.

### 11.17 Voice Message

Do not use browser-native audio UI. Preferred: `[Play] ━━━━━ waveform ━━━━━ 0:23`

Include: Play/Pause, waveform visualization, progress, duration. Reuse existing audio playback logic.

### 11.18 Call Activity

Call messages are dedicated activity cards with states: outgoing, incoming, completed, missed, declined.

Card should be: compact, modern, readable, visually distinct. NOT giant black rectangles.

Reuse existing call actions.

### 11.19 Image / Video / File Messages

- Images: `border-radius: 14–16px`, reasonable max-width, `object-fit: cover`
- Video: reuse existing playback logic, redesign wrapper only
- Files: compact card with file icon, filename, size, download button

Do not invent backend functionality.

### 11.20 New Message Indicator

If user is reading older messages and new message arrives:
- DO NOT auto-scroll to bottom
- Show floating indicator: `↓ Tin nhắn mới`
- Click/tap scrolls to latest message
- If user is already near bottom, auto-scroll is allowed

### 11.21 Scroll Behavior

- When opening conversation: scroll to latest message per existing behavior
- When new messages arrive: auto-scroll if near bottom, otherwise show indicator
- Do not break existing pagination or infinite scroll

### 11.22 Chat Background System

Chat backgrounds are a first-class personalization feature.

**Supported types:**
1. Solid Color
2. Gradient
3. Preset Image
4. Custom Uploaded Image

### 11.23 Background Architecture

Layer order (bottom to top):
```
Background (z-index: 0)
↓
Readability Overlay (z-index: 1)
↓
Messages (z-index: 2)
↓
Floating Actions (z-index: 3)
↓
Composer (z-index: 4)
↓
Header (z-index: 5)
```

Do not scatter arbitrary z-index values throughout the application.

### 11.24 Solid Color Background

Support existing LinkUp background color presets. Use visual swatches with selected state (accent ring, check indicator).

### 11.25 Gradient Background

Preferred gradients: Turquoise → Blue, Blue → Purple, Purple → Pink, Dark → Turquoise, Dark → Purple.

Gradients must remain tasteful — avoid excessive saturation, harsh transitions, or distracting patterns.

### 11.26 Preset Image Background

Use thumbnail grid: `3–4` columns desktop, `3` columns mobile. Thumbnails: `border-radius: 10–12px`, `object-fit: cover`.

Hover: subtle scale + overlay. Selected: accent ring + check icon.

Reuse existing preset data if available.

### 11.27 Custom Background Upload

Allow upload using existing application storage system. Supported formats follow existing backend contract (typically JPG, JPEG, PNG, WEBP).

Do not create fake upload flow. After upload: show preview, apply immediately, persist using existing logic.

### 11.28 Background Image Display

```css
background-size: cover;
background-position: center;
background-repeat: no-repeat;
```

Never distort images. Crop naturally with cover.

### 11.29 Background Readability

Background personalization must NEVER compromise message readability.

Bright backgrounds may use stronger overlay. Dark backgrounds may use lighter overlay. Overlay must remain subtle — background should still be clearly visible.

### 11.30 Background Customization Panel

Entry point: Chat Header → More / Conversation Info → Chat Background

Panel tabs: `[Màu]` `[Gradient]` `[Ảnh]` `[Tải lên]`

Always provide: `[ Khôi phục mặc định ]` button.

If changes apply in realtime, do not add unnecessary Apply button.

### 11.31 Chat Composer

The composer should feel like a floating messaging control:
- Height: `48–56px`
- Border-radius: `14–18px`
- Semi-transparent surface where appropriate
- Subtle border, optional backdrop blur
- Strong contrast on all backgrounds

Structure: `[Emoji] [Attachment] [GIF] [Input] [Voice] [Send]`

Input: transparent, no heavy inner border. Placeholder: "Nhập tin nhắn..."

When text is empty: show voice action. When text exists: activate Send button.

### 11.32 Composer Accessibility

Every icon button must have `aria-label`. Minimum touch target: `44px` mobile. Visible focus state required.

### 11.33 Attachment Menu

Compact popover with only supported functions (image, file, location — only what backend actually supports). Never create fake buttons.

### 11.34 Voice Recording State

If voice recording exists, composer changes to recording mode with waveform, timer, cancel and send buttons. Reuse existing microphone and recording logic.

### 11.35 Messaging Responsive Behavior

**Desktop:** Conversation list + Chat Window. Hover interactions enabled.
**Tablet:** Reduce horizontal spacing. Conversation list may remain.
**Mobile:** Conversation list becomes full-screen. Opening conversation makes Chat Window full-screen. Header includes `← Back`. Composer remains accessible above mobile keyboard. No horizontal overflow.

### 11.36 Messaging Accessibility

All interactive controls require: accessible labels, keyboard support, visible focus, adequate hit area. Do not rely on color alone for selected state. Messages must remain readable over all supported backgrounds.

### 11.37 Messaging Performance

- Changing background must NOT rerender entire MessageList unnecessarily
- Media should be lazy-loaded where appropriate
- Infinite scroll must remain functional
- Realtime updates must remain functional

---

## 12. Icon System

**Library:** Boxicons CDN (`https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css`)

**Usage pattern:** `<i className="bx bx-{name}" />` (line icons) or `<i className="bxs bx-{name}" />` (solid)

**Key icon mappings:**
| Context | Icon |
|---------|------|
| Home nav | `bx-home-alt` |
| Explore | `bx-compass` |
| Notifications | `bx-bell` |
| Messages | `bx-message-rounded` |
| Friends | `bx-group` |
| Saved | `bx-bookmark` |
| Profile | `bx-user` |
| Settings | `bx-cog` |
| Search | `bx-search` |
| Create post | `bx-plus` |
| Like | `bx-heart` |
| Comment | `bx-message-rounded` |
| Share | `bx-share-alt` |
| Save | `bx-bookmark` |
| Close | `bx-x` |
| Menu | `bx-menu` |
| Logout | `bx-log-out` |
| Phone (call) | `bx-phone` |
| Video call | `bx-video` |
| Info | `bx-info-circle` |
| Attachment | `bx-paperclip` |
| Microphone | `bx-microphone` |
| Send | `bx-send` |
| Emoji | `bx-smile` |
| Reply | `bx-reply` |
| More | `bx-dots-horizontal-rounded` |
| Play | `bx-play` |
| Pause | `bx-pause` |
| Download | `bx-download` |
| Image | `bx-image` |

**Size convention:** `18px` (inline with text), `22px` (nav items), `24px` (action buttons)

Do not replace interface icons with decorative emojis. User-generated emoji content is allowed inside messages.

---

## 13. Implementation Notes

### CSS Architecture

- **CSS Modules** (`*.module.css`) for all component and page styles
- **`globals.css`** contains ONLY the CSS reset + design tokens — no component styles
- **No Tailwind**. No CSS-in-JS. Plain CSS with custom properties
- **Dark mode** via `[data-theme="dark"]` attribute selector on `<html>`, persisted in `localStorage`

### Token Usage

- Always use CSS variables from `globals.css` — never hardcode colors, sizes, or fonts
- `var(--space-*)` for all spacing
- `var(--radius-*)` for all border-radius
- `var(--text-*)` for font shorthand
- `var(--shadow-*)` for all box-shadows
- `var(--color-*)` for all colors
- Hard-coded values acceptable only for component-specific measurements not covered by tokens (e.g., message avatar `34px`, chat header `68–76px`)

### Provider Hierarchy

```
Root layout:
  GoogleOAuthProvider
    LanguageProvider (i18n)
      ThemeProvider (dark/light)
        ToastProvider

Admin layout adds:
  SWRConfig (data fetching)
    NotificationProvider (WebSocket)

User layout adds:
  SWRConfig
    NotificationProvider
      FollowedUserIdsProvider (optimistic follow state)
```

### API Layer

- `api/api.ts` provides `request<T>()` — attaches JWT from `localStorage`, handles 401 with token refresh
- SWR for data fetching with `60s` deduplication interval
- All API paths prefixed with `/api/`

### Translation

- Locale files: `locales/vi.json` (Vietnamese, default), `locales/en.json` (English)
- Hook: `useTranslation()` returns `{ t, language, setLanguage }`
- Keys: dot-notation `t('users.title')`, supports `{param}` interpolation
- Always add keys to **both** `vi.json` and `en.json`

### Data & Backend Preservation

UI redesign must not unnecessarily change: database schema, API contracts, authentication, message data structures, realtime protocols, storage architecture, pagination, or message ordering.

Existing data structures are authoritative. Presentation should adapt to existing data.

### Messaging Implementation Rules

When modifying messaging:
1. Inspect existing codebase first
2. Identify existing Chat components, hooks, API calls, WebSocket logic
3. Reuse existing functionality
4. Refactor presentation separately from business logic
5. Never replace working functionality with mock functionality

---

## 14. Final Design Principle

LinkUp should feel like one coherent product. Different surfaces may have different layouts, but they must share: typography, color language, spacing philosophy, interaction language, iconography, accessibility principles, and motion principles.

- **Messaging** is intentionally more focused and compact than the Feed
- **Feed** is content-first
- **Messaging** is conversation-first
- **Admin** is information-first
- **Auth** is task-first

Each surface has its own spatial architecture while remaining unmistakably LinkUp.

When a component-specific requirement conflicts with a generic rule, the more specific component requirement takes precedence. For Messaging, Section 11 is authoritative.

---

## 15. Vibe Coding Instructions

When an AI coding agent works on LinkUp:

1. **DO NOT** immediately rewrite components
2. First inspect: existing architecture, current implementation, design tokens, functionality, data flow
3. Then make the smallest clean refactor required to achieve the design
4. Prioritize: (1) existing functionality, (2) design system consistency, (3) accessibility, (4) responsive behavior, (5) maintainability, (6) visual polish, (7) performance

**Do not:**
- Invent functionality that does not exist
- Replace real data with mock data
- Introduce new libraries when existing stack can solve the problem
- Create a second design system or duplicate theme/token system
- Break working API calls, WebSocket logic, or data persistence

**Use this document as the authoritative visual and interaction specification for LinkUp.**
