# Super Admin Settings — Technical Specification

## 1. Tổng quan

Trang `/admin/settings` cho phép **SUPER_ADMIN** cấu hình hệ thống LinkUp. ADMIN role không có quyền truy cập (ẩn sidebar + 403 nếu vào thẳng URL).

### Kiến trúc

```
Web Page (settings/page.tsx) ──SWR──► /api/admin/settings ──► AdminController
                                                                  │
                                                          AdminSettingsService
                                                                  │
                                                    AdminSettingsRepository
                                                                  │
                                                         system_config table
```

---

## 2. Backend — Server (`sources/server/`)

### 2.1 Model

**File mới:** `models/system_config.model.go`

```go
package models

import "time"

type SystemConfig struct {
    Key       string    `gorm:"primaryKey;size:100"`
    Value     string    `gorm:"type:text;not null"`
    UpdatedAt time.Time `gorm:"autoUpdateTime"`
}
```

### 2.2 DTO

**File mới:** `dto/admin_settings.dto.go`

```go
package dto

type AdminSettingsResponse struct {
    Settings map[string]string `json:"settings"`
}

type AdminSettingsUpdateInput struct {
    Settings map[string]string `json:"settings" binding:"required"`
}
```

### 2.3 Repository

**File mới:** `repository/admin_settings.repository.go`

Interface + Implementation (GORM):

| Method | Description |
|--------|-------------|
| `GetAll(ctx) ([]models.SystemConfig, error)` | `SELECT * FROM system_config` |
| `Upsert(ctx, key, value string) error` | `INSERT ... ON DUPLICATE KEY UPDATE value=?` |
| `UpsertBatch(ctx, settings map[string]string) error` | Loop Upsert trong 1 transaction |

### 2.4 Service

**File mới:** `services/admin_settings.service.go` — `AdminSettingsService`

```go
type AdminSettingsService struct {
    repo *repository.AdminSettingsRepository
}
```

**Whitelist keys** (chỉ cho phép update các keys này):

```go
var allowedSettings = map[string]string{
    "site_name":             "string",
    "site_description":      "string",
    "contact_email":         "email",
    "maintenance_mode":      "bool",
    "allow_registration":    "bool",
    "require_email_verify":  "bool",
    "password_min_length":   "int",
    "max_login_attempts":    "int",
    "jwt_expiry_minutes":    "int",
    "default_user_role":     "string",
}
```

**Methods:**

| Method | Logic |
|--------|-------|
| `GetSettings(ctx, adminID) (AdminSettingsResponse, error)` | Gọi `ensureSuperAdmin(adminID)`, repo.GetAll, trả về map |
| `UpdateSettings(ctx, adminID, input) error` | Gọi `ensureSuperAdmin(adminID)`, validate keys + value types, repo.UpsertBatch |

**Read-only keys** (gắn tiền tố `readonly_` khi response):
- `readonly_gmail_user` — từ `os.Getenv("GMAIL_USER")`
- `readonly_cloudinary_cloud_name` — từ config
- `readonly_storage_quota` — từ config

### 2.5 Controller

**File mới:** `controllers/admin_settings.controller.go` — `AdminSettingsController`

```go
type AdminSettingsController struct {
    service *services.AdminSettingsService
}
```

| Handler | Route | Logic |
|---------|-------|-------|
| `GetSettings(c)` | `GET /api/admin/settings` | Lấy userID từ context → gọi service → JSON |
| `UpdateSettings(c)` | `PUT /api/admin/settings` | Lấy userID → BindJSON input → gọi service → JSON |

### 2.6 Routes (sửa file)

**Sửa:** `routes/admin.routes.go` — thêm vào cuối function:

```go
adminGroup.GET("/settings", adminController.GetSettings)
adminGroup.PUT("/settings", adminController.UpdateSettings)
```

Các route này tự động được bảo vệ bởi `AuthMiddleware` + `RequireRoles(RoleSuperAdmin, RoleAdmin)`. Service layer sẽ kiểm tra `ensureSuperAdmin()` để chặn ADMIN.

### 2.7 Wire Dependencies (sửa)

**Sửa:** `cmd/main.go`

Khởi tạo AdminSettingsRepository + Service + Controller, rồi truyền vào `RegisterAdminRoutes`.

### 2.8 Seed data

**Thêm vào:** `cmd/seed/extended/main.go` hoặc tạo step riêng

```sql
INSERT INTO system_config (key, value) VALUES
    ('site_name', 'LinkUp'),
    ('site_description', 'Mạng xã hội Việt'),
    ('contact_email', 'admin@linkup.com'),
    ('maintenance_mode', 'false'),
    ('allow_registration', 'true'),
    ('require_email_verify', 'true'),
    ('password_min_length', '8'),
    ('max_login_attempts', '5'),
    ('jwt_expiry_minutes', '15'),
    ('default_user_role', 'user')
ON DUPLICATE KEY UPDATE value=VALUES(value);
```

---

## 3. Frontend — Web (`sources/web/`)

### 3.1 Types

**Sửa:** `types/index.ts` — thêm cuối file:

```ts
export interface AdminSettingsResponse {
  settings: Record<string, string>
}

export interface AdminSettingsInput {
  settings: Record<string, string>
}
```

### 3.2 API

**Sửa:** `api/admin.ts` — thêm cuối file:

```ts
export const getAdminSettings = () =>
  request<AdminSettingsResponse>('/admin/settings')

export const updateAdminSettings = (input: AdminSettingsInput) =>
  request<{ message: string }>('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
```

### 3.3 Locales

**Sửa:** `locales/en.json` + `locales/vi.json` — thêm section `"settings"`:

**en.json:**
```json
"settings": {
  "title": "System Settings",
  "description": "Configure global system settings (Super Admin only)",
  "tabGeneral": "General",
  "tabSecurity": "Security & Auth",
  "tabRegistration": "Registration",
  "tabEmailStorage": "Email & Storage",
  "siteName": "Site Name",
  "siteDescription": "Site Description",
  "contactEmail": "Contact Email",
  "maintenanceMode": "Maintenance Mode",
  "maintenanceModeHint": "When enabled, only admins can access the site",
  "jwtExpiryMinutes": "JWT Expiry (minutes)",
  "passwordMinLength": "Minimum Password Length",
  "maxLoginAttempts": "Max Login Attempts",
  "defaultUserRole": "Default User Role",
  "allowRegistration": "Allow New Registration",
  "requireEmailVerify": "Require Email Verification",
  "gmailUser": "Gmail SMTP Username",
  "cloudinaryCloud": "Cloudinary Cloud Name",
  "storageQuota": "Default Storage Quota (MB)",
  "readOnlyHint": "This value is managed via environment variables",
  "saveSuccess": "Settings saved successfully",
  "saveError": "Failed to save settings",
  "loadError": "Failed to load settings",
  "unauthorized": "You do not have permission to access this page",
  "saveBtn": "Save Changes",
  "cancelBtn": "Cancel",
  "noChanges": "No changes detected"
}
```

**vi.json:**
```json
"settings": {
  "title": "Cài đặt hệ thống",
  "description": "Cấu hình hệ thống (chỉ Super Admin)",
  "tabGeneral": "Chung",
  "tabSecurity": "Bảo mật & Xác thực",
  "tabRegistration": "Đăng ký",
  "tabEmailStorage": "Email & Lưu trữ",
  "siteName": "Tên hệ thống",
  "siteDescription": "Mô tả",
  "contactEmail": "Email liên hệ",
  "maintenanceMode": "Chế độ bảo trì",
  "maintenanceModeHint": "Khi bật, chỉ admin mới truy cập được trang",
  "jwtExpiryMinutes": "JWT hết hạn (phút)",
  "passwordMinLength": "Độ dài mật khẩu tối thiểu",
  "maxLoginAttempts": "Số lần đăng nhập sai tối đa",
  "defaultUserRole": "Vai trò mặc định",
  "allowRegistration": "Cho phép đăng ký mới",
  "requireEmailVerify": "Yêu cầu xác thực email",
  "gmailUser": "Gmail SMTP",
  "cloudinaryCloud": "Cloudinary Cloud Name",
  "storageQuota": "Dung lượng mặc định (MB)",
  "readOnlyHint": "Giá trị được quản lý qua biến môi trường",
  "saveSuccess": "Lưu cài đặt thành công",
  "saveError": "Lưu cài đặt thất bại",
  "loadError": "Tải cài đặt thất bại",
  "unauthorized": "Bạn không có quyền truy cập trang này",
  "saveBtn": "Lưu thay đổi",
  "cancelBtn": "Hủy",
  "noChanges": "Không có thay đổi"
}
```

### 3.4 Sidebar — phân quyền

**Sửa:** `components/AdminSidebar.tsx`

```tsx
// Thêm state role từ JWT
const [userRole, setUserRole] = useState<string | null>(null)

useEffect(() => {
  try {
    const token = localStorage.getItem('token')
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]))
      setUserRole(payload.role || null)
    }
  } catch { /* ignore */ }
}, [])

// FooterMenu — chỉ hiện settings nếu SUPER_ADMIN
{userRole === 'SUPER_ADMIN' && (
  <li className={pathname === '/admin/settings' ? styles.active : ''}>
    <Link href="/admin/settings">
      <i className="bx bx-cog" />
      <span>{t('nav.settings')}</span>
    </Link>
  </li>
)}
```

### 3.5 Page — `app/admin/settings/page.tsx`

**File mới:** `app/admin/settings/page.tsx`

Components:
- `SettingsPage` — client component, kiểm tra role, fetch settings, render tabs
- GeneralTab, SecurityTab, RegistrationTab, EmailStorageTab (inline hoặc components riêng)

**Luồng chính:**

```
1. Component mount → kiểm tra role từ token
   → Nếu không phải SUPER_ADMIN → toast + redirect /admin/dashboard

2. useSWR('/admin/settings') → settingsData
   → Clone vào formValues state

3. User sửa form → cập nhật formValues → dirty tracking

4. Click "Save Changes"
   → Validate
   → Gọi PUT /admin/settings với subset keys của tab hiện tại
   → Toast success/error
   → invalidate('/admin/settings')
```

**Role check đầu component:**
```tsx
useEffect(() => {
  try {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.role !== 'SUPER_ADMIN') {
      toast({ title: t('settings.unauthorized'), type: 'error' })
      router.push('/admin/dashboard')
    }
  } catch {
    router.push('/login')
  }
}, [])
```

### 3.6 CSS — `app/admin/settings/Settings.module.css`

**File mới:** `app/admin/settings/Settings.module.css`

Pattern dựa trên `Users.module.css`. Key classes:

| Class | Purpose |
|-------|---------|
| `.page`, `.header`, `.title`, `.description` | Layout |
| `.tabs`, `.tab`, `.tabActive` | Tab navigation |
| `.card` | Content card wrapper |
| `.formGroup`, `.row` | Form layout |
| `.label`, `.hint` | Field labels |
| `.input`, `.textarea`, `.select` | Inputs |
| `.toggle`, `.toggleTrack`, `.toggleThumb` | Toggle switch |
| `.footer`, `.btnSave`, `.btnCancel` | Action bar |
| `.readonlyTag` | Badge for read-only fields |
| `.skeleton`, `.skeletonLabel` | Loading skeleton |
| `@keyframes shimmer`, `@keyframes fadeIn` | Animations |

---

## 4. Kế hoạch triển khai (thứ tự — 8 bước)

| Bước | File(s) | Kiểm tra |
|------|---------|----------|
| **B1: Model** | `models/system_config.model.go` | `go build ./...` |
| **B2: DTO** | `dto/admin_settings.dto.go` | `go build ./...` |
| **B3: Repository** | `repository/admin_settings.repository.go` | `go build ./...` |
| **B4: Service** | `services/admin_settings.service.go` | `go build ./... && go vet ./...` |
| **B5: Controller + Routes + Wire** | `controllers/admin_settings.controller.go`, `routes/admin.routes.go`, `cmd/main.go` | `go build ./... && go vet ./...` |
| **B6: Seed** | `cmd/seed/extended/main.go` | `go build ./cmd/seed && ./seed.exe` |
| **B7: Frontend Types + API** | `types/index.ts`, `api/admin.ts` | `npm run lint` |
| **B8: Frontend Page + Locales + CSS + Sidebar** | `app/admin/settings/page.tsx`, `Settings.module.css`, `locales/*.json`, `components/AdminSidebar.tsx` | `npm run lint` |

## 5. Lưu ý kỹ thuật

| Vấn đề | Giải pháp |
|--------|-----------|
| Role check ở Web | JWT token decode (`atob`), không gọi API riêng. Role trong payload field `role` |
| Read-only keys hiển thị | Server trả keys có prefix `readonly_`, Web render disabled input + badge "env variable" |
| Toggle switch | Dùng CSS thuần + state boolean (ko cần thư viện). Khi save, convert `true`/`false` string |
| Dirty detection | So sánh `JSON.stringify(formValues) !== JSON.stringify(initialValues)` |
| Validation số | `password_min_length` ≥ 6, `max_login_attempts` ≥ 1, `jwt_expiry_minutes` ≥ 1 |
| Maintenance mode | Server chỉ cần lưu value. Frontend hiển thị cảnh báo khi bật |
| Gmail/Cloudinary | Đọc từ `os.Getenv`/`config.Env` ở server, không lưu vào DB |
