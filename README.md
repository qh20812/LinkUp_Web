# LinkUp Web

Frontend cho mạng xã hội LinkUp — Next.js 16.2.7 (App Router, React 19, TypeScript, plain CSS Modules).

## Tech Stack

- **Framework:** Next.js 16.2.7 (App Router, `output: "standalone"`)
- **UI:** React 19.2.4, TypeScript 5 (strict)
- **Styling:** CSS Modules + CSS variables (light/dark mode)
- **Data fetching:** SWR
- **Charts:** Recharts (admin dashboard)
- **Auth:** Google OAuth (`@react-oauth/google`) + JWT (localStorage)
- **Icons:** Boxicons CDN

## Bắt đầu

### Yêu cầu

- Node.js 22+
- Docker Desktop (nếu dùng Docker dev)

### Cài đặt

```bash
git clone <repo-url>
cd web
npm install
cp .env.example .env.local  # hoặc tạo thủ công
```

### Cấu hình môi trường

Tạo file `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=localhost:8080
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
NEXT_PUBLIC_GIPHY_API_KEY=your-giphy-key  # optional
```

## Chạy ứng dụng

### Development (Docker — khuyến nghị)

Container chạy `next dev` với hot-reload, kết nối server qua `host.docker.internal:8080`:

```bash
# Lần đầu — build image + start
docker compose -f docker-compose.dev.yml up -d

# Xem logs
docker logs -f linkup-web-dev

# Dừng
docker compose -f docker-compose.dev.yml down

# Rebuild khi sửa package.json
docker compose -f docker-compose.dev.yml up -d --build
```

Web: http://localhost:3000 | Server: http://localhost:8080

### Development (trực tiếp)

```bash
npm run dev
```

### Production

```bash
npm run build  # standalone output
npm run start
```

## Commands

| Action | Command | Notes |
|--------|---------|-------|
| Dev server | `npm run dev` | |
| Build | `npm run build` | `output: "standalone"` |
| Start (prod) | `npm run start` | |
| Lint | `npm run lint` | eslint trực tiếp |
| Typecheck | `npx tsc --noEmit` | |
| Test | `npm test` | Jest (`jest --passWithNoTests`) |
| Verify all | `npm run lint ; if ($?) { npx tsc --noEmit } ; if ($?) { npm test }` | PowerShell |

## Cấu trúc thư mục

```
├── app/                    # App Router pages & layouts
│   ├── (auth)/             # Auth group (login, register, etc.)
│   ├── (user)/             # User group (home, messages, profile, etc.)
│   └── admin/              # Admin dashboard
├── components/             # Shared components (Modal, Pagination, StatCard, etc.)
├── hooks/                  # Custom hooks (useTranslation, useToast, etc.)
├── api/                    # API layer (request<T>() with JWT)
├── contexts/               # React contexts (Theme, Language, Notification, Toast)
├── locales/                # i18n (vi.json, en.json)
├── types/                  # TypeScript types
├── public/                 # Static assets
├── DESIGN.md               # Design system & CSS tokens
├── next.config.ts          # Next.js config (rewrites, standalone output)
├── docker-compose.dev.yml  # Docker dev (hot-reload)
├── Dockerfile.dev          # Dev Docker image (Node 22 + npm)
└── Dockerfile              # Production multi-stage build
```

## Docker

### Production build

```bash
docker build -t linkup-web .
docker run -p 3000:3000 --env-file .env.local linkup-web
```

Build arg: `NEXT_PUBLIC_API_BASE_URL` (baked at build time).

### Development (hot-reload)

```bash
docker compose -f docker-compose.dev.yml up -d
```

**Files liên quan:**

| File | Mô tả |
|---|---|
| `Dockerfile` | Production multi-stage build |
| `Dockerfile.dev` | Dev image (Node 22 + npm ci) |
| `docker-compose.dev.yml` | Dev compose (volume mount + node_modules cache) |

## Kiến trúc

```
Client → Next.js App Router → Layout → Page → Components → api/api.ts → Server (localhost:8080)
                                                          ↕
                                              contexts (Theme, Language, Notification)
```

### Layout hierarchy

| Route group | Layout | Chrome |
|-------------|--------|--------|
| `(auth)/*` | `AuthLayout` | No Navbar/Footer |
| `(user)/*` | `UserLayout` | Navbar + Footer |
| `/admin/*` | `AdminLayout` | AdminNavbar + AdminSidebar |

### Key conventions

- **CSS variables** từ `globals.css` — không hardcode colors/spacing/radii
- **Path alias:** `@/*` → repo root
- **Translation:** `useTranslation()` → `t('key')`, thêm keys cả `vi.json` và `en.json`
- **API proxy:** `next.config.ts` rewrites `/api/*` → `http://{NEXT_PUBLIC_API_BASE_URL}/api/*`
- **Token:** JWT stored in `localStorage` key `token`

## Giấy phép

© 2026 LinkUp
