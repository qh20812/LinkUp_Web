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
| Typecheck | `npx tsc --noEmit` | |
| Test | `npm test` | Jest (`jest --passWithNoTests`), config in `jest.config.ts`, tests in `__tests__/` |
| Verify all | `npm run lint ; if ($?) { npx tsc --noEmit } ; if ($?) { npm test }` | PowerShell — run before committing |

CI/CD: `deploy-web.yml` runs on push to `main` — `npm ci` → lint → test → Docker buildx → SCP → deploy to VPS.

# Architecture

- **Stack:** Next.js 16.2.7 (App Router), React 19.2.4, TypeScript 5 (strict), plain CSS — no Tailwind, no CSS-in-JS
- **Project:** "LinkUp" — Vietnamese social network (`lang="vi"` in root `layout.tsx`)
- **Styling:** CSS Modules (`*.module.css`). `globals.css` is reset + design tokens only (light + dark mode via `[data-theme="dark"]`). See `DESIGN.md` for the complete design system.
- **Path alias:** `@/*` → repo root
- **ESLint:** `eslint.config.mjs` — `eslint-config-next` (core-web-vitals + TypeScript). No `.eslintrc.*`.
- **API proxy:** `next.config.ts` rewrites `/api/*` → `http://{NEXT_PUBLIC_API_BASE_URL}/api/*`, `/ads-management/*`, and `/health` → backend. Defaults to `localhost:8080` from `.env`.
- **Icons:** Boxicons CDN (`<link>` in root layout head).
- **API layer:** `api/api.ts` provides `request<T>()` — attaches JWT from `localStorage`, prepends `/api`, throws on non-ok.
- **Token storage:** JWT stored in `localStorage` key `token`. No cookies.

# Environment

- **`.env.local`** is the real env file (`.gitignore`d). Keys: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- **`.env`** exists but contains the wrong key (`API_BASE_URL` instead of `NEXT_PUBLIC_API_BASE_URL`). It is never read by Next.js. Ignore it.
- `NEXT_PUBLIC_API_BASE_URL` is **baked at build time** — changing it requires a rebuild, not just a runtime env swap.

# Layout hierarchy

Root layout (`app/layout.tsx`) provides fonts, Boxicons CDN, `<GoogleOAuthProvider>`, `<LanguageProvider>`, `<ThemeProvider>`, `<ToastProvider>`. **No Navbar/Footer at this level.**

| Route group | Layout | Chrome |
|-------------|--------|--------|
| `(auth)/*` | `app/(auth)/layout.tsx` → `AuthLayout` | Auth-specific layout (no Navbar/Footer) |
| `(user)/*` | `app/(user)/layout.tsx` → `UserLayout` | Navbar + Footer |
| `/admin/*` | `app/admin/layout.tsx` | AdminNavbar + AdminSidebar, no Footer |

The three layout groups are independent — they share no chrome components.

# Key conventions

- **Use CSS variables** from `globals.css` — never hardcode colors, spacing, or radii. See `DESIGN.md` for the full token reference.
- **Login route is `/login`** (inside `(auth)` group), not `/admin/login`.
- **Navbar height** is 56px (+1px border). Subtract 57px total for viewport calculations.
- **Theme:** `ThemeContext` reads/writes `data-theme` attribute on `<html>` + `localStorage` key `theme`.
- **Toast:** `useToast()` hook, 4 types (`success`/`error`/`warning`/`info`), auto-dismiss 4s.
- **Notifications:** `NotificationContext` manages WebSocket connection (`/api/ws?token=...`), unread count, dropdown list, and preferences. Supports notification grouping (`groupNotifications` util). Exponential backoff reconnection.
- **`next.config.ts` sets `output: "standalone"`** — conditionalize or remove for `next dev`.
- **Translation:** `useTranslation()` returns `{ t, language, setLanguage }`. Keys via dot-notation `t('key')`. Always add keys to both `locales/vi.json` and `locales/en.json`.
- **`PLAN.md`** — implementation roadmap, gitignored. Follow it for new features.

# Implemented pages

| Route | Status | Notes |
|-------|--------|-------|
| `/` (home) | Done | Health-check landing page |
| `/login` | Done | LoginForm with validation, toast errors, Google OAuth |
| `/register` | Done | Registration form |
| `/verify-email` | Done | Email verification |
| `/forgot-password` | Done | Password reset request |
| `/reset-password` | Done | Password reset form |
| `/onboarding` | Done | Post-registration onboarding |
| `/notifications` | Done | Grouped notifications, mark-as-read, preferences, real-time via WS |
| `/messages` | Done | Direct messaging, E2E encryption, conversation list, user picker |
| `/friends` | Done | Friend list, suggestions, requests |
| `/search` | Done | Tabbed search (users, posts, hashtags) |
| `/saved` | Done | Saved/bookmarked posts |
| `/posts/[id]` | Done | Single post detail |
| `/profile/[userID]` | Done | User profile page |
| `/settings` | Done | User settings (appearance, privacy, sessions) |
| `/admin/dashboard` | Done | recharts (LineChart + PieChart), StatCard, date-range period selector |
| `/admin/users` | Done | Table, search, status filter, pagination, ban modal, detail modal |
| `/admin/posts` | Done | Table, search, status filter, pagination, hide/reveal/status toggle |
| `/admin/reports` | Done | Table, search, status/target-type filters, detail modal, review modal |
| `/admin/media` | Done | Tabs (grouped/flagged/rejected), review modal, cleanup-rejected |
| `/admin/groups` | Done | Table, search, status filter, hide/unhide/archive/delete actions |
| `/admin/communities` | Done | Table, search, status/privacy filters, actions, logs |
| `/admin/notifications` | Done | List with read/unread filter, pagination, mark-read, preferences |
| `/admin/ads` | Done | Ad management, analytics, status toggle |
| `/admin/settings` | Done | Site settings management |
| `/admin/profile` | Stub | Coming soon |

**Shared components:** `Modal`, `Pagination`, `StatCard` in `components/` — reuse instead of inlining.
