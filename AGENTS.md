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

- **Stack:** Next.js 16.2.7 (App Router), React 19.2.4, TypeScript 5 (strict), Tailwind CSS v4
- **Project:** "LinkUp" — a Vietnamese social network (`lang="vi"` in root `layout.tsx`)
- **Entrypoints:** `app/layout.tsx` (root), `app/page.tsx` (home), `app/login/page.tsx` (login)
- **Styling:** Tailwind v4 — `@import "tailwindcss"` (not `@tailwind`). Theme tokens via `@theme inline` in `app/globals.css`.
- **Path alias:** `@/*` → repo root
- **PostCSS:** `@tailwindcss/postcss` plugin (via `postcss.config.mjs`)
- **ESLint:** `eslint.config.mjs` — `eslint-config-next` (core-web-vitals + TypeScript). No separate `.eslintrc.*`.
- **Static assets:** `public/` directory
- **Fonts:** 5 Google fonts via `next/font/google` in layout: Geist, Geist_Mono, Hanken_Grotesk, JetBrains_Mono, Sora
- **Icons:** Material Symbols Outlined (loaded via `<link>` in `app/layout.tsx:52-56`)
- **`next.config.ts`:** remote image pattern for `lh3.googleusercontent.com` (Google OAuth avatars)

# Design system

- **CSS custom properties** in `app/globals.css` for surfaces, primary/secondary/tertiary/error colors, outlines, spacing, and layout constants. Light and dark modes via `prefers-color-scheme`.
- **Utility classes:** `.headline-xl`, `.headline-lg`, `.headline-lg-mobile`, `.body-md`, `.body-sm`, `.label-md`, `.button` — with dark-mode overrides.
- **Font aliases:** `--font-display` (Geist Sans / Sora in dark), `--font-body` (Hanken Grotesk), `--font-label` (JetBrains Mono). Mapped in `@theme inline` as `font-sans`, `font-display`, `font-body`, `font-label`.
- **Custom spacing:** `--spacing-unit` (4px base). Shorthand tokens: `px-xs/sm/md/lg/xl/gutter`. `--margin-desktop` (64px / 40px dark), `--margin-mobile` (16px).
- **Radius scale:** `sm`→`full` (0.25rem→9999px), plus `--radius-default` (0.5rem).
- **Design token usage pattern:** use CSS var utility classes from `@theme inline` (e.g. `bg-surface-container-low`, `text-primary`, `border-outline-variant/30`, `px-margin-desktop`, `gap-lg`). Avoid hardcoding colors/radii that have token equivalents.

# Component conventions

- `components/` — app-level (navbar, footer). `components/ui/` — primitives (button, input, label, badge, feature-card).
- Components use `function ComponentName()` named functions with `export default`.
- Client components use `"use client"` directive (navbar, button, input, login page).
- `utils/` and `api/` exist but are empty — add shared logic and API routes there.
- Existing `app/page.tsx` renders an empty placeholder (`<div>page</div>`).

# Workflow notes

- `.env*` gitignored — create `.env.local` for local secrets. `.env` checked in with `API_BASE_URL=localhost:8080`.
- Single commit (`Initial commit from Create Next App`) — early-stage scaffold.
- `CLAUDE.md` delegates to this file via `@AGENTS.md`.
