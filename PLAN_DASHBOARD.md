# PLAN: Admin Dashboard nâng cấp

## Mục tiêu

Biến dashboard admin từ 3 stat cards + 1 chart + 2 bảng → dashboard chuyên nghiệp với **9 stat cards, 2 charts, 4 bảng, alert bar** phục vụ SuperAdmin và Admin.

---

## Tổng quan layout mới

```
┌──────────────────────────────────────────────────────────────────┐
│  Bảng điều khiển                         Period: [7 ngày qua ▾] │
│  01/07 – 14/07/2026                                              │
├───────────┬───────────┬───────────┬───────────┬───────────┬──────┤
│ 👥 Users  │ 📄 Posts  │ 💬 Bình   │ 🖼 Media  │ 👥 Nhóm   │ 🏘 Cộng│
│  1,234    │   567     │  luận     │   89      │   12      │ đồng │
│  +5.2%    │  +12.3%   │  2,345    │  +3.1%    │  0%       │  8   │
│           │           │  +8.7%    │           │           │+14.3%│
├───────────┴───────────┴───────────┴───────────┴───────────┴──────┤
│ 🔴 Báo cáo chờ: 3    🟡 Media bị cờ: 1    🟢 Ban hiệu lực: 5    │
├─────────────────────────────────────┬───────────────────────────┤
│ 📈 Hoạt động gần đây                │ 🥧 Phân bố trạng thái    │
│  (LineChart: users/posts/reports/   │  (PieChart: user/report   │
│   comments/theo ngày)               │   status distribution)    │
├─────────────────────────────────────┴───────────────────────────┤
│ 🏆 Top người dùng tích cực   │ 🔥 Top bài viết tương tác      │
│ ┌──────────────────────────┐ │ ┌────────────────────────────┐ │
│ │ #1 userA · 12 bài        │ │ #1 "Bài viết ABC"           │ │
│ │ #2 userB · 8 bài         │ │    120 views, 15 likes      │ │
│ │ #3 userC · 5 bài         │ │ #2 ...                      │ │
│ └──────────────────────────┘ │ └────────────────────────────┘ │
├──────────────────────────────┴────────────────────────────────┤
│ 📋 Người dùng gần đây   │ 📋 Báo cáo gần đây                │
│ ┌──────────────────────┐ │ ┌──────────────────────────────┐ │
│ │ (table)              │ │ │ (table)                      │ │
│ └──────────────────────┘ │ └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

# Phase 1 — Backend: Mở rộng Analytics API

## 1.1 `server/dto/admin.dto.go`

### Thêm DTO mới

```go
// ── Top Lists ──

type TopActiveUser struct {
    UserID      string `json:"user_id"`
    Username    string `json:"username"`
    DisplayName string `json:"display_name"`
    AvatarURI   string `json:"avatar_uri"`
    PostCount   int    `json:"post_count"`
}

type TopEngagedPost struct {
    PostID        string `json:"post_id"`
    Title         string `json:"title"`
    Username      string `json:"username"`
    ViewsCount    int    `json:"views_count"`
    LikesCount    int    `json:"likes_count"`
    CommentsCount int    `json:"comments_count"`
}

type StatusCount struct {
    Status string `json:"status"`
    Count  int64  `json:"count"`
}
```

### Sửa `AdminAnalyticsResponse` (thêm fields)

| Field | Type | Mô tả |
|---|---|---|
| `total_comments` | int64 | Tổng comments |
| `total_media` | int64 | Tổng media files |
| `total_groups` | int64 | Tổng group chats |
| `total_communities` | int64 | Tổng communities |
| `total_active_bans` | int64 | Ban đang hiệu lực |
| `pending_reports` | int64 | Report status=pending |
| `flagged_media_count` | int64 | Media status=flagged |
| `active_users_today` | int64 | User có post hôm nay |
| `total_likes` | int64 | Tổng reactions |
| `total_shares` | int64 | Tổng shares |
| `comments_change_percent` | float64 | % thay đổi comments |
| `media_change_percent` | float64 | % thay đổi media |
| `groups_change_percent` | float64 | % thay đổi groups |
| `communities_change_percent` | float64 | % thay đổi communities |
| `top_users` | []TopActiveUser | Top 5 user tích cực |
| `top_posts` | []TopEngagedPost | Top 5 post tương tác cao |
| `user_status_distribution` | []StatusCount | active/banned/suspended |
| `report_status_distribution` | []StatusCount | pending/reviewed/resolved/rejected |

---

## 1.2 `server/repository/admin.repository.go`

### Interface — thêm 14 methods

```go
type AdminRepository interface {
    // Cũ
    GetTotalUsers() (int64, error)
    GetTotalPosts() (int64, error)
    GetTotalReports() (int64, error)
    GetCountBeforeDate(tableName string, date time.Time) (int64, error)
    GetChartData(tableName string, startDate, endDate string) ([]dto.ChartDataPoint, error)

    // MỚI — tổng số
    GetTotalComments() (int64, error)
    GetTotalMedia() (int64, error)
    GetTotalGroups() (int64, error)
    GetTotalCommunities() (int64, error)
    GetActiveBanCount() (int64, error)

    // MỚI — trạng thái đặc biệt
    GetPendingReportCount() (int64, error)
    GetFlaggedMediaCount() (int64, error)
    GetActiveUsersToday() (int64, error)

    // MỚI — engagement
    GetTotalLikes() (int64, error)
    GetTotalShares() (int64, error)

    // MỚI — top lists & distribution
    GetTopActiveUsers(limit int) ([]dto.TopActiveUser, error)
    GetTopEngagedPosts(limit int) ([]dto.TopEngagedPost, error)
    GetUserStatusDistribution() ([]dto.StatusCount, error)
    GetReportStatusDistribution() ([]dto.StatusCount, error)
}
```

### Triển khai — các query cụ thể

<details>
<summary>Xem chi tiết từng method</summary>

```go
func (r *adminRepository) GetTotalComments() (int64, error) {
    var count int64
    err := r.db.Model(&models.Comment{}).Count(&count).Error
    return count, err
}

func (r *adminRepository) GetTotalMedia() (int64, error) {
    var count int64
    err := r.db.Model(&models.Media{}).Count(&count).Error
    return count, err
}

func (r *adminRepository) GetTotalGroups() (int64, error) {
    var count int64
    err := r.db.Table("group_chats").Count(&count).Error
    return count, err
}

func (r *adminRepository) GetTotalCommunities() (int64, error) {
    var count int64
    err := r.db.Model(&models.Community{}).Count(&count).Error
    return count, err
}

func (r *adminRepository) GetActiveBanCount() (int64, error) {
    var count int64
    now := time.Now()
    err := r.db.Model(&models.Ban{}).
        Where("expires_at > ? OR expires_at IS NULL", now).
        Count(&count).Error
    return count, err
}

func (r *adminRepository) GetPendingReportCount() (int64, error) {
    var count int64
    err := r.db.Model(&models.Report{}).
        Where("status = ?", "pending").
        Count(&count).Error
    return count, err
}

func (r *adminRepository) GetFlaggedMediaCount() (int64, error) {
    var count int64
    err := r.db.Model(&models.Media{}).
        Where("status = ?", "flagged").
        Count(&count).Error
    return count, err
}

func (r *adminRepository) GetActiveUsersToday() (int64, error) {
    var count int64
    today := time.Now().UTC().Format("2006-01-02")
    err := r.db.Table("posts").
        Where("DATE(created_at) = ?", today).
        Select("COUNT(DISTINCT user_id)").
        Scan(&count).Error
    return count, err
}

func (r *adminRepository) GetTotalLikes() (int64, error) {
    var count int64
    err := r.db.Model(&models.PostReaction{}).Count(&count).Error
    return count, err
}

func (r *adminRepository) GetTotalShares() (int64, error) {
    var count int64
    err := r.db.Model(&models.PostShare{}).Count(&count).Error
    return count, err
}

func (r *adminRepository) GetTopActiveUsers(limit int) ([]dto.TopActiveUser, error) {
    var users []dto.TopActiveUser
    err := r.db.Table("posts").
        Select("u.id as user_id, u.username, COALESCE(p.display_name, u.username) as display_name, COALESCE(p.avatar_uri, '') as avatar_uri, COUNT(*) as post_count").
        Joins("JOIN users u ON u.id = posts.user_id").
        Joins("LEFT JOIN profiles p ON p.user_id = u.id").
        Where("posts.status != ?", string(models.PostStatusDeleted)).
        Group("posts.user_id, u.id, u.username, p.display_name, p.avatar_uri").
        Order("post_count DESC").
        Limit(limit).
        Scan(&users).Error
    return users, err
}

func (r *adminRepository) GetTopEngagedPosts(limit int) ([]dto.TopEngagedPost, error) {
    var posts []dto.TopEngagedPost
    err := r.db.Table("posts").
        Select("posts.id as post_id, posts.title, u.username, posts.views_count, posts.likes_count, posts.comments_count").
        Joins("JOIN users u ON u.id = posts.user_id").
        Where("posts.status != ?", string(models.PostStatusDeleted)).
        Order("(COALESCE(posts.views_count,0) + COALESCE(posts.likes_count,0)*2 + COALESCE(posts.comments_count,0)*3) DESC").
        Limit(limit).
        Scan(&posts).Error
    return posts, err
}

func (r *adminRepository) GetUserStatusDistribution() ([]dto.StatusCount, error) {
    var dist []dto.StatusCount
    err := r.db.Model(&models.User{}).
        Select("status, COUNT(*) as count").
        Group("status").
        Scan(&dist).Error
    return dist, err
}

func (r *adminRepository) GetReportStatusDistribution() ([]dto.StatusCount, error) {
    var dist []dto.StatusCount
    err := r.db.Model(&models.Report{}).
        Select("status, COUNT(*) as count").
        Group("status").
        Scan(&dist).Error
    return dist, err
}
```

</details>

---

## 1.3 `server/services/admin.service.go`

### Sửa `GetDashboardAnalytics`

Thêm logic sau phần tổng số cũ:

```go
// ── MỚI: tổng số ──
totalComments, _     := s.adminRepo.GetTotalComments()
totalMedia, _        := s.adminRepo.GetTotalMedia()
totalGroups, _       := s.adminRepo.GetTotalGroups()
totalCommunities, _  := s.adminRepo.GetTotalCommunities()
activeBanCount, _    := s.adminRepo.GetActiveBanCount()

// ── MỚI: trạng thái ──
pendingReports, _    := s.adminRepo.GetPendingReportCount()
flaggedMedia, _      := s.adminRepo.GetFlaggedMediaCount()
activeUsersToday, _  := s.adminRepo.GetActiveUsersToday()

// ── MỚI: engagement ──
totalLikes, _        := s.adminRepo.GetTotalLikes()
totalShares, _       := s.adminRepo.GetTotalShares()

// ── MỚI: % thay đổi (dùng GetCountBeforeDate với các table tương ứng) ──
prevComments, _      := s.adminRepo.GetCountBeforeDate("comments", oneMonthAgo)
prevMedia, _         := s.adminRepo.GetCountBeforeDate("media", oneMonthAgo)
prevGroups, _        := s.adminRepo.GetCountBeforeDate("group_chats", oneMonthAgo)
prevCommunities, _   := s.adminRepo.GetCountBeforeDate("communities", oneMonthAgo)

// ── MỚI: top lists ──
topUsers, _          := s.adminRepo.GetTopActiveUsers(5)
topPosts, _          := s.adminRepo.GetTopEngagedPosts(5)

// ── MỚI: distribution ──
userDist, _          := s.adminRepo.GetUserStatusDistribution()
reportDist, _        := s.adminRepo.GetReportStatusDistribution()
```

**Chart data mở rộng:** Thêm `comments` vào danh sách `case`:

```go
case "all":
    // Chart mặc định → comments (thay vì posts) vì comments có nhiều data hơn
    tableName = "comments"
```

Gộp tất cả vào response:

```go
return dto.AdminAnalyticsResponse{
    // Cũ
    TotalUsers: totalUsers, TotalPosts: totalPosts, TotalReports: totalReports,
    UsersChangePercent: usersChangePct, PostsChangePercent: postsChangePct, ReportsChangePercent: reportsChangePct,
    ChartData: chartData, GeneratedAt: time.Now().UTC(),

    // MỚI
    TotalComments: totalComments, TotalMedia: totalMedia,
    TotalGroups: totalGroups, TotalCommunities: totalCommunities,
    TotalActiveBans: activeBanCount,
    PendingReports: pendingReports, FlaggedMediaCount: flaggedMedia,
    ActiveUsersToday: activeUsersToday,
    TotalLikes: totalLikes, TotalShares: totalShares,
    CommentsChangePercent: calcPercentChange(totalComments, prevComments),
    MediaChangePercent: calcPercentChange(totalMedia, prevMedia),
    GroupsChangePercent: calcPercentChange(totalGroups, prevGroups),
    CommunitiesChangePercent: calcPercentChange(totalCommunities, prevCommunities),
    TopUsers: topUsers, TopPosts: topPosts,
    UserStatusDistribution: userDist, ReportStatusDistribution: reportDist,
}, nil
```

> **Lưu ý:** `GetCountBeforeDate` dùng raw table name string. Các table mới cần verify tên table khớp với DB:
> - comments ✅
> - media ✅
> - group_chats ✅ (kiểm tra lại trong schema)
> - communities ✅ (kiểm tra lại trong schema)

### Sửa `ensureSuperAdmin` → `ensureAdmin`

Hiện tại `GetDashboardAnalytics` gọi `ensureSuperAdmin` — chỉ SuperAdmin mới xem được dashboard. Nên đổi thành `ensureAdmin` để Admin cũng xem được.

```go
// Sửa dòng 73:
if err := s.ensureAdmin(ctx, superAdminID); err != nil {
    return dto.AdminAnalyticsResponse{}, err
}
```

---

# Phase 2 — Frontend: Dashboard UI mới

## 2.1 `web/api/admin.ts`

### Cập nhật `AdminAnalyticsResponse` type

```typescript
export interface AdminAnalyticsResponse {
  total_users: number
  total_posts: number
  total_reports: number
  total_comments: number
  total_media: number
  total_groups: number
  total_communities: number
  total_active_bans: number
  pending_reports: number
  flagged_media_count: number
  active_users_today: number
  total_likes: number
  total_shares: number
  users_change_percent: number
  posts_change_percent: number
  reports_change_percent: number
  comments_change_percent: number
  media_change_percent: number
  groups_change_percent: number
  communities_change_percent: number
  chart_data: ChartDataPoint[]
  top_users: TopActiveUser[]
  top_posts: TopEngagedPost[]
  user_status_distribution: StatusCount[]
  report_status_distribution: StatusCount[]
  generated_at: string
}
```

### Thêm types mới

```typescript
export interface TopActiveUser {
  user_id: string
  username: string
  display_name: string
  avatar_uri: string
  post_count: number
}

export interface TopEngagedPost {
  post_id: string
  title: string
  username: string
  views_count: number
  likes_count: number
  comments_count: number
}

export interface StatusCount {
  status: string
  count: number
}
```

---

## 2.2 `web/app/admin/dashboard/page.tsx` — Chi tiết

### Stat Cards (6 cards)

```tsx
const statCards = [
  { key: 'total_users', change: 'users_change_percent', icon: 'bx bx-group',         color: 'var(--color-primary)' },
  { key: 'total_posts', change: 'posts_change_percent', icon: 'bx bx-file',           color: 'var(--color-accent)' },
  { key: 'total_comments', change: 'comments_change_percent', icon: 'bx bx-comment',  color: '#7B68EE' },
  { key: 'total_media', change: 'media_change_percent', icon: 'bx bx-image',          color: '#00BFA5' },
  { key: 'total_groups', change: 'groups_change_percent', icon: 'bx bx-chat',         color: '#FF6F91' },
  { key: 'total_communities', change: 'communities_change_percent', icon: 'bx bx-building', color: '#FFC107' },
]
```

Render vòng lặp:

```tsx
<div className={styles.statsGrid}>
  {statCards.map(card => (
    <StatCard
      key={card.key}
      title={t(`dashboard.${card.key}`)}
      value={loading ? '—' : (data?.[card.key] ?? 0).toLocaleString()}
      icon={card.icon}
      color={card.color}
      loading={loading}
      animateValue={loading ? undefined : data?.[card.key]}
      trend={loading ? null : data?.[card.change]}
    />
  ))}
</div>
```

### Alert Bar

```tsx
<div className={styles.alertBar}>
  <span className={styles.alertItem}>
    <i className="bx bx-flag" style={{ color: 'var(--color-danger)' }} />
    {t('dashboard.pendingReports')}: {data?.pending_reports ?? 0}
  </span>
  <span className={styles.alertItem}>
    <i className="bx bx-flag-alt" style={{ color: 'var(--color-warning)' }} />
    {t('dashboard.flaggedMedia')}: {data?.flagged_media_count ?? 0}
  </span>
  <span className={styles.alertItem}>
    <i className="bx bx-shield" style={{ color: 'var(--color-success)' }} />
    {t('dashboard.activeBans')}: {data?.total_active_bans ?? 0}
  </span>
</div>
```

### Chart Section (2 columns)

```tsx
<div className={styles.chartsRow}>
  {/* LineChart — giữ nguyên, thêm comments line */}
  <div className={styles.chartContainer}>
    <h2>{t('dashboard.recentActivity')}</h2>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={mergedChartData}>
        {/* ... lines cho users, posts, reports, comments */}
      </LineChart>
    </ResponsiveContainer>
  </div>

  {/* PieChart — phân bố user status */}
  <div className={styles.chartContainer}>
    <h2>{t('dashboard.userStatusDistribution')}</h2>
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={userStatusData}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ status, percent }) => `${status} (${(percent * 100).toFixed(0)}%)`}
        >
          {userStatusData.map((entry, index) => (
            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </div>
</div>
```

### Top Lists Tables

```tsx
<div className={styles.tablesGrid}>
  {/* Top Users */}
  <div className={styles.recentCard}>
    <h3>{t('dashboard.topUsers')}</h3>
    <table>
      <thead><tr><th>#</th><th>{t('common.user')}</th><th>{t('dashboard.postCount')}</th></tr></thead>
      <tbody>
        {data?.top_users?.map((u, i) => (
          <tr key={u.user_id}>
            <td>{i + 1}</td>
            <td>
              <img src={u.avatar_uri || '/default-avatar.png'} className={styles.recentAvatar} />
              {u.display_name || u.username}
            </td>
            <td>{u.post_count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {/* Top Posts */}
  <div className={styles.recentCard}>
    <h3>{t('dashboard.topPosts')}</h3>
    <table>
      <thead><tr><th>#</th><th>{t('common.title')}</th><th>{t('common.engagement')}</th></tr></thead>
      <tbody>
        {data?.top_posts?.map((p, i) => (
          <tr key={p.post_id}>
            <td>{i + 1}</td>
            <td>{p.title}</td>
            <td>{p.views_count} views · {p.likes_count} likes</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

### Data flow thay đổi

```typescript
// Trước: 6 requests song song
Promise.all([
  getDashboardStats(undefined, startDate, endDate),
  getDashboardStats('users', ...),
  getDashboardStats('posts', ...),
  getDashboardStats('reports', ...),
  getUsers(1, 5),
  getReports(1, 5),
])

// Sau: 1 request analytics + 2 recent tables
Promise.all([
  getDashboardStats(undefined, startDate, endDate),  // trả về tất cả
  getUsers(1, 5),
  getReports(1, 5),
])
```

Chart data merge mở rộng — thêm comments:

```typescript
// mergeChartData nhận thêm comments[]
function mergeChartData(
  users?: ChartDataPoint[],
  posts?: ChartDataPoint[],
  reports?: ChartDataPoint[],
  comments?: ChartDataPoint[],
): MergedChartPoint[] {
  // ... thêm comments vào dateMap
}
```

---

## 2.3 CSS — `Dashboard.module.css`

### Thêm styles

| Selector | Mô tả |
|---|---|
| `.alertBar` | Flex row, gap, padding, border, background |
| `.alertItem` | Icon + text, gap, font-size 13px |
| `.chartsRow` | `display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg)` |
| `.statCardsContainer` | Wrapper nếu cần custom |
| `.topListTable` | Table variant cho top lists |

### Responsive

```css
@media screen and (max-width: 768px) {
  .chartsRow { grid-template-columns: 1fr; }
  .tablesGrid { grid-template-columns: 1fr; }
}
```

---

## 2.4 Locales — `vi.json` + `en.json`

### Keys mới

```json
{
  "dashboard": {
    // cũ giữ nguyên

    // stat card labels
    "total_comments": "Bình luận" / "Comments",
    "total_media": "Media" / "Media",
    "total_groups": "Nhóm" / "Groups",
    "total_communities": "Cộng đồng" / "Communities",

    // alert bar
    "pendingReports": "Báo cáo chờ" / "Pending Reports",
    "flaggedMedia": "Media bị cờ" / "Flagged Media",
    "activeBans": "Ban đang hiệu lực" / "Active Bans",
    "total_active_bans": "Ban đang hiệu lực" / "Active Bans",

    // charts
    "userStatusDistribution": "Phân bố trạng thái người dùng" / "User Status Distribution",
    "reportStatusDistribution": "Phân bố trạng thái báo cáo" / "Report Status Distribution",

    // top lists
    "topUsers": "Người dùng tích cực nhất" / "Top Active Users",
    "topPosts": "Bài viết tương tác nhất" / "Top Engaged Posts",
    "postCount": "Số bài" / "Posts",

    // engagement
    "total_likes": "Lượt thích" / "Likes",
    "total_shares": "Lượt chia sẻ" / "Shares",

    // common
    "user": "Người dùng" / "User",
    "title": "Tiêu đề" / "Title",
    "engagement": "Tương tác" / "Engagement"
  }
}
```

---

## 2.5 StatCard component — sử dụng lại

`components/StatCard.tsx` đã hỗ trợ `trend` (number | null) → hiển thị % tăng/giảm. Không cần sửa. Chỉ cần truyền `change_percent` từ response.

---

# Phase 3 — Tính năng mở rộng

Các tính năng này **không bắt buộc**, có thể làm sau khi Phase 1+2 hoàn tất:

| STT | Tính năng | Backend | Frontend | Độ ưu tiên |
|---|---|---|---|---|
| 1 | **Xuất CSV** endpoint `GET /admin/analytics/export?start_date=&end_date=` trả về CSV | `admin.service.go` + route mới | Nút "Xuất báo cáo" trong chart header | Medium |
| 2 | **Admin Activity Log** — query `moderation_logs` table, lấy 5 log gần nhất | `GetRecentModerationLogs(limit)` | Bảng "Hoạt động admin gần đây" thứ 3 trong tablesGrid | Medium |
| 3 | **Media Storage** — `SELECT COALESCE(SUM(file_size),0) FROM media` | `GetTotalMediaStorage()` | Stat card "Dung lượng media" format GB/MB | Low |
| 4 | **DAU/MAU Chart** — nếu `users.last_login_at` có dữ liệu, query DAU theo ngày | `GetDailyActiveUsers(startDate, endDate)` | Line chart riêng "Người dùng hoạt động" | Low |
| 5 | **Bulk actions** trong recent tables — checkbox + "Xóa/banned" button | Có sẵn (POST ban, PUT status) | Thêm checkbox column + action bar | Low |
| 6 | **Date range picker chi tiết** — ngoài 4 preset, thêm calendar picker | Đã support (start_date/end_date) | Thêm `<input type="date">` cho custom range | Low |
| 7 | **Dashboard refresh timer** — auto-refresh mỗi 60s | Không cần | `setInterval` + `useRef` | Low |

---

# Files thay đổi summary

| File | Phase | Action |
|---|---|---|
| `server/dto/admin.dto.go` | 1 | Thêm structs + sửa AdminAnalyticsResponse |
| `server/repository/admin.repository.go` | 1 | Thêm 14 methods + interface |
| `server/services/admin.service.go` | 1 | Sửa GetDashboardAnalytics, đổi ensureSuperAdmin → ensureAdmin |
| `web/api/admin.ts` | 2 | Update types, thêm interfaces |
| `web/app/admin/dashboard/page.tsx` | 2 | Rewrite với 6 stat cards, alert bar, 2 charts, 4 tables |
| `web/app/admin/dashboard/Dashboard.module.css` | 2 | Thêm alertBar, chartsRow, pieChart styles |
| `web/locales/vi.json` | 2 | +15 keys |
| `web/locales/en.json` | 2 | +15 keys |

---

## Dependencies

- `recharts` đã có trong `package.json` — hỗ trợ PieChart, Cell đầy đủ
- Không cần thêm thư viện mới nào
