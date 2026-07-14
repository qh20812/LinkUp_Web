// ===== Auth =====
export interface AuthUserResponse {
  id: string
  username: string
  email: string
  status: string
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  refresh_ttl_in: number
}

export interface StorageInfo {
  quota_bytes: number
  used_bytes: number
  available_bytes: number
}

export interface AuthResponse {
  user: AuthUserResponse
  tokens: TokenResponse
  storage?: StorageInfo
}

// ===== Dashboard / Analytics =====
export interface ChartDataPoint {
  date: string
  count: number
}

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
  chart_data?: ChartDataPoint[]
  top_users?: TopActiveUser[]
  top_posts?: TopEngagedPost[]
  user_status_distribution?: StatusCount[]
  report_status_distribution?: StatusCount[]
  generated_at: string
}

// ===== Users =====
export interface AdminUserListItem {
  id: string
  username: string
  email: string
  status: string
  display_name: string
  avatar_uri: string
  created_at: string
  updated_at?: string
}

export interface AdminUserListResponse {
  users: AdminUserListItem[]
  total: number
  page: number
  page_size: number
  message?: string
}

export interface AdminUserBanInput {
  reason: string
  duration: string
}

export interface AdminBanUserResponse {
  message: string
  ban_util?: string
}

// ===== Posts =====
export interface AdminPostListItem {
  id: string
  user_id: string
  title: string
  content: string
  status: string
  views_count: number
  likes_count: number
  comments_count: number
  shares_count: number
  created_at: string
  updated_at?: string
}

export interface AdminPostListResponse {
  posts: AdminPostListItem[]
  total: number
  page: number
  page_size: number
  message?: string
}

export interface AdminHidePostInput {
  reason: string
}

// ===== Reports =====
export interface AdminReportListItem {
  id: string
  reporter_id: string
  reporter_username: string
  reporter_email: string
  target_type: string
  target_user_id?: string
  target_post_id?: string
  target_comment_id?: string
  report_type: string
  violation_rule_id?: string
  reason_detail: string
  status: string
  created_at: string
}

export interface AdminReportListResponse {
  reports: AdminReportListItem[]
  total: number
  page: number
  page_size: number
}

export interface AdminReportDetailResponse extends AdminReportListItem {
  post_owner_id?: string
}

export interface AdminReportReviewInput {
  action: string
  reason?: string
  duration?: string
}

// ===== Media =====
export interface AdminMediaItem {
  id: string
  user_id: string
  file_uri: string
  file_type: string
  file_size: number
  status: string
  created_at: string
}

export interface AdminMediaListResponse {
  items: AdminMediaItem[]
  total: number
  page: number
}

export interface AdminReviewMediaInput {
  action: string
  reason: string
}

// ===== Groups =====
export interface AdminGroupListItem {
  id: string
  name: string
  creator_id?: string
  creator_name: string
  member_count: number
  status: string
  created_at: string
}

export interface AdminGroupListResponse {
  groups: AdminGroupListItem[]
  total: number
  page: number
  page_size: number
}

export interface AdminGroupMember {
  user_id: string
  display_name: string
  avatar_uri: string
  role: string
}

export interface AdminGroupDetailResponse {
  id: string
  name: string
  avatar_uri: string
  creator_id?: string
  creator_name: string
  type: string
  status: string
  member_count: number
  members: AdminGroupMember[]
  created_at: string
  updated_at?: string
}

// ===== Communities =====
export interface AdminCommunityListItem {
  id: string
  name: string
  creator_id: string
  creator_name: string
  member_count: number
  privacy: string
  status: string
  created_at: string
}

export interface AdminCommunityListResponse {
  communities: AdminCommunityListItem[]
  total: number
  page: number
  page_size: number
}

export interface AdminCommunityMember {
  user_id: string
  display_name: string
  avatar_uri: string
  role: string
}

export interface AdminCommunityDetailResponse {
  id: string
  name: string
  description: string
  avatar_uri: string
  creator_id: string
  creator_name: string
  privacy: string
  status: string
  auto_approve: boolean
  member_count: number
  members: AdminCommunityMember[]
  created_at: string
  updated_at?: string
}

// ===== Shared =====
export interface AdminModerateInput {
  reason: string
}

export interface AdminWarnInput {
  reason: string
  message: string
}
