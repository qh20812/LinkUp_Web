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
| Build | `npm run build` | standalone output for Docker |
| Start (prod) | `npm run start` | |
| Lint | `npm run lint` | runs `eslint` directly, not `next lint` |

No test runner (no deps). No CI/CD. No commit hooks.

# Architecture

- **Stack:** Next.js 16.2.7 (App Router), React 19.2.4, TypeScript 5 (strict), plain CSS — no Tailwind, no CSS-in-JS
- **Project:** "LinkUp" — Vietnamese social network (`lang="vi"` in root `layout.tsx`)
- **Styling:** CSS Modules (`*.module.css`). `globals.css` is reset + design tokens only (light + dark mode via `[data-theme="dark"]`). See `DESIGN.md` for the complete design system.
- **Path alias:** `@/*` → repo root
- **ESLint:** `eslint.config.mjs` — `eslint-config-next` (core-web-vitals + TypeScript). No `.eslintrc.*`.
- **Docker:** `Dockerfile` with two-stage build (node:22-alpine). `output: "standalone"` in `next.config.ts`. Pass `NEXT_PUBLIC_API_BASE_URL` as build arg.
- **API proxy:** `next.config.ts` rewrites `/api/*` → `http://{NEXT_PUBLIC_API_BASE_URL}/api/*` and `/health` → backend health endpoint. Defaults to `localhost:8080` from `.env`.
- **Icons:** Boxicons CDN (`<link>` in root layout head).
- **Templates:** `templates/Dashboard-Designs/` — reference UI designs (third-party, separate `.git`).
- **`PLAN.md`** — implementation roadmap, gitignored. Follow it for new features.
- **`DESIGN.md`** — design system reference. Use CSS vars from `globals.css`, never hardcode values.

# Layout hierarchy

Root layout (`app/layout.tsx`) provides fonts, Boxicons CDN, `<LanguageProvider>`, `<ToastProvider>`. **No Navbar/Footer at this level.**

| Route | Layout | Navbar | Footer |
|-------|--------|--------|--------|
| `/` (home) | inline in `page.tsx` | Navbar (public) | Footer |
| `/login` | `app/login/layout.tsx` | Navbar (public) | Footer |
| `/admin/*` | `app/admin/layout.tsx` | AdminNavbar + AdminSidebar | **none** |

The public Navbar (Navbar.tsx) and admin chrome (AdminNavbar.tsx + AdminSidebar.tsx) are independent — they share no layout component.

# Current state

| Phase | What | Status |
|-------|------|--------|
| 0 | Infra (fonts, icons, API wrapper, i18n, types, Toast, Navbar, Footer) | ✅ Done |
| 1 | Login page (`/login`) | ✅ Done |
| 2 | Admin layout (sidebar + navbar + dark mode + lang toggle) | ✅ Done |
| 3-9 | Admin page content (dashboard, users, posts, etc.) | ⬜ Stubs (title + "Coming soon...") |

**Existing files beyond Phase 0:**
- `app/admin/layout.tsx` + `layout.module.css` — sidebar/content flex layout, responsive (collapsed/mobile overlay)
- `components/AdminSidebar.tsx` + `AdminSidebar.module.css` — 7 menu items + logout, collapse/mobile-open
- `components/AdminNavbar.tsx` + `AdminNavbar.module.css` — menu toggle, search (non-functional, `readOnly`), lang toggle, theme toggle, notifications, profile
- `app/login/LoginForm.tsx` + `LoginForm.module.css` — email/password form with validation, show/hide password, toast errors, redirect to `/admin/dashboard`
- `api/admin.ts` — 27 API functions across 7 resource sections
- `locales/*.json` — ~67 keys each

# Workflow notes

- **Login route is `/login`**, not `/admin/login` — there is no admin login layout subdirectory.
- **Footer is NOT in root layout.** Include `<Footer>` directly in page/layout components that need it (currently home page + login layout).
- **Navbar height** is 56px (+1px border). When calculating remaining viewport height (e.g., login container), subtract 57px total.
- **`utils/` directory exists but is empty.** Intended for future shared helpers.
- `.env*` is gitignored. `.env` exists locally with `API_BASE_URL=localhost:8080`. Create `.env.local` for secrets.
- `NEXT_PUBLIC_API_BASE_URL` is the single env var for the backend URL. Used in `next.config.ts` rewrites.
- `next.config.ts` sets `output: "standalone"` — required for Docker. Remove or conditionalize for `next dev`.
- Language toggle causes hydration mismatch (server defaults `vi`, client reads `localStorage`). Use `suppressHydrationWarning` on toggle buttons.
- Theme toggle: reads/writes `data-theme` attribute on `<html>` + localStorage key `theme`.
- Toast system: `useToast()` hook, 4 types (success/error/warning/info), auto-dismiss 4s.
- i18n: translations loaded via dynamic `import()` in `LanguageContext`, dot-notation keys via `t()`, locale persisted in localStorage key `language`.
- Translation keys defined in `locales/*.json` — always add keys to both `vi.json` and `en.json`.
- `recharts` is already in `dependencies` — ready for dashboard charts.
- `AdminNavbar` search input has `readOnly` — search functionality is not yet implemented.
- `CLAUDE.md` delegates to this file via `@AGENTS.md`.