# Kế hoạch triển khai Trung tâm Thông báo — LinkUp Admin

## 1. Tổng quan

Xây dựng Notification Center cho admin panel LinkUp, bao gồm:
- Badge + dropdown real-time trên AdminNavbar
- Trang `/admin/notifications` (danh sách + filter + phân trang)
- Modal cài đặt preferences trong `/admin/settings`
- WebSocket real-time push từ server

Backend API đã hoàn thiện (6 endpoints dưới `/api/notifications`).

---

## 2. Server API (đã có — chỉ dùng, không sửa)

| Method | Path | Query Params | Request Body | Response |
|--------|------|-------------|--------------|----------|
| `GET` | `/api/notifications` | `page=1`, `pageSize=20`, `unreadOnly=false` | — | `{ data: NotificationItem[], total: number, page: number }` |
| `PUT` | `/api/notifications/:id/read` | — | — | `{ message: "ok" }` |
| `PUT` | `/api/notifications/read-all` | — | — | `{ message: "ok" }` |
| `GET` | `/api/notifications/unread-count` | — | — | `{ count: number }` |
| `GET` | `/api/notifications/preferences` | — | — | `{ data: NotificationPreferences }` |
| `PUT` | `/api/notifications/preferences` | — | `Partial<NotificationPreferences>` | `{ message: "ok" }` |

### NotificationItem (từ DTO server)

```typescript
interface NotificationItem {
  id: string
  sender_id?: string
  type: NotificationType
  content: string
  is_read: boolean
  created_at: string
  redirect_post_id?: string
  redirect_user_id?: string
  redirect_comment_id?: string
}
```

### NotificationType (17 giá trị)

`like` | `comment` | `follow` | `message` | `friend_request` | `friend_accepted` | `community_join_request` | `community_join_approved` | `community_join_rejected` | `community_role_changed` | `community_member_left` | `community_member_kicked` | `community_group_chat_added` | `community_invite_code_used` | `community_invitation_received` | `community_invitation_accepted` | `voice_call`

### NotificationPreferences

```typescript
interface NotificationPreferences {
  like_enabled: boolean
  comment_enabled: boolean
  follow_enabled: boolean
  message_enabled: boolean
  friend_request_enabled: boolean
}
```

---

## 3. WebSocket (notification real-time)

- Endpoint: `GET /ws?token=<access_jwt>` (dùng chung với notification hub trên server)
- Server → Client event: `{ type: "notification", data: NotificationItem }`
- Client cần lưu access token để kết nối WS khi AdminLayout mount
- Khi nhận event → cập nhật badge count + thêm vào đầu dropdown (nếu đang mở)

### Chi tiết kết nối

- Mở WS trong `app/admin/layout.tsx` (side-effect khi layout mount, user đã login)
- Tự động reconnect: exponential backoff (1s, 2s, 4s, 8s, max 30s)
- Khi WS nhận `type: "notification"` → emit event qua context (vd: `NotificationContext`) để Navbar + Dropdown lắng nghe
- Token lấy từ `localStorage.getItem('token')`

---

## 4. Các file cần tạo

### 4.1 `api/notifications.ts` — API layer

```typescript
import { request } from './api'
import type { NotificationItem, NotificationListResponse, NotificationPreferences } from '../types'

export const getNotifications = (page = 1, pageSize = 20, unreadOnly = false) => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (unreadOnly) params.set('unreadOnly', 'true')
  return request<NotificationListResponse>(`/notifications?${params}`)
}

export const markAsRead = (id: string) =>
  request<{ message: string }>(`/notifications/${id}/read`, { method: 'PUT' })

export const markAllAsRead = () =>
  request<{ message: string }>('/notifications/read-all', { method: 'PUT' })

export const getUnreadCount = () =>
  request<{ count: number }>('/notifications/unread-count')

export const getPreferences = () =>
  request<{ data: NotificationPreferences }>('/notifications/preferences')

export const updatePreferences = (prefs: Partial<NotificationPreferences>) =>
  request<{ message: string }>('/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(prefs),
  })
```

### 4.2 `types/index.ts` — Thêm interfaces

Chèn vào cuối file trước section `// ===== Shared =====`:

```typescript
// ===== Notifications =====
export type NotificationType =
  | 'like' | 'comment' | 'follow' | 'message'
  | 'friend_request' | 'friend_accepted'
  | 'community_join_request' | 'community_join_approved' | 'community_join_rejected'
  | 'community_role_changed' | 'community_member_left' | 'community_member_kicked'
  | 'community_group_chat_added' | 'community_invite_code_used'
  | 'community_invitation_received' | 'community_invitation_accepted'
  | 'voice_call'

export interface NotificationItem {
  id: string
  sender_id?: string
  type: NotificationType
  content: string
  is_read: boolean
  created_at: string
  redirect_post_id?: string
  redirect_user_id?: string
  redirect_comment_id?: string
}

export interface NotificationListResponse {
  data: NotificationItem[]
  total: number
  page: number
}

export interface NotificationPreferences {
  like_enabled: boolean
  comment_enabled: boolean
  follow_enabled: boolean
  message_enabled: boolean
  friend_request_enabled: boolean
}
```

### 4.3 `locales/vi.json` + `locales/en.json` — Thêm translation keys

**vi.json:**

```json
"notifications": {
  "title": "Trung tâm thông báo",
  "markAllRead": "Đánh dấu tất cả đã đọc",
  "markRead": "Đánh dấu đã đọc",
  "viewAll": "Xem tất cả",
  "noNotifications": "Không có thông báo nào",
  "filterAll": "Tất cả",
  "filterUnread": "Chưa đọc",
  "filterRead": "Đã đọc",
  "justNow": "Vừa xong",
  "minutesAgo": "{minutes} phút trước",
  "hoursAgo": "{hours} giờ trước",
  "daysAgo": "{days} ngày trước",
  "preferences": "Cài đặt thông báo",
  "prefLike": "Thích bài viết",
  "prefComment": "Bình luận",
  "prefFollow": "Theo dõi",
  "prefMessage": "Tin nhắn",
  "prefFriendRequest": "Kết bạn & Cộng đồng",
  "prefSaved": "Đã lưu cài đặt thông báo",
  "newNotification": "Thông báo mới",
  "typeLabel_like": "thích",
  "typeLabel_comment": "bình luận",
  "typeLabel_follow": "theo dõi",
  "typeLabel_message": "nhắn tin",
  "typeLabel_friend_request": "kết bạn",
  "typeLabel_friend_accepted": "đã chấp nhận kết bạn",
  "typeLabel_voice_call": "cuộc gọi"
}
```

**en.json:**

```json
"notifications": {
  "title": "Notification Center",
  "markAllRead": "Mark all as read",
  "markRead": "Mark as read",
  "viewAll": "View all",
  "noNotifications": "No notifications",
  "filterAll": "All",
  "filterUnread": "Unread",
  "filterRead": "Read",
  "justNow": "Just now",
  "minutesAgo": "{minutes}m ago",
  "hoursAgo": "{hours}h ago",
  "daysAgo": "{days}d ago",
  "preferences": "Notification Preferences",
  "prefLike": "Likes",
  "prefComment": "Comments",
  "prefFollow": "Follows",
  "prefMessage": "Messages",
  "prefFriendRequest": "Friend Requests & Communities",
  "prefSaved": "Notification preferences saved",
  "newNotification": "New notification",
  "typeLabel_like": "liked",
  "typeLabel_comment": "commented",
  "typeLabel_follow": "followed",
  "typeLabel_message": "messaged",
  "typeLabel_friend_request": "sent friend request",
  "typeLabel_friend_accepted": "accepted friend request",
  "typeLabel_voice_call": "called"
}
```

### 4.4 `contexts/NotificationContext.tsx` — WebSocket + state context

Tạo context mới để quản lý:

- `unreadCount: number` — số chưa đọc
- `notifications: NotificationItem[]` — 5 thông báo gần nhất cho dropdown
- `refreshUnreadCount()` — gọi API getUnreadCount
- `markAllAsRead()` — gọi API + reset count
- `markAsRead(id)` — gọi API + update count
- `preferences: NotificationPreferences` — preferences đã load
- `updatePreferences(prefs)` — gọi API + update state

WS connection logic trong context provider (mount/unmount).

### 4.5 `components/NotificationDropdown.tsx` (+ `.module.css`)

Dropdown panel xuất hiện khi click bell icon:

```
┌─────────────────────────────────┐
│ Thông báo       [Đã đọc tất cả] │
├─────────────────────────────────┤
│ ● [icon] Nội dung...    2p ago │  ← chưa đọc (chấm xanh)
│   [icon] Nội dung khác 1h ago  │  ← đã đọc
│ ● [icon] ...               3h ago │
│   [icon] ...              1d ago │
│   [icon] ...              2d ago │
├─────────────────────────────────┤
│ Xem tất cả (12)                →│
└─────────────────────────────────┘
```

Kích thước: width ~380px, max-height ~480px, scroll khi quá 5 items.
Position: absolute, phía dưới bell icon, canh phải.
Click outside → đóng (giống profile dropdown).

Mỗi item click:
1. Nếu chưa đọc: `PUT /api/notifications/:id/read` (fire-and-forget)
2. Navigate theo redirect rules:
   - `redirect_post_id` → `/admin/posts` (hoặc chi tiết post)
   - `redirect_user_id` → `/admin/users`
   - Không có redirect → không navigate

### 4.6 `components/NotificationDropdown.module.css`

- `.dropdown` — container chính, position absolute, shadow, border radius
- `.header` — flex row, "Thông báo" + "Đã đọc tất cả" button
- `.list` — scrollable, max-height
- `.item` — flex row, padding, hover bg
- `.itemUnread` — thêm chấm xanh bên trái
- `.itemIcon` — icon theo type
- `.itemContent` — truncate nếu dài
- `.itemTime` — text-secondary, font nhỏ
- `.footer` — "Xem tất cả" link
- `.badge` — absolute trên bell icon, red dot + number

### 4.7 `app/admin/notifications/page.tsx` — Full notification page

Layout:

```
┌────────────────────────────────────────────────┐
│ [Tất cả | Chưa đọc | Đã đọc]  [Đã đọc tất cả] │
├────────────────────────────────────────────────┤
│ [icon] [avatar] [content...]    [time]  [●]   │  ← click → mark read + navigate
│ [icon] [avatar] [content...]    [time]        │
│ [icon] [avatar] [content...]    [time]  [●]   │
│ ...                                            │
├────────────────────────────────────────────────┤
│ < Prev                    Page 1 of 5  Next > │
└────────────────────────────────────────────────┘
```

- Mỗi row: 48px height, hover highlight
- Filter tabs: All / Unread / Read (dùng `unreadOnly` param)
- "Mark all as read" button (chỉ hiện khi có unread)
- Empty state khi không có notification
- Click row → `PUT /:id/read` + navigate (giống dropdown)
- Icon theo type + màu sắc:
  - `like` → ❤️ đỏ (bx bx-heart)
  - `comment` → 💬 xanh (bx bx-message-dots)
  - `follow` → 👤 xanh dương (bx bx-user-plus)
  - `message` → ✉️ (bx bx-envelope)
  - `friend_request` / `friend_accepted` → 👥 (bx bx-group)
  - `community_*` → 🌐 (bx bx-world)
  - `voice_call` → 📞 (bx bx-phone)

### 4.8 `app/admin/notifications/Notifications.module.css`

- `.page` — container padding
- `.header` — flex row, title + actions
- `.tabs` — filter buttons
- `.tab` / `.tabActive` — style cho từng tab
- `.list` — danh sách
- `.row` — mỗi notification item
- `.rowUnread` — unread variant (nền nhẹ + chấm)
- `.rowIcon` — icon container
- `.rowContent` — content text
- `.rowTime` — thời gian
- `.emptyState` — khi không có dữ liệu
- `.pagination` — pagination bar

### 4.9 `app/admin/settings/page.tsx` (+ `.module.css`) — Notification Preferences

Nếu chưa có settings page, tạo mới với tab "Cài đặt thông báo":

```
┌──────────────────────────────────┐
│ Thông báo                        │
├──────────────────────────────────┤
│ Thích bài viết          [toggle] │
│ Bình luận               [toggle] │
│ Theo dõi                [toggle] │
│ Tin nhắn                [toggle] │
│ Kết bạn & Cộng đồng     [toggle] │
└──────────────────────────────────┘
```

- Mỗi toggle gọi `PUT /api/notifications/preferences` ngay khi thay đổi
- Toast thành công sau khi save

---

## 5. Các file cần sửa

### 5.1 `components/AdminNavbar.tsx`

Thay đổi:

1. **Import**: thêm `useNotification` context hook
2. **State**: `notifOpen: boolean` (toggle dropdown)
3. **Bell button hiện tại** (line 116-118):
   ```tsx
   <button className={styles.notif} aria-label="Notifications">
     <i className="bx bx-bell" />
   </button>
   ```
   → Sửa thành:
   ```tsx
   <div className={styles.notifWrap}>
     <button className={styles.notif} aria-label="Notifications" onClick={() => setNotifOpen(!notifOpen)}>
       <i className="bx bx-bell" />
       {unreadCount > 0 && (
         <span className={styles.notifBadge}>
           {unreadCount > 99 ? '99+' : unreadCount}
         </span>
       )}
     </button>
     {notifOpen && (
       <NotificationDropdown onClose={() => setNotifOpen(false)} />
     )}
   </div>
   ```

4. **Click outside**: thêm `useEffect` + ref để đóng dropdown (tương tự profile dropdown)

### 5.2 `components/AdminNavbar.module.css`

Thêm:

```css
/* Notification bell wrapper */
.notifWrap {
  position: relative;
}

/* Badge number */
.notifBadge {
  position: absolute;
  top: -6px;
  right: -8px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--color-danger);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  pointer-events: none;
}
```

### 5.3 `app/admin/layout.tsx`

Thêm:
1. Import `NotificationProvider` từ context
2. Wrap `{children}` với `<NotificationProvider>`
3. Mở WS connection khi layout mount (trong NotificationProvider)

---

## 6. Luồng dữ liệu

```
[Server tạo notification]
       ↓
ws.Hub.SendToUser(receiverID, OutgoingMessage{Type: "notification", Data: ...})
       ↓
[WebSocket client trong NotificationContext nhận event]
       ↓
Cập nhật unreadCount + thêm vào đầu notifications list
       ↓
[Navbar re-render] → badge cập nhật số
[Nếu dropdown đang mở] → item mới xuất hiện ở đầu list
```

### Khi click notification

```
Click item
  → Nếu chưa đọc: PUT /api/notifications/:id/read (fire-and-forget)
  → Cập nhật unreadCount -= 1
  → Nếu có redirect_post_id: router.push('/admin/posts')
  → Nếu có redirect_user_id: router.push('/admin/users')
  → Không: chỉ mark read
```

### Khi click "Đã đọc tất cả"

```
PUT /api/notifications/read-all
  → unreadCount = 0
  → Tất cả is_read = true trong list
  → Dropdown đóng (nếu đang mở)
```

---

## 7. Mốc hoàn thành

| # | Task | File | Người |
|---|------|------|-------|
| 1 | Thêm TypeScript interfaces | `types/index.ts` | |
| 2 | Viết API functions | `api/notifications.ts` | |
| 3 | Thêm translation keys | `locales/vi.json`, `locales/en.json` | |
| 4 | Tạo NotificationContext + WS | `contexts/NotificationContext.tsx` | |
| 5 | Tạo NotificationDropdown | `components/NotificationDropdown.tsx` + `.module.css` | |
| 6 | Sửa AdminNavbar (badge + dropdown trigger) | `components/AdminNavbar.tsx` + `.module.css` | |
| 7 | Sửa AdminLayout (wrap NotificationProvider) | `app/admin/layout.tsx` | |
| 8 | Tạo Notification Center page | `app/admin/notifications/page.tsx` + `.module.css` | |
| 9 | Tạo Settings page (preferences) | `app/admin/settings/page.tsx` + `.module.css` | |

Thứ tự ưu tiên: 1 → 2 → 3 → 4 → 5+6 → 7 → 8 → 9
