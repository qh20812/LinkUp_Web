<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices. Pay special attention to the `unstable_instant` export hint in `node_modules/next/dist/docs/index.md` if working on client-side navigation performance.
<!-- END:nextjs-agent-rules -->

# Commands

| Action | Command | Notes |
|--------|---------|-------|
| Dev server | `npm run dev` | |
| Build | `npm run build` | |
| Start (prod) | `npm run start` | |
| Lint | `npm run lint` | runs `eslint` directly, not `next lint` |

No test runner configured (no test deps). No CI/CD, no pre-commit hooks, no deployment config.

# Architecture

- **Stack:** Next.js 16.2.7 (App Router), React 19.2.4, TypeScript 5 (strict), plain CSS
- **Project:** "LinkUp" — a Vietnamese social network (`lang="vi"` in root `layout.tsx`)
- **Entrypoints:** `app/layout.tsx` (root), `app/page.tsx` (home — health check + login link)
- **Styling:** CSS Modules (`*.module.css`) for component styles. `globals.css` only has reset + design tokens. See `DESIGN.md` for the complete design system.
- **Path alias:** `@/*` → repo root
- **ESLint:** `eslint.config.mjs` — `eslint-config-next` (core-web-vitals + TypeScript). No separate `.eslintrc.*`.
- **Static assets:** `public/` directory
- **Docker:** `Dockerfile` with two-stage build (node:22-alpine). Uses `output: "standalone"` in `next.config.ts`. Pass `NEXT_PUBLIC_API_BASE_URL` as build arg.
- **Templates:** `templates/Dashboard-Designs/` contains reference UI designs (third-party, separate `.git`).
- **API backend:** `.env` sets `API_BASE_URL=localhost:8080`. `next.config.ts` rewrites `/api/*` → `http://{API_BASE_URL}/api/*` and `/health` → backend health endpoint.

# Current state

Phase 0 complete (infrastructure ready):
- `app/globals.css` — reset + design tokens (light + dark mode). No component styles here.
- `app/layout.tsx` — root layout with fonts (Montserrat + Open Sans), Boxicons CDN, `<LanguageProvider>`, `<ToastProvider>`
- `app/page.tsx` — health check page + link to `/login`
- `app/login/page.tsx` — bare placeholder (`<div>LoginPage</div>`)
- `app/login/layout.tsx` — minimal layout wrapper
- `components/Toast.tsx` + `Toast.module.css` — toast notification system (CSS Module)
- `contexts/LanguageContext.tsx` — i18n context (vi/en)
- `contexts/ToastContext.tsx` — toast notification context
- `hooks/useTranslation.ts` — re-export from LanguageContext
- `api/api.ts` — fetch wrapper with JWT auth
- `api/admin.ts` — 20+ admin API functions
- `types/index.ts` — TypeScript interfaces
- `locales/vi.json` + `locales/en.json` — translation files (~61 keys each)
- `PLAN.md` — full implementation roadmap (gitignored)

# Workflow notes

- `.env*` gitignored — create `.env.local` for local secrets. `.env` checked in with `API_BASE_URL=localhost:8080`.
- `CLAUDE.md` delegates to this file via `@AGENTS.md`.
- `next.config.ts` sets `output: "standalone"` — required for Docker production builds.
- `PLAN.md` is the implementation blueprint. It defines the target file structure, component names, translation keys, and phase dependency order. Follow it when implementing features.
- `DESIGN.md` defines the full design system — colors, typography, spacing, component patterns. Use CSS variables from `globals.css`, never hardcode values.
- Future phases need `npm install recharts` for dashboard charts. No other dependencies are planned.
