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
| **Heart Red** | `#D32F2F` | `rgba(211,47,47,0.10)` | `rgba(255,107,129,0.16)` | Like/love reactions on posts and comments. Tokens `--color-heart`, `--color-heart-light` (dark: `#FF6B81`) |
| **Info Blue** | `#1976D2` | `#E3F2FD` | `#1E3A5F` | Informational badges, reviewed status |

### Dark Mode Overrides

```css
[data-theme="dark"] {
  color-scheme: dark;

  --color-primary: #3FBFBA;
  --color-primary-hover: #2BB0AC;
  --color-primary-active: #1FA3A0;
  --color-primary-light: rgba(63, 191, 186, 0.22);

  --color-secondary: #1A1A1A;
  --color-secondary-hover: #222222;
  --color-secondary-active: #2A2A2A;

  --color-cta: #E5E7EB;
  --color-cta-hover: #FFFFFF;
  --color-cta-active: #D1D5DB;
  --color-cta-text: #111111;

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

  --color-heart: #FF6B81;
  --color-heart-light: rgba(255, 107, 129, 0.16);

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.45);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.55);
  --shadow-lg: 0 12px 28px rgba(0, 0, 0, 0.65);
}
```

### Color Rules

- **Primary CTA buttons** use Deep Navy (`#0A1F44`) fill + white text — high contrast, authoritative. **Dark mode:** use `--color-cta` (light fill `#E5E7EB` + `#111` text) — navy `#0A1F44`/`#1A1A1A` would disappear against the dark canvas. `--color-secondary` in dark (`#1A1A1A`) is ink/gradient-end only, never a button fill
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
- Background: `var(--color-cta)` — light mode `#0A1F44`, dark mode `#E5E7EB` with `var(--color-cta-text)` (`#FFF` / `#111`), border: none
- Border-radius: `8px`, padding: `10px 20px`, font-weight: 600
- Hover: `var(--color-cta-hover)` background. Active: `translateY(-1px)` tactile push
- Disabled: `opacity: 0.5`, cursor: `not-allowed`
- Use for: primary page-level CTAs, form submissions, major actions
- Never use `var(--color-secondary)` as a button fill in dark mode — it is the ink/gradient-end token

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

**OAuth (Google) button** (`components/auth/GoogleAuthButton.tsx`):
- Custom visual matching auth inputs: `100%` × `44px`, `1px solid var(--color-border)`, `radius-md`, `--color-bg-secondary` fill, DM Sans `600`, inline 4-color Google "G" SVG (18px) + per-page label (`login.google.button` / `register.google.button`)
- Hover: fill → `var(--color-card)`; active: `translateY(-1px)`; keyboard focus (`:focus-within`): primary border + ring — identical to input treatment
- The real Google control is the GSI iframe from `@react-oauth/google` rendered **transparently on top** (`position:absolute; inset:0; opacity:0`), sized to the button via `ResizeObserver` + CSS fill — it owns clicks, focus, and the a11y tree; the visual `<span>` is non-interactive and `aria-hidden`
- Never wrap the official iframe in visible Google styling — the custom button is the design system's surface

**Nav Controls** (`components/NavControls.tsx` — shared by landing Navbar, AuthLayout header, AdminNavbar + PartnerNavbar):
- **Language toggle:** segmented pill in a glass track — `.track` = `radius-pill`, `padding: 3px`, `--seg-track-bg` + `1px --glass-border` + `blur(8px)`; segments VI/EN are `radius-pill`, 28px tall (32px ≤576px), `--text-caption` / `600`, text-secondary at rest
- **Active segment:** iOS-style elevated thumb — background `--seg-thumb-bg`, text `--seg-thumb-text`, `box-shadow: var(--shadow-sm)`. Light: white thumb on soft-surface track. Dark: bright thumb (`--color-cta` fill + `--color-cta-text`) on `rgba(0,0,0,0.35)` track. Use `aria-pressed` on segments
- **Theme toggle:** circular 36px button (40px ≤576px), `--seg-track-bg` + `--glass-border`, `border-radius: 50%`; hover = `--color-primary-light` wash + primary icon + icon rotates `15deg`; active = `scale(0.94)`. Must keep `aria-label`
- **Login button (landing navbar):** compact turquoise accent pill — `background: var(--color-primary)`, `color: var(--color-bg)` (auto-inverts light/dark), `height: 36px`, `padding: 0 18px`, `radius-pill`, `shadow-sm`; hover `translateY(-1px)` + `--color-primary-hover` + `shadow-md`. Compact size keeps it inside the §2 turquoise rule (never full-width)
- Focus-visible on every control: `2px solid var(--color-primary)` outline. `prefers-reduced-motion`: rotation/press transforms disabled
- Never render these controls inline per-page — always via `NavControls` to keep every navbar identical. Admin/Partner wrap it in a local `.controls` div that hides ≤576px (matches the previous behavior of those navbars)
- Circular icon siblings in a navbar (hamburger menu button, notification bell) reuse the theme-toggle recipe: 36px circle, `--seg-track-bg` + `--glass-border`, hover = `--color-primary-light` wash + primary icon, `aria-label` required
- **Tooltips:** icon buttons (theme, menu, bell) use a custom tooltip — `data-tooltip={t(...)}` rendered by `::after { content: attr(data-tooltip) }` (local class + `attr()`, never attribute-only selectors in CSS Modules), pill 12px, `background: var(--color-text)` / `color: var(--color-card)` (auto-inverts light/dark), shown on `:hover`/`:focus-visible` with 150ms fade + 2px rise, `z-index: 1200`. Never native `title` — it double-renders and cannot be styled. The language group and profile trigger carry a localized `aria-label` only (no tooltip)
- **Localization:** every `aria-label`/tooltip in nav chrome goes through `t()` — `nav.toggleTheme`, `nav.language`, `nav.toggleMenu`, reusing `sidebar.notifications` and `nav.profile`. Hardcoded English strings are banned
- **Brand (admin/partner navbar):** the LinkUp lockup lives in the navbar, centered — same brand formula as the landing Navbar `.brand`: 32×32 `object-fit: contain` icon + `gap: 8px` + wordmark `--text-h2` 20px `--color-primary`, hover icon `scale(1.06)` + focus-visible 2px outline. Centering is **flow-based**: the brand is a flex child with `margin: 0 auto`, placed between the left cluster (menu; search too on admin) and the right cluster — its auto margins absorb the free space, so it can never overlap siblings (never `position: absolute`). Moving the brand here means removing the rival auto-margins: `.searchForm { margin-right: auto }` (admin) and `.profileWrap { margin-left: auto }` (partner) — two owners of the same free space fight. ≤576px: hide the wordmark (icon only) and hide `.userInfo` in the profile trigger (avatar + chevron only) — also relieves mobile crowding. The sidebar starts directly with its menu (`sideMenu { margin-top: 16px }`)

### Glass Surface (floating chrome variant)

The shared recipe for anything that floats — landing navbar/footer, auth header/footer/card, user navbar, admin/partner navbar + sidebar:

- Background: `var(--glass-bg)` (`color-mix` card + transparent; `--glass-bg-strong` when content behind must stay legible)
- `backdrop-filter: blur(var(--glass-blur))` (+ `-webkit-` prefix)
- Border: `1px solid var(--glass-border)`
- Radius: `var(--radius-lg)` (all four corners)
- Shadow: `var(--glass-shadow)`
- Tokens live in `globals.css` (light + `[data-theme="dark"]` overrides) — never inline a `color-mix`/`blur` value per component
- Glass needs a backdrop: place it over a tinted canvas, mesh gradient, or scrolling content — never over a flat same-color surface (the blur does nothing)
- Admin/Partner: the whole `.layout` carries `--color-bg-secondary` as the canvas so the inset 16px chrome has tint under it
- Gradient-stage glass (hero chips, closing panel) uses literal `rgba(255,255,255,0.12–0.14)` fills + `rgba(255,255,255,0.22–0.26)` borders instead of the card-mix tokens

### Dropdown / Popover (nav popovers)

Anything anchored to a navbar control — profile menu, notification center — follows the Glass Surface recipe:

- Container: `--glass-bg-strong` + `backdrop-filter: blur(--glass-blur)` + `--glass-border` + `radius-lg` + `--glass-shadow`, `padding: 6px`, `transform-origin: top right`
- Entrance: `popIn` — `opacity 0→1` + `translateY(-6px)→0` + `scale(0.98→1)`, `180ms ease-out`; animation disabled under `prefers-reduced-motion`
- Anchor: `position: absolute; right: 0; top: calc(100% + 8px); z-index: 1100`
- **Profile dropdown** (Admin + Partner): identity header on top — avatar 40px + name + email in a `--color-bg-secondary` `radius-md` block — then items. Items: transparent rest, hover = `--color-primary-light` fill + `--color-primary` text/icon; danger item hover = `color-mix(--color-danger 8%)` keeping danger text/icon. Dividers: `--glass-border`. The navbar profile trigger itself is a pill with `--color-bg-secondary` hover wash
- **Notification center** (`NotificationDropdown.tsx`): header row = title + "mark all read" as a `--color-primary-light` pill button; scrollable list (`scrollbar-width: thin`, `6px` padding) of inset `radius-md` items; footer = full-width "view all" pill (`--color-primary-light`). Unread item = `--color-primary-light` fill + primary dot; read hover = `--color-bg-secondary`; empty state = bell glyph + label
- **Notification type icons:** 32px circular chips — `background: color-mix(in srgb, currentColor 14%, transparent)` with the type color class on the chip (never a bare colored glyph); sender avatar (32px circle) replaces the chip when present
- Never render nav popovers as solid `--color-card` boxes — they must match the floating chrome they hang off

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

**Auth inputs** (Track 2, `authShared.module.css`):
- Height `44px`, **filled style**: background `var(--color-bg-secondary)`, no resting border; `aria-invalid` → `1px solid var(--color-danger)` + danger wash
- Error/hint line reserves a fixed `18px` slot below every field — forms never shift when a message appears
- Password fields use `PasswordInput` (focusable eye toggle, `aria-pressed`, `auth.showPassword`/`auth.hidePassword` labels)
- Autofill override: white/`--color-bg-secondary` background + `--color-text`, no yellow browser tint

### Textarea (Post Composer)

- Min-height: `120px`, auto-expands with content
- Same border/focus treatment as input
- No resize handle visible — auto-height only
- Character counter at bottom-right when approaching limit

### Avatars

- Circular (`border-radius: 50%`)
- Sizes: `28px` (table rows, comments), `32px` (nav), `34px` (message groups), `36px` (community member stack), `40px` (post cards, suggestions), `42–46px` (chat header), `56px` (profile headers, community card overlap), `64–80px` (community detail header overlap), `128px` legacy (do not reuse — community header now caps at 80px)
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
- Container: `var(--color-card)`, `border-radius: 20px`, `max-width: 560px` (standard), `1080px` (post detail — split 2-column)
- **Glass variant for chrome-attached modals** (e.g. admin Change Password): container = `--glass-bg-strong` + blur + `--glass-border` + `--glass-shadow` (keeps `radius-lg`), overlay gains `backdrop-filter: blur(6px)`; header/footer borders use `--glass-border`. Content modals (post detail, review, ban…) stay on `--color-card`
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

- Position: bottom-right, `16px` from edges (mobile: full-width, honors `safe-area-inset-bottom`)
- Width: `360px` max
- Surface: `var(--color-card)`, `1px solid var(--color-border)`, `border-radius: var(--radius-lg)`, `var(--shadow-lg)` — no left accent stripe
- Lead: `32px` circular **icon chip** — background `var(--color-{type}-light)`, icon `var(--color-{type})` (solid Boxicons glyph)
- Title: `14px` / `600`; message: `--text-caption` muted
- Optional **action button** (e.g. "Undo"): text button in `var(--color-primary)`, `600`, hover wash `var(--color-primary-light)`
- Auto-dismiss: 4 seconds with `2px` bottom progress bar; **timer and progress pause on hover/focus**
- **Stack:** max `3` visible toasts (overflow exits oldest with animation); duplicate `type + title` replaces the existing toast
- **Swipe:** horizontal drag > `60px` dismisses (touch)
- Entrance: `translateY(16px) + fade`, `200ms cubic-bezier(0.21, 1.02, 0.73, 1)`; exit: `fade + translateY(12px)`, `150ms ease-in`
- `prefers-reduced-motion`: transforms disabled, instant appear/disappear
- Types: success, error, warning, info — chip color distinguishes them; error uses `role="alert"`, others `role="status"`

---

## 5. Landing Page (Track 1)

The landing page is the first impression for unauthenticated visitors.

### Layout

**Floating glass chrome + split gradient hero + zig-zag sections:**

- **Canvas:** the page sits on `--color-bg-secondary` — the same tinted canvas as Track 3; all chrome floats
- **Navbar:** sticky `top: var(--space-md)`, inset `var(--space-md)`, glass surface (`--glass-bg` + `backdrop-filter: blur(var(--glass-blur))`), `border-radius: var(--radius-lg)`, `--glass-shadow`. Mobile dropdown is a glass sheet with rounded bottom corners
- **Hero stage:** rounded gradient card inset `var(--space-md)` — mesh background (base `linear-gradient(135deg, #12A5A1, #0A1F44)` + white bloom top-left + faint warm ember bottom-right) with two slowly drifting decorative orbs (`aria-hidden`)
- **Split grid** `1.05fr 0.95fr` — asymmetric by rule (never equal columns):
  - **Left:** inverted white logo + brand, `H1` tagline, subline, CTA pair, 3 glass value-prop chips (`brand.point1..3`) — content left-aligned, never centered
  - **Right:** decorative "app preview" composition (`aria-hidden`) — glass post card (avatar + line placeholders + media block + action chips), glass chat card (2 bubbles), glass notification pill with orange dot; each floats with a slow `floatY` drift
- **Features:** 3 zig-zag rows (text ↔ glass mock panel): friend list with connect pills, encrypted chat bubbles + encryption chip, group-call tile grid + control bar
- **Closing band:** gradient card (`--color-secondary → --color-primary`) inset like the hero — left: trust heading + body + 3 glass badges; right: glass CTA panel (heading + body + the 2 buttons stacked)
- **Footer:** floating glass row, same recipe as the navbar, inset `var(--space-md)`

### Rules

- No stock photos or hero images — gradients, glass panels and DOM mockups ARE the visual
- No "Scroll to explore" or arrow indicators
- No fake stats, no placeholder names — mock content uses realistic Vietnamese names via `landing.mock.*`
- CTA buttons: white fill + navy text (primary), translucent white border + blur (secondary); full-width ≤576px
- Entrance motion: hero children stagger `fadeUp`; sections reveal via IntersectionObserver (`data-reveal` + `data-reveal-active` on root) — content must be visible when JS is unavailable
- `prefers-reduced-motion`: orbs, floats, staggers, and reveals are all disabled

### Mobile

- ≤967px: hero collapses to single column, preview composition hidden, feature rows stack (text above visual), closing band stacks
- ≤576px: hero/footer/closing inset shrinks to `var(--space-sm)`, buttons full-width
- Gradient stage remains full-bleed-inset; glass chrome unchanged

---

## 6. Layout Principles

LinkUp has **five distinct layout tracks** — each screen type has its own spatial architecture.

### Track 1: Public Landing

```
┌──────────────────────────────────────────────┐
│  Glass Navbar (floating, sticky, inset 16px) │
├──────────────────────────────────────────────┤
│  ┌─ Gradient Hero Stage (inset, rounded) ──┐ │
│  │ Left: logo, tagline, CTAs, glass chips  │ │
│  │ Right: glass app-preview (decorative)   │ │
│  └─────────────────────────────────────────┘ │
│  Features — zig-zag rows, glass mock panels │
│  Closing band — gradient + glass CTA panel  │
├──────────────────────────────────────────────┤
│  Glass Footer (floating, inset 16px)         │
└──────────────────────────────────────────────┘
```

- Canvas is `--color-bg-secondary`; navbar, footer, hero stage and closing band are all inset by `var(--space-md)` and rounded `var(--radius-lg)` — the same floating language as Track 3

### Track 2: Auth Pages (Login, Register, Forgot/Reset Password, Verify Email, Onboarding)

**Fixed-height split layout — the page never scrolls, only the form pane does. Chrome floats on a tinted canvas (glass header/footer + the split as one floating card):**
```
┌─ shell: 100dvh, overflow hidden, pad 16px, bg --color-bg-secondary ─┐
│ ┌─ Glass Header (56px: logo, lang + theme, rounded) ──────────────┐ │
│ ├────────────────────────┬────────────────────────────────────────┤ │
│ │                        │  (scroll container ↓)                 │ │
│ │  Brand Pane            │  Form Pane                            │ │
│ │  mesh gradient +       │  bg: tinted mesh                      │ │
│ │  drifting orbs +       │  AuthCard (glass, max-w: 420px)       │ │
│ │  staggered entrance    │  centered, sticks to top when taller  │ │
│ ├────────────────────────┴────────────────────────────────────────┤ │
│ │  Glass Footer (© 2026 LinkUp, slim, rounded)                    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
  ↑ the whole thing is a floating composition: shell padding + rounded
    header / split card / footer with --glass-* tokens
```
- **Shell:** `height: 100dvh` + `overflow: hidden` + `padding: var(--space-md)` + `gap: var(--space-sm)` on `--color-bg-secondary` — header, split card, and footer are pinned; no page-level scroll
- **Glass chrome:** header, footer, and the split container (`AuthLayout .main`) use the glass recipe — `--glass-bg`, `backdrop-filter: blur(var(--glass-blur))`, `1px solid var(--glass-border)`, `--glass-shadow`, `border-radius: var(--radius-lg)`
- **Brand pane:** 50% width, layered mesh gradient (base `135deg` primary → secondary + white bloom + faint ember), white text: logo + headline + tagline + 3 value props (`brand.point1..3`), two decorative orbs drifting on an 18–22s loop (`aria-hidden`). Children stagger-fade in (40/110/180/250ms). Does not scroll
- **Form pane:** 50% width, `overflow-y: auto`, tinted mesh background (`--color-bg-secondary` + two faint `--color-primary` radial washes) — the backdrop the glass AuthCard blurs. The ONLY scrollable region on auth pages. `AuthCard` uses the `min-height: 100%` centering pattern: content shorter than the pane centers vertically; taller content sticks to the top and scrolls (never clipped at the top edge)
- **AuthCard:** glass surface — `--glass-bg-strong`, `blur(16px)`, `--glass-border`, `--glass-shadow`. ≤576px keeps the glass but drops the shadow (never strips to transparent)
- **Mobile (≤767px):** column stack — brand pane becomes a **compact gradient strip** (logo + headline + tagline, value props hidden), form pane takes the remaining height and scrolls internally. Header and footer stay pinned
- **Keyboard:** focusing an input scrolls the form pane (nearest scrollable ancestor), not the page
- **Fallback:** if mobile soft-keyboard focus-scroll misbehaves on a browser, revert only `<768px` to page scroll (`height: auto; overflow: visible` on the shell)
- Server errors render inline (`FormAlert`, `role="alert"`) inside the form — never toast-only
- `prefers-reduced-motion`: orb drift and brand-pane stagger disabled

### Track 3: User Social (3-Column)

```
┌──────────┬──────────────────────────┬──────────────┐
│          │   Navbar (56px card)     │              │
│ Left     │   sticky top 16px        │   Right      │
│ Sidebar  ├──────────────────────────┤   Sidebar    │
│ floating │                          │   floating   │
│ card     │   Feed / Page Content    │   card       │
│          │                          │              │
└──────────┴──────────────────────────┴──────────────┘
```

**Floating panel chrome (all three components):**

- **Canvas:** `.layout` background is `var(--color-bg-secondary)` — white cards visibly float on the tinted canvas (light `#F5F5F5`, dark `#1A1A1A`)
- **Panels:** Left sidebar, Right sidebar, and Navbar each render as a floating card — `var(--color-card)` bg, `1px solid var(--color-border)`, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-sm)` (navbar: `var(--shadow-md)` since it overlays scrolling content)
- **Grid:** `gap: var(--space-md)` + `padding: var(--space-md)` — panels never touch viewport edges; mobile drawers are floating sheets inset `16px` as well
- **Navbar:** sticky at `top: var(--space-md)`, rounded 4 corners, glass surface (`var(--glass-bg)` + `backdrop-filter: blur(var(--glass-blur))`, see §4 Glass Surface), `margin-bottom: var(--space-md)`; feed content scrolls underneath
- **Sidebars:** sticky full-height cards, `height: calc(100dvh - var(--space-md) * 2)`, scrollbars hidden, own internal padding/scroll
- **Center content pages** stay transparent — their white cards (PostCard, settings panels) rest directly on the tinted canvas. The messaging workspace (`.page`) is itself a floating card
- **Active nav item** in left sidebar: pill bg `var(--color-primary-light)` + primary text (matches active tab pattern)
- **Right sidebar sections** (`.card`, gray blocks): hover elevates to `box-shadow: var(--shadow-sm)` over `0.15s ease`
- **Drawers (≤1024 right, ≤768 left):** floating sheets — inset `var(--space-md)`, rounded 4 corners, `shadow-lg` when open, slide-in `0.25s ease`

- **Left Sidebar (260px):** Logo, nav items (Home, Explore, Notifications, Messages, Friends, Groups, Saved, Profile), Create Post button, user profile dropdown at bottom. Sticky, full height, scrollable
- **Center Content:** `UserNavbar` (search + tabs) at top, then page content below. Flex-grow, scrollable
- **Right Sidebar (360px):** Search box, trending hashtags, follow suggestions. Sticky, full height
- **Tablet (< 1024px):** Right sidebar hidden
- **Mobile (< 768px):** Left sidebar hidden (hamburger menu). Right sidebar hidden. Content full-width

### Track 4: Admin Dashboard (Sidebar + Content) — also Partner

```
 tint canvas (--color-bg-secondary), inset 16px
┌─16px─┬───────────────────────────────────┐
│ ┌──────────┐  ┌───────────────────────┐  │
│ │ Admin    │  │ AdminNavbar (56px)    │  │
│ │ Sidebar  │  │ glass, radius-lg      │  │
│ │ glass    │  ├───────────────────────┤  │
│ │ 230px    │  │                       │  │
│ │ collapse │  │   Main Content        │  │
│ │ to 60px  │  │   padding: 32px 24px  │  │
│ └──────────┘  │   scrollable          │  │
│               └───────────────────────┘  │
└──────────────────────────────────────────┘
```

- **Canvas:** `.layout` is tinted `--color-bg-secondary` (full viewport, incl. the gutters) so the floating chrome always has a tinted backdrop; `.content` repeats the tint
- **Sidebar (Admin + Partner):** `position: fixed`, inset `var(--space-md)` on top/left, `height: calc(100dvh - space-md*2)`, glass recipe + `radius-lg`. Logo, nav items with icons, separator, footer items, Logout. Collapsible to `60px` (`.close`); content `margin-left` follows: `262px ↔ 92px` (230/60 + 2×16 inset), `0.3s ease`. Mobile: floating drawer at `<= 576px` (off-canvas via `translateX(calc(-100% - space-md))`, overlay z-index 1999 < sidebar 2000)
- **Nav item states:** rest = transparent; hover = `--color-bg-secondary` wash; **active = `--color-primary-light` pill + `--color-primary` text** (full 48px radius — same language as Track 3). Never resurrect the old opaque "notch" `::before/::after` trick — it requires solid backgrounds and breaks on glass
- **Navbar (Admin + Partner):** glass recipe, `margin: space-md space-md 0`, sticky `top: space-md`, 56px. Order: circular hamburger `<button>` (36px, glass, `aria-label="Toggle menu"`) → search pill → `<NavControls>` in a `.controls` wrapper → bell (admin) → profile dropdown. Search is a unified pill: `--color-bg-secondary`, `radius-pill`, magnifier icon + borderless readOnly input, `max-width: 400px`, `:focus-within` primary border; ≤576px it collapses to a 36px circle and `.controls` hides. Bell opens the glass notification-center popover and the profile trigger opens the glass identity-header dropdown — both per §4 Dropdown / Popover
- **Notification bell:** circular glass (theme-toggle recipe) with red unread badge at top-right
- **Content area:** `max-height: calc(100dvh - 72px)` (16 top inset + 56 navbar), scrollable, padding `32px 24px`

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
- **Auth pages (Track 2) are the exception:** they use fixed `height: 100dvh` + `overflow: hidden` on the shell so the page itself never scrolls — overflow is absorbed by the form pane's `overflow-y: auto`

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
- **Nav item hover:** background wash `transparent → var(--color-bg-secondary)`, `150ms ease`; active admin/partner sidebar item = `--color-primary-light` pill (no transition on activate)
- **Circular nav icon (menu/bell/theme):** hover = `--color-primary-light` wash + primary icon, press = `scale(0.94)`, `150ms ease-out`
- **Like heart:** scale `1 → 1.3 → 1` with color change, `300ms spring` (Framer Motion)
- **Follow button:** text morphs "Follow" → "Following" with width transition, `200ms ease`
- **Toast entrance:** slide up from bottom + fade in, `200ms ease-out`
- **Toast exit:** fade out + slide down, `150ms ease-in`
- **Modal entrance:** overlay fade `0 → 0.5`, content `translateY(8px) → 0` + `opacity 0 → 1`, `200ms ease-out`
- **Skeleton shimmer:** `opacity 0.4 → 0.8 → 0.4`, `1.5s ease-in-out infinite`
- **Hero/auth entrance stagger:** children fade + `translateY(10–12px → 0)`, `420–460ms ease-out`, delays `40ms → ~360ms` in DOM order
- **Orb drift:** decorative gradient orbs loop `translate3d` + subtle `scale`, `18–26s ease-in-out infinite alternate` (auth brand pane, landing hero)
- **Hero preview float:** glass mock cards bob `-12px` vertically, `6.5–8s ease-in-out infinite alternate` with negative delays so they never sync
- **Section reveal (landing):** IntersectionObserver adds `.revealed` at `threshold: 0.15` → `opacity 0→1` + `translateY(14px→0)`, `500ms ease-out`; hide-state only activates after JS adds `data-reveal-active` (no-JS = fully visible)
- All of the above are disabled under `prefers-reduced-motion`

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
- No `h-screen` — use `min-height: 100dvh` (fixed `height: 100dvh` only for intentional no-page-scroll shells like auth Track 2)

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
**Layout:** Track 1 — glass navbar + gradient hero stage + zig-zag features + closing band + glass footer (see §5)
**Hero content:** left = inverted logo, "LinkUp", Vietnamese tagline (`landing.tagline`), subline (`landing.sub`), 2 CTA buttons, 3 glass value chips (`brand.point1..3`); right = decorative glass app-preview (post card, chat card, notification pill, `aria-hidden`)
**Features:** 3 zig-zag rows (`landing.feature1..3`), each with a glass mock panel (friend list / encrypted chat / group call)
**Closing:** gradient band — trust copy + badges (`landing.trust*`, `landing.badge*`) left, glass CTA panel (`landing.ctaTitle/Body`) right
**Color:** hero/closing gradients `#12A5A1 → #0A1F44` variants, white text; canvas `--color-bg-secondary`
**Mobile:** preview hidden ≤967px; sections stack; buttons full-width ≤576px

### Login (`/login`)

**Purpose:** Authenticate existing users. Quick, frictionless.
**Layout:** Fixed-height split (Track 2) — brand pane (left, 50%) + form pane (right, 50%, scrolls internally); glass header/footer, glass AuthCard on tinted mesh
**Brand pane:** Gradient bg, logo, headline, tagline, 3 value props
**Form pane order:** title + subtitle (left-aligned) → Google OAuth button ("Đăng nhập với Google", custom — see §4) → divider ("hoặc") → email input → password input (with "Quên mật khẩu?" in the label row) → navy full-width "Đăng nhập" → footer link "Chưa có tài khoản? Đăng ký"
**Validation:** Real-time per-field errors below each field (reserved 18px slot — layout never jumps); server errors inline `FormAlert` (`role="alert"`, maps `auth.EMAIL_NOT_VERIFIED` → action button to `/verify-email`, locked/attempt-limit codes → warning variant)
**Focus:** email autofocused on ≥768px only (mobile keyboard would cover the form)
**Mobile (≤767px):** compact gradient brand strip on top; header/footer pinned; form pane scrolls internally

### Register (`/register`)

**Purpose:** Create new accounts. Onboarding starts here.
**Layout:** Same fixed-height split as login
**Form pane order:** title + subtitle → Google OAuth button ("Đăng ký với Google", custom — see §4) → divider → display name → email → password → confirm password → terms checkbox → navy full-width "Đăng ký" → footer link "Đã có tài khoản? Đăng nhập"
**Password UX:** live strength meter (4 segments, tone weak/fair/strong, label `aria-live="polite"`) + 5-item requirement checklist (`register.req.*`, icons flip `bx-x-circle` → `bx-check-circle` live) + confirm-match live hint (`register.confirmMatchOk`)
**Terms:** plain-text checkbox row (no links — no `/terms` page exists), client-only error until checked
**Validation:** Real-time per-field errors, strength meter, inline `FormAlert` for server errors (`auth.EMAIL_EXISTS` → danger), focus first invalid field on submit
**Focus:** display name autofocused on ≥768px only

### Feed (`/` — authenticated)

**Purpose:** Content consumption. The core loop.
**Layout:** 3-column (LeftSidebar | Feed | RightSidebar)
**Center column:** PostComposer teaser at top, infinite-scroll PostCard list below

**Post composer (teaser → modal):**
- **Entry:** `PostComposer` is a teaser card only — avatar + pill placeholder button ("Bạn đang nghĩ gì?") + round photo button. Clicking the pill opens the modal; the photo button opens it with the file dialog pre-triggered (`initialPicker="media"`). The same `CreatePostModal` is also opened by the LeftSidebar "Tạo bài viết" button. Posts propagate via the `post:created` window event (Feed prepends on receipt — no `onPosted` prop)
- **Modal structure (top → bottom):** header (avatar + name + ✕ close) → optional draft chip → scrollable body (collapsible title, contentEditable, char count, media previews) → options band → footer bar
- **Title:** collapsed by default behind a dashed ghost pill "+ Thêm tiêu đề (không bắt buộc)"; expands to the title input on click
- **Options band (FB-style rows, one concern per row):**
  - Audience row: privacy icon + current label + chevron → opens the privacy dropdown menu (opens upward, above the band)
  - Comments row: message icon + "Bình luận" + state text (Đang bật/Đã tắt) + iOS-style switch (44×24 track, ON = comments enabled)
- **Footer bar:** left = icon-only round attach buttons (photo/video, GIF, emoji — 40px circles, tooltip + aria-label); right = primary "Đăng bài" pill. GIF/emoji pickers anchor upward (`placement="top"`). There is no Cancel button — ✕ / overlay click / Escape all close the modal **and keep the draft**
- **Draft autosave:** debounced 400ms to `localStorage` key `linkup.composer.draft` (`{title, content, privacy, commentsDisabled, gif, savedAt}`); empty form deletes the key; hydrated on next open with a "Đã khôi phục bản nháp · Xoá" chip; cleared on successful post. Emoji round-trip: serialized `:shortcodes:` are rebuilt as inline `<img class="emojiInline" data-code=…>` on restore. Files are not part of the draft (browser limitation)
- **Char count:** hidden below 4000 chars (80% of 5000); amber `--color-warning` from 4000; red `--color-danger` + submit validation over 5000
- **PostCard:** Author header (avatar 40px, name, follow badge, timestamp), content (truncated at 200 chars with expand), media grid (1-4 items), action bar (like, comment, share, save)
**Right sidebar:** Search input, trending hashtags (top 5), follow suggestions (top 5 with follow buttons)
**Left sidebar:** Navigation with active state highlighting, create post button (turquoise pill), user dropdown at bottom

### Post Card & Post Detail Modal

**PostCard (`components/PostCard.tsx`):**

- **Header:** avatar 40px, display name + optional Follow badge, `@username · relative time` (absolute date in `title` attr), privacy chip (globe/lock/group icon) when `status !== 'public'`, "Đã chip" pin badge when `is_pinned`
- **Content:** hashtags (`#tag`) render as primary-colored links → `/search?q=%23tag`. Truncation at 200 chars with "Xem thêm / Thu gọn"
- **Media grid:** 1–4 items; when a post has >4 media the 4th tile shows a `+N` overlay. Cards are clickable to open the detail modal (keyboard: `role="button"` + Enter/Space)
- **Action bar — two clusters:**
  - Left: **Like · Comment · Share** (ghost buttons, icon + count)
  - Right (`margin-left: auto`): **Save · Send-to-friend** — or a single Share button opening a compact popover menu (`Chia sẻ bài viết` / `Gửi cho bạn bè`)
- **Like:** color `var(--color-heart)`, hover wash `var(--color-heart-light)`, pop animation `scale 1 → 1.3 → 1` (300ms). Double-tap on card body = like (touch)
- **Never** hardcode red/pink values — always `--color-heart` tokens (dark mode override required)
- **Empty post:** a post with no title, no content, **and** no media renders a single muted placeholder line (`post.noContent`, italic `--color-text-secondary`). Media-only posts show no annotation — the media is the content
- **View count (owner-only):** the author's own posts replace the (formerly disabled) Save button in the right action cluster with an eye stat — `bx-show` icon + compact count (`post.viewCount`, uses the shared `formatCount`). Other users' posts keep the Save button unchanged. The modal stats row keeps showing views to everyone
- **Video player (`components/VideoPlayer.tsx` + `VideoPlayer.module.css` — shared by PostCard media grid and Post Detail Modal carousel):**
  - Control row (left → right): play/pause → rewind 10s (`bx-rotate-left`) → forward 10s (`bx-rotate-right`) → mute + volume slider → spacer → speed (`1x`) → PiP (`bx-slideshow`, only when `document.pictureInPictureEnabled`) → fullscreen (`bx-fullscreen`). Seek bar with current/total time sits above the row
  - **Volume:** mute toggle + `input[type=range]` (`0…1`, step `0.05`); dragging sets `video.volume` and unmutes (0 = muted); mute button restores the previous volume. Slider reveals on hover/`focus-within`, always visible on coarse pointers
  - **Speed menu:** popover above the `Nx` button with `0.5x / 1x / 1.25x / 1.5x / 2x` (`role="menu"` + `menuitemradio`); closes on outside click / Escape. No quality selector — backend stores a single `file_uri` per video (no renditions/HLS), so quality switching is out of scope
  - **Keyboard:** container is `tabIndex=0` + `role="region"` (`video.label`); `Space/K` play-pause, `←/→` ∓10s, `↑/↓` volume ±0.1, `M` mute, `F` fullscreen, `Escape` closes the speed menu. Seek track is itself a `role="slider"` (`←/→` = ∓5s there) with `aria-valuetext "m:ss / m:ss"`
  - **Chrome:** controls float on the dark video scrim, so glyphs stay white-on-dark in both themes (functional exception to the token rule); layout tokens (`--space-*`, `--radius-*`, `--color-primary-light` focus ring) still apply. Styles live in the CSS Module — never inline
  - **i18n:** every label via `t('video.*')` (`label/play/pause/rewind/forward/seek/mute/unmute/volume/speed/pip/fullscreen/unavailable`) in both `locales/vi.json` and `locales/en.json`
  - Auto-hide `2.5s` while playing; error state = `role="alert"` with `video.unavailable`

**Post Detail Modal (`components/PostDetailModal.tsx`):**

- **Desktop ≥960px — split 2-column grid:**
  - Left pane: media stage, `background: #000`, full height, carousel with prev/next (keyboard ←/→ + touch swipe), counter badge, dot indicators — prev/next, counter, and dots are all hidden when the post has a single media item
  - Right pane (440px): header (fixed) → scroll area (body → stats → action bar → comments) → comment composer (fixed at bottom of the right pane, never spans the media pane)
  - Text-only posts: single column, content `max-width: 680px` centered
- **Mobile ≤768px:** stack — media on top, content scrolls, composer pinned above the safe area
- **Stats row:** one line — `N lượt thích · N bình luận · N chia sẻ · N lượt xem`; clicking the comment segment scrolls to the comment list
- **Action bar:** same two-cluster rule as PostCard. After sharing, show a "Đã chia sẻ" chip — do not disable the share button permanently
- **Owner menu (⋮):** toggle comments, copy link, delete (styled confirm modal — never `window.confirm`). **Guest menu:** copy link, report
- **Comments:** current-user avatar left of the composer input; sort as a segmented pill control; Reply scrolls to + highlights the parent comment; char counter near the 1000-char server limit (amber → red); loading = comment skeletons (no spinners); empty state = composed illustration + guidance line
- **A11y:** `role="dialog"`, `aria-modal="true"`, focus trap, focus restore on close, Escape + overlay click close
- **URL:** opening from a feed pushes `/posts/{id}`; browser Back closes the modal first
- **Motion:** overlay `0 → 0.5`, content `opacity 0 → 1` + `translateY(8px) → 0`, `200ms ease-out`

### Stories (Feed bar + editor)

**Purpose:** Ephemeral 24h media. Facebook-style vertical preview cards + full-screen-ish editor modal.

**Story bar (`StoryBar`, top of Feed center column):**
- **Chrome:** single `--color-card` row, `1px --color-border`, `radius-lg`, elevation `0 2px 12px rgba(0,0,0,0.06)` (matches PostCard); horizontal scroll with edge mask fade; scrollbar hidden
- **Tiles:** 112px wide, `aspect-ratio: 9/16`, `radius-md`. Preview = story thumbnail (`object-fit: cover`) + bottom-up dark gradient + avatar ring (`--story-ring-gradient`, viewed = `--color-border` ring) + name bottom-left (white, `--text-caption`, text-shadow). Cards lift `-2px` + `--shadow-md` on hover (disabled under `prefers-reduced-motion`)
- **"Your Story" tile:** avatar variant when `avatarUri` is provided (thumbnail + gradient + primary `+` badge top-right + "Tin của bạn" label); fallback = dashed-neutral card with primary `+` circle. Creates via `onCreateStory`
- **A11y:** every tile is `role="button" tabindex=0` with Enter/Space activation; preview cards labelled `"Xem tin: {name}"`; focus-visible = `2px --color-primary` outline
- **Overflow menu:** right-click or ⋮ opens the mute menu (fixed-position, closes on scroll/resize)

**Editor modal (`StoryEditorModal`) — 2 steps + post sheet:**
- **Step 1 «pick»:** `--color-bg-secondary` frame (9:16) showing either the placeholder tiles (dashed photo tile + text-story tile) or the current selection with ✕ remove, "Thêm ảnh/video" (append, cap 10) and "Chỉnh sửa" actions. Footer = "Hủy" only. Picking files **appends** (video still exclusive: `story.multiErrorVideo`); over-cap → `story.multiErrorMax`
- **Step 2 «edit»:** dark stage (`--color-story-bg`), canvas centered with real CSS size via `setDimensions(…, {cssOnly:true})` (backstore fixed at logical 405×720 — window size never changes export resolution). Header: back (captures snapshot first) / undo / redo / recenter / delete-selection + primary **"Đăng"** pill (runs export + snapshot, then opens the post sheet). Bottom overlay: tool-specific panel + EditorToolbar; multi-item nav row (`n/total`)
- **Text tool:** tap-to-create — clicking empty canvas with the text tool active creates an IText at the tap point using the panel's current style (`textStyle` ref). Panel = hint chip ("Nhấn vào khung để thêm chữ") until a text is selected, preset chips, B/I/U + align + size slider + "Nâng cao" toggle, color swatch row; advanced section holds font, gradient, outline, highlight. No text input, no add/update button; empty texts are removed on editing exit
- **Snapshots:** every leave-transition (back, nav, "Đăng") serializes non-background objects + bg transform via `api.getSnapshot()` into the item; re-entering a media item restores it after the background loads — filters, drawings, stickers, and text survive pick↔edit↔sheet round-trips. History resets per media item
- **Post sheet:** replaces the stage while the canvas is unmounted. Preview frame (`--color-bg-secondary`), per-item strip with individual ✕ delete (min 1), caption textarea (300 chars, `story.captionPlaceholder`), footer "Chỉnh sửa" (back) + "Đăng" (submit → `POST /api/stories` with per-item `captions`). Music stops while the sheet is open and resumes on return
- **Guard:** ✕ / overlay click / Escape with any picked content → confirm dialog ("Rời khỏi bản nháp?" · "Ở lại" / "Rời đi"); empty state closes immediately
- **Export:** images re-encoded at **1080×1920** (`exportBlob()` → `EXPORT_WIDTH / canvasWidth` multiplier; `exportBlob(true)` = 1× preview for the strip). Videos re-export with the music stream
- **Theme rule:** editor stage stays dark in both themes (`--color-story-bg`); pick/post frames, strip thumbs, and media placeholders use `--color-bg-secondary` so the light theme never shows black frames. Gradient hex label under the text-story swatches is banned

### Messages (`/messages`)

**Purpose:** Focused private/group communication. Conversation-first experience.
**Layout:** Conversation List + Chat Window (Track 5)
**Conversation List:** Search, recent conversations, unread indicators, participant avatar, conversation preview, timestamp
**Chat Window:** ChatHeader, customizable background, MessageList with grouping, MessageComposer
**Messaging MUST follow the Messaging Design System defined in Section 11.**

### Notifications (`/notifications`)

**Purpose:** Triage attention. Newest-first, scannable, zero-inbox workflow.
**Layout:** Track 3 center column, transparent canvas (no page-level H1 — the navbar owns the visible title per Track 3; page keeps an `sr-only` H1 for heading hierarchy)
**Toolbar (one row):** segmented glass control left (Tất cả / Chưa đọc + orange count badge / Đã đọc — same recipe as §4 Nav Controls, hover guarded with `:hover:not(.segmentActive)`) + actions right (`margin-left: auto`): "mark all read" primary-light pill (only when `unreadCount > 0`) + 36px circular settings button opening an inline preferences popover (glass, reuses `NotificationsForm` — never navigates away to `/settings`)
**Type filter:** horizontal scrollable chips row (Tất cả · Thích · Bình luận · Theo dõi · Kết bạn · Cộng đồng · Tin nhắn · Cuộc gọi · Kiểm duyệt) — 32px pills, active = `primary-light` + primary text; client-side filter on fetched data, persisted in `?kind=` (no backend change)
**Time grouping:** sections Hôm nay / Hôm qua / 7 ngày qua / Cũ hơn with pill separators (§11.13 style: 11–12px/500/muted pill on hairline rules)
**Notification card (12px, `shadow-sm`, hover `shadow-md`):** avatar 40px + 22px type chip overlaid bottom-right (same `color-mix 14%` chip language as the dropdown §4); no-avatar fallback = 40px icon chip. Content 2-line clamp (sender `600` + text), meta line `time · typeLabel · và N người khác`. Unread = `primary-light` wash + 3px primary left bar + 8px primary dot; read hover = card + shadow lift. Hover/focus reveals a 28px ✓ mark-read circle (always visible on touch). Whole card is `role="button"` + Enter/Space; type colors use tokens only (`--color-heart/info/primary/accent/success/danger`) — hardcoded hex banned
**Data:** `useSWRInfinite` (pageSize 20, `unreadOnly` only for the unread tab; read tab filters client-side across loaded pages) + `IntersectionObserver` sentinel (`rootMargin: 320px`) + "Tải thêm" fallback button. Realtime via `NotificationContext` WS (optimistic mark-read + `invalidate`)
**States:** skeletons matching card dimensions (no spinners); error box (`role="alert"`) + primary-light retry pill; composed empty (64px primary-wash bell circle + title + hint + CTAs "Khám phá bạn bè" / "Cài đặt thông báo")
**Motion:** `rise` entrance (`opacity + translateY(8px)`, 200ms) staggered 40ms via `--index`; `prefers-reduced-motion` disables all
**Mobile ≤576px:** toolbar wraps (segmented scrolls, actions drop below); card padding 12px; empty CTAs full-width

### Friends (`/friends`)

**Purpose:** Manage relationships. Requests first, discovery second, list third.
**Layout:** Track 3 center column, transparent canvas (navbar owns the title; page keeps an `sr-only` H1). Tab state in URL (`?mainTab=requests|suggestions|list&subTab=received|sent`) — shareable, back-button safe
**Toolbar (one row):** segmented glass control (Lời mời + orange badge / Gợi ý / Bạn bè) + scoped search pill right (list tab only): `bg-secondary` pill, magnifier + borderless input, `max-width: 320px`, `:focus-within` primary border; filters client-side by display name with clear (✕) button and a `Caption` count line ("N bạn bè"). Mobile: search goes full-width below
**Sub-filter (requests tab only):** chips row (Đã nhận / Đã gửi), same chip language as notifications
**Request card (12px, stagger):** avatar 40px + name `600` + meta `relative time` (`notifications.*` keys reused) + actions right: Chấp nhận (turquoise compact pill) / Từ chối (ghost); sent tab shows Thu hồi (ghost). Accept removes the row optimistically + prunes the user from suggestions
**Suggestion card:** same chrome + mutual lines (`N bạn chung`, `Chung với: names +M người khác`); "Thêm bạn" morphs to disabled "Đã gửi ✓" (§8 follow-button pattern)
**Friend row:** avatar + name + ⋯ overflow menu (glass popover per §4: Xem hồ sơ → `/profile/:id`, Nhắn tin → `createDirectChat` → `/messages?chat_id=`, Hủy kết bạn danger → existing confirm `Modal`). Destructive action never sits inline. Menu closes on backdrop click / item click / Escape; toggle `aria-expanded` + `aria-haspopup="menu"`
**States:** skeleton cards everywhere (initial + load-more batches — zero spinners); composed empties with per-tab hints + cross-tab CTA (`viewSuggestions`); error box + retry (retry resets page cursor via state flag, never touches refs in render)
**Data notes:** friend-request list is fetched on mount on every tab (badge correctness); `*Initial` flags flip in loader `finally` (never stuck on loading); ESLint `react-hooks/refs` rule: no `.current` access inside render-called helpers — pagination cursors live in refs touched only from callbacks/effects, retry goes through state flags
**Motion/responsive/a11y:** same `rise` + 40ms stagger + reduced-motion treatment as notifications; rows are `role="button"` + Enter/Space with inner buttons `stopPropagation`; ≤576px actions stay in-row (wrap, not column-stacked)

### Profile (`/profile/[userID]`)

**Purpose:** Identity hero + content + highlights. Same visual language as Community detail — no second design system.
**Layout:** Track 3 center column, transparent canvas (navbar owns the title; page keeps an `sr-only` H1 with the display name)
**Header hero (`ProfileHeader` — premium minimal glass):** cover 240px desktop / 160px mobile (mesh gradient `135deg primary→secondary` + white bloom + faint ember + decorative orb + 2-stop navy scrim blending into the card — never a flat gradient, never `text-shadow` on text; subtle scroll parallax `translateY ≤24px` rAF + fade-in onLoad); floating glass identity panel (`--glass-bg-strong` + blur) overlapping the cover `-72px`/`-56px`; avatar 120px (mobile 96px) with double ring (`3px card` + `3px primary-light` halo) + `shadow-md` glow + pulsing online dot; name `H2` 26px tight tracking, `@username` copy-link button + glass share icon-button (`navigator.share` fallback clipboard + toast); bio 3-line clamp; meta pills with primary icons; stats = clickable `bg-secondary` pills with ease-out count-up (`vi-VN` compact ≥1000) + Enter/Space keyboard; actions = CTA hierarchy — follow/add-friend turquoise gradient pill with glow, message navy `--color-cta`, edit/settings ghost outline, overflow ⋯ glass menu (`ProfileMenu`); mutual friends render inline under bio via `mutualSlot` (never a separate bar)
**Edit flow:** no inline edit inside the header — self "Chỉnh sửa" opens `ProfileEditModal` (dirty-disabled Save navy + Cancel ghost, success/error toast); avatar/cover change = `uploadAvatar`/`uploadCover` → `PATCH /profile` → toast
**Sticky tab bar:** glass pill bar (`--glass-bg-strong` + blur + `--glass-border`, `role=tablist/tab` + `aria-selected`) with a **sliding thumb** behind the active tab (`250ms` spring curve, re-measured on tab change/resize/font-load), sticky `top: navbar + 16px`, `role=tabpanel` content below; rail "Xem tất cả" buttons dispatch `profile:goto-tab` to switch tabs; photo-strip (6 latest via `getUserMedia`, click → media tab) above the posts feed
**Body:** 2-column split `1fr + 320px rail` on desktop, stacked ≤1024px; rail = sticky `aside` (Profile strength card for self — 8-field % with gradient progress bar + missing-field CTA into the edit modal, Giới thiệu card with bio + work/education/website/joined facts, Bạn bè card with 3×3 avatar grid + count, Ảnh card with 3×3 thumbs + count — each with `primary-light` "Xem tất cả" pill); feed posts render as individual cards (`shadow-sm`, `margin-bottom`)
**States:** gradient-sweep skeleton matching header shape on first load (never opacity-only shimmer, never `bx-spin` spinners — §9 ban); tab switches use skeleton dots; composed empties (64px primary-wash icon circle + title)
**Motion/responsive/a11y:** `rise` + stagger + reduced-motion everywhere; touch targets ≥44px on mobile; focus-visible `2px primary` on every control

### Communities (`/communities` + `/communities/[communityID]`)

**Purpose:** Discover, join (via code for invite-only), and read communities. Same visual language as Friends/Notifications — no second design system.
**List layout:** Track 3 center column, transparent canvas (navbar owns the title; page keeps an `sr-only` H1). Tab state in URL (`?tab=discover|joined|created&privacy=all|public|invitation_only&q=`) — shareable, back-button safe
**Toolbar (one row):** segmented glass control (Khám phá / Đã tham gia / Đã tạo — active tab shows a count badge when `total > 0`) + right cluster: scoped search pill (`bg-secondary` pill, `max-width: 320px`, `:focus-within` primary border + ring, clear ✕ button) + "Tạo cộng đồng" turquoise compact pill (40px tall, `radius-pill`, `shadow-sm`, hover lift — §2). Mobile ≤576px: right cluster full-width below; segmented scrolls horizontally
**Privacy filter:** horizontal chips row (Tất cả · Công khai · Chỉ mời) — 32px pills, active = `primary-light` + primary text (same chip language as notifications); client-side filter on loaded pages, persisted in `?privacy=`
**Community card (cover card, `rise` + 40ms stagger via `--index`):** banner 112px (real `background_uri` from `GET /api/communities*` — BE selects `background_uri` in all 3 list queries; fallback = mesh gradient `135deg primary→secondary` + decorative orb `aria-hidden`) + privacy pill overlaid top-left (white 94% + blur; success/info text per privacy) → avatar 56px overlap `-28px` with `2px card` ring (fallback glyph `bx-group`, never `bxs-chat`) → name `600` + `yourCommunity` badge (`primary-light`) → desc 2-line clamp (`min-height: 40px` so cards align) → meta `N thành viên · ngày tạo` (`vi-VN` grouping) → footer inline action (`stopPropagation` + `preventDefault` inside the `<Link>` card): Tham gia (turquoise) / Nhập mã (outline → opens `JoinCommunityCodeModal`) / Đã tham gia ✓ (success wash, `aria-live`) / Quản lý (navy `--color-cta` badge for `is_creator`). Whole card is `<Link href=/communities/:id>` with `aria-label={name}`; hover `shadow-sm→md` + lift `-2px`; `content-visibility: auto`; `prefers-reduced-motion` disables stagger/lift
**Data (list):** `useSWRInfinite` pageSize 20 + `IntersectionObserver` sentinel (`rootMargin: 320px`) + "Tải thêm" fallback button; URL-driven tab/search reset via adjust-during-render (no `setState`-in-effect — ESLint `react-hooks/set-state-in-effect` forbids it); create modal closes → `mutate()`
**States (list):** skeletons matching cover-card shape (cover 112px + avatar + lines, no spinners); composed empty (64px primary-wash `bx-group` circle + `emptyDiscover` title + `emptyDiscoverHint` + CTAs "Tạo cộng đồng" / "Xóa bộ lọc" — the latter only when a keyword/filter is active); load-more dots + "Tải thêm" fallback button + `feed.end` line. Fetch failure falls through to the empty state (no separate error box — `total: 0` renders the same composed empty)
**Detail layout:** premium header + sticky tab bar + 2-column split (feed + 320px rail) on desktop, stacked ≤1024px
**Header:** cover 200px (mobile 140px) with bottom-up dark overlay + privacy pill; avatar 80px (mobile 64px) overlap with `3px card` ring; H2 name (`--text-h2`) + desc 3-line clamp; action cluster right (JoinButton + "Nhập mã" outline CTA when guest + invite-only); meta pills row (`bg-secondary` pills: members, created date) + creator link (`/profile/:id`). Skeleton mirrors cover + avatar shape
**Detail tabs:** sticky pill bar (`top: navbar + 16px`, glass card, `role=tablist`, `aria-selected` — never `aria-pressed` on `role=tab`) with Bài viết / Thành viên / Quy tắc / Quản lý (admin/creator only), synced to `?tab=` via `router.replace` (default `posts`, no param); status override kept in local state, reset on `communityID` change via adjust-during-render
**Detail body:** `posts` tab = feed (transparent, `CommunityFeed` + PostCard reuse) + `CommunityAboutRail` (Giới thiệu card with privacy/member/creator facts, Thành viên card with 5-avatar stack + `+N` + "Xem tất cả", Quy tắc card with first 3 + "Xem tất cả"); other tabs = single content card (members / rules / manage). Non-member on `posts` sees locked state (lock icon + `lockedTitle/Hint` + Join/Code CTAs) instead of an empty feed
**Join-by-code (`JoinCommunityCodeModal`, shared by card + header + locked state):** shared `Modal` with uppercase code input (48px, `0.15em` tracking, primary focus ring, danger ring on error), inline error (`role="alert"`) vs hint text, Enter submits, success → toast + `onJoined` morph (card → "Đã tham gia ✓", detail → status override + `mutate()`). Uses existing `POST /communities/:id/join {code}` — no new endpoint
**JoinButton states (`JoinButton.tsx`):** Tham gia (turquoise, `cursor: wait` while joining) / Đang chờ duyệt (success wash `role=status`, `aria-live` via card morph) / Rời (ghost → styled confirm `Modal` with `leaveConfirmTitle/Body`, danger confirm — never `window.confirm`) / Quản lý (navy `--color-cta` badge `role=status` for admin/creator) / invite-only guest (neutral `bg-secondary` lock badge — the "Nhập mã" code CTA lives beside it in header/card/locked, opening the shared code modal). Disabled uses native `disabled` + `cursor: wait` — never `pointer-events: none` (kills focus)
**Rules:** delete via styled confirm `Modal` (`ruleDeleteTitle` + name quote), never `window.confirm`; add/edit via existing `CommunityRuleForm`; numbered `28px` primary-wash badges, category titles with hairline rule
**Members tab (`CommunityMemberList`):** rows link to `/profile/:id`; role pill per `ROLE_BADGE_CLASS`; admin controls stay inline for now (role `<select>` + kick `bx-user-x` → styled kick `Modal` with reason textarea) — a ⋯ overflow-menu restyle is deferred follow-up, not this pass
**Feed (`CommunityFeed`):** like/save dispatch locally via `feedReducer`; load-more uses dots (never `bx-spin` spinners — §9 Loading ban); error state keeps the shared `bx-error-circle` danger box; non-member gate lives in the detail page (locked card), not in the feed
**Motion/responsive/a11y:** `rise` + 40ms stagger + reduced-motion everywhere; cards are `<Link>` (native keyboard); inner buttons stop propagation; tabs `role=tab` + `aria-selected` (never `aria-pressed` on `role=tab` — `jsx-a11y/role-supports-aria-props` forbids it); shared `Modal` closes on Escape + overlay click; touch targets ≥44px on mobile (actions go full-width ≤576px on the detail header)

### Admin Dashboard (`/admin/dashboard`)

**Purpose:** Platform overview. Key metrics at a glance.
**Layout:** Admin sidebar + AdminNavbar + content area
**Content:** 6 stat cards (3x2 grid) with animated counters and trend indicators, line chart (user/post/report growth over time), pie chart (user status distribution), two recent tables (top users, top posts), period selector dropdown
**Charts:** Recharts library, responsive, with loading skeletons
**Top lists:** "Người dùng tích cực nhất" / "Bài viết tương tác nhất" rows are clickable (`.topListRow`: pointer, hover `--color-bg-secondary`, focus-visible outline, Enter/Space) → open `UserProfileModal` (fetches `GET /profile/:userID`: avatar, name, bio, stat chips; footer "Xem hồ sơ đầy đủ" expands **in-place** — no navigation to user layout — widening the shared Modal via new `size="lg"` prop (680px) to show cover header + avatar overlap + full `ProfileAboutTab` About section, footer becomes "Quay lại") or `PostPreviewModal` (fetches `GET /posts/:id`: clickable author row → chains to UserProfileModal, clamped content, media grid, status badge, stats, "Xem bài viết" link). Both reuse shared `components/Modal`, loading spinner + retry error states.

### Admin Users (`/admin/users`)

**Purpose:** User management. Table-driven CRUD.
**Content:** Search bar, status filter dropdown, paginated table (avatar, name, email, role, status badge, joined date), ban/unban action, detail modal on row click

### Settings (`/settings`)

**Purpose:** User account management. Tabbed interface.
**Tabs:** Change Password, Privacy, Appearance (theme toggle), Storage (quota info), Active Sessions, Deactivate Account
**Layout:** 3-column user layout, settings content in center column
**Form pattern:** Label above input, helper text below, save button at bottom

### Admin Settings (`/admin/settings`)

**Purpose:** Super Admin only — global system settings (11 backend keys). Admin sidebar + AdminNavbar + content area.
**Layout:** Header (title + caption subtitle + Super Admin badge + "Unsaved changes" dirty pill with orange `--color-accent` dot) above a **vertical rail split**: 220px `.rail` (`role="tablist"`, 3 tabs with icon + label, active = `--color-primary-light` pill, navy on hover) + flexible `.panel` (`role="tabpanel"`). Tab syncs to `?tab=general|security|registration` via `router.replace` (wrapped in `<Suspense>` for `useSearchParams`).
**Tabs:** General (site name, description, contact email, maintenance toggle), Security & Auth (password min length, max login attempts, JWT expiry, refresh token expiry), Registration (allow registration, require email verify, default user role select).
**Tab switch:** content crossfade 150ms ease (`.panel` keyed by tab, §8).
**Fields:** two row types — text/number/textarea/select rows (label + `settings.hint.*` helper via `text-caption` + control, `.fieldError` inline on blur/save) and boolean `.settingRow` (label + hint left, 44×24 `.toggle` right; maintenance ON shows amber `--color-warning-light` banner with `bx-error-circle` — no emoji). Inputs follow §4 (40px, `radius-md`, focus ring `0 0 0 3px --color-primary-light`, danger border+ring when invalid).
**Actions:** global dirty detection (`JSON.stringify` compare) — Save (navy `--color-cta`, §2) + Cancel (ghost outline) disabled until dirty; invalid fields jump to their tab and toast the first error; save errors surface inline (touched), success toast + SWR invalidate.
**Skeleton:** header + 3 rail pills + card rows (shimmer 0.4→0.8→0.4), matches final layout.
**Responsive:** ≤860px rail becomes a wrapping horizontal row above the panel; ≤576px header stacks, inputs go full-width, footer buttons stack full-width.

### Admin Profile (`/admin/profile`)

**Purpose:** Lean self-service profile for ADMIN + SUPER_ADMIN (role guard: other roles → redirect with unauthorized toast). Admin sidebar + AdminNavbar + content area.
**Header:** H1 + caption subtitle + role badge pill right (`bx-shield-quarter`; SUPER_ADMIN = `--color-primary-light`/primary, ADMIN = neutral border pill).
**Card "Account":**
- Identity row: 96px avatar button (hover/focus → dark camera overlay, click → file input → `/media/upload` → `PATCH /profile` → toast + `invalidate('/profile')` so navbar updates) + display name (`--text-h2`) + `@username`.
- Read-only info grid (2-col, ≤860 1-col): email (token), user ID (mono `infoCode` chip + copy button with swap-to-check tooltip), joined date (locale-aware `toLocaleDateString`), role.
- Edit form: display name (required, maxLength 50, inline error on blur) + bio (textarea maxLength 160 with `text-caption` hint), fields follow §4.
- Actions: global dirty detection — Save (navy `--color-cta`, §2) + Cancel ghost, disabled until dirty; success/error toast.
**Card "Security":** inline change-password form (old/new/confirm, `autoComplete` attrs) + Save — same `POST /auth/change-password` as the navbar modal.
**Skeleton:** header + identity (circle + lines) + 4 info placeholders (shimmer 0.4→0.8→0.4).
**Tooltips:** custom `data-tooltip` `::after` pill (§4 pattern) on avatar + copy; no native `title`, no emoji.
**Responsive:** ≤576px header stacks, identity column stacks, inputs full-width, footer buttons stack full-width.

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
