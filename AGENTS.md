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
- **Entrypoints:** `app/layout.tsx` (root), `app/page.tsx` (home)
- **Styling:** Plain CSS via `app/globals.css` (reset + design tokens). See `DESIGN.md` for full design system.
- **Path alias:** `@/*` → repo root
- **ESLint:** `eslint.config.mjs` — `eslint-config-next` (core-web-vitals + TypeScript). No separate `.eslintrc.*`.
- **Static assets:** `public/` directory
- **Docker:** `Dockerfile` with two-stage build. Uses `output: "standalone"` in `next.config.ts`. Pass `NEXT_PUBLIC_API_BASE_URL` as build arg.
- **Templates:** `templates/Dashboard-Designs/` contains reference UI designs (third-party, separate `.git`).
- **API backend:** `.env` sets `API_BASE_URL=localhost:8080` — this is the backend the frontend proxies to.

# Current state

Early-stage scaffold (2 commits). Most files are empty placeholders:
- `app/globals.css` — CSS reset (no component styles yet)
- `app/layout.tsx` — bare placeholder (`<div>layout</div>`)
- `app/page.tsx` — bare placeholder (`<div>Landing</div>`)
- `components/`, `utils/` — empty directories
- `api/api.ts` — empty file

# Workflow notes

- `.env*` gitignored — create `.env.local` for local secrets. `.env` checked in with `API_BASE_URL=localhost:8080`.
- `CLAUDE.md` delegates to this file via `@AGENTS.md`.
- `next.config.ts` sets `output: "standalone"` — required for Docker production builds.
