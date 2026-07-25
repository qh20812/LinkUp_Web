<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices. Pay special attention to the `unstable_instant` export hint in `node_modules/next/dist/docs/index.md` if working on client-side navigation performance.

# Commands

| Action | Command | Notes |
|--------|---------|-------|
| Dev server | `npm run dev` | |
| Build | `npm run build` | `output: "standalone"` — required for Docker |
| Start (prod) | `npm run start` | |
| Lint | `npm run lint` | runs `eslint` directly, not `next lint` |

No test runner (no deps). No CI/CD. No commit hooks.

# Architecture

- **Stack:** Next.js 16.2.7 (App Router), React 19.2.4, TypeScript 5 (strict), plain CSS — no Tailwind, no CSS-in-JS
- **Project:** "LinkUp" — Vietnamese social network (`lang="vi"` in root `layout.tsx`)
- **Styling:** CSS Modules (`*.module.css`). `globals.css` is reset + design tokens only (light + dark mode via `[data-theme="dark"]`). See `DESIGN.md` for the complete design system.
- **Path alias:** `@/*` → repo root
- **ESLint:** `eslint.config.mjs` — `eslint-config-next` (core-web-vitals + TypeScript). No `.eslintrc.*`.
- **API proxy:** `next.config.ts` rewrites `/api/*` → `http://{NEXT_PUBLIC_API_BASE_URL}/api/*` and `/health` → backend health endpoint. Defaults to `localhost:8080` from `.env`.
- **Icons:** Boxicons CDN (`<link>` in root layout head).
- **API layer:** `/api/api.ts` provides `request<T>()` — attaches JWT from `localStorage`, prepends `/api`, throws on non-ok.
- **Token storage:** JWT stored in `localStorage` key `token`. No cookies.

# Layout hierarchy

Root layout (`app/layout.tsx`) provides fonts, Boxicons CDN, `<LanguageProvider>`, `<ToastProvider>`. **No Navbar/Footer at this level.**

| Route | Layout | Navbar | Footer |
|-------|--------|--------|--------|
| `/` (home) | inline in `page.tsx` | Navbar (public) | Footer |
| `/login` | `app/login/layout.tsx` | Navbar (public) | Footer |
| `/admin/*` | `app/admin/layout.tsx` | AdminNavbar + AdminSidebar | **none** |

The public Navbar and admin chrome (AdminNavbar + AdminSidebar) are independent — they share no layout component.

# Implemented pages

| Route | Status | Notes |
|-------|--------|-------|
| `/` (home) | ✅ Done | Health-check landing page |
| `/login` | ✅ Done | LoginForm with validation, toast errors, redirect to `/admin/dashboard` |
| `/admin/dashboard` | ✅ Done | recharts (LineChart + PieChart), StatCard, date-range period selector |
| `/admin/users` | ✅ Done | Table, search, status filter, pagination, ban modal, detail modal |
| `/admin/posts` | ✅ Done | Table, search, status filter, pagination, hide/reveal/status toggle |
| `/admin/reports` | ✅ Done | Table, search, status/target-type filters, detail modal, review modal |
| `/admin/media` | ✅ Done | Tabs (grouped/flagged/rejected), review modal, cleanup-rejected |
| `/admin/groups` | ✅ Done | Table, search, status filter, hide/unhide/archive/delete actions |
| `/admin/communities` | ✅ Done | Table, search, status/privacy filters, actions, logs |
| `/admin/notifications` | ✅ Done | List with read/unread filter, pagination, mark-read, preferences |
| `/admin/profile` | ⬜ Stub | Coming soon |
| `/admin/ads` | ⬜ Stub | Coming soon |

**Shared components:** `Modal`, `Pagination`, `StatCard` in `components/` — reuse instead of inlining.

# Translation system

- **Context:** `contexts/LanguageContext.tsx` — dynamic `import()` of `locales/{lang}.json`
- **Hook:** `useTranslation()` returns `{ t, language, setLanguage }`
- **Keys:** dot-notation via `t()`, e.g. `t('users.title')`. Supports `{param}` interpolation.
- **Locale files have grown to ~300+ keys each** — always add keys to both `vi.json` and `en.json`.
- **Persisted in** `localStorage` key `language`. Defaults to `vi`.
- **Hydration mismatch:** server defaults `vi`, client reads `localStorage`. Use `suppressHydrationWarning` on toggle buttons.

# Key conventions

- **Use CSS variables** from `globals.css` — never hardcode colors, spacing, or radii. See `DESIGN.md` for the full token reference.
- **Footer is NOT in root layout.** Include `<Footer>` directly in page/layout components that need it.
- **Login route is `/login`**, not `/admin/login`.
- **Navbar height** is 56px (+1px border). When calculating remaining viewport height, subtract 57px total.
- **Theme:** reads/writes `data-theme` attribute on `<html>` + `localStorage` key `theme`.
- **Toast:** `useToast()` hook, 4 types (`success`/`error`/`warning`/`info`), auto-dismiss 4s.
- **Notifications:** `NotificationContext` manages WebSocket connection (`/api/ws?token=...`), unread count, dropdown list, and preferences. Exponential backoff reconnection.
- **`next.config.ts` sets `output: "standalone"`** — conditionalize or remove for `next dev`.
- **`AdminNavbar` search input has `readOnly`** — search not yet implemented there.
- **`PLAN.md`** — implementation roadmap, gitignored. Follow it for new features.
- **`CLAUDE.md`** delegates to this file via `@AGENTS.md`.
