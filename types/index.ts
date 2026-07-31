// ===== Auth =====
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'PARTNER' | 'USER'

export interface TokenPayload {
  user_id: string
  email: string
  role: UserRole
  token_type: string
  token_version: number
}

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

export type RegisterResponse = Omit<AuthResponse, 'tokens'> & {
  tokens?: TokenResponse
  verify_email?: boolean
}

// ===== Feed / Posts =====
export interface EmojiItem {
  id: string
  code: string
  image_uri: string
}

export interface TrendingHashtag {
  name: string
  post_count: number
}

export interface FeedMedia {
  id: string
  user_id: string
  post_id?: string
  file_uri: string
  file_type: string
  file_size?: number
  status?: string
  review_reason?: string
  created_at?: string
}

export interface FeedPost {
  id: string
  user_id: string
  community_id?: string
  username: string
  display_name: string
  avatar_uri: string
  title: string
  content: string
  views_count: number
  likes_count: number
  comments_count: number
  shares_count: number
  status: string
  created_at: string
  updated_at?: string
  media: FeedMedia[]
  is_liked: boolean
  is_saved: boolean
  is_following: boolean
}

export interface FeedResponse {
  page_size: number
  next_cursor: string | null
  data: FeedPost[]
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
  has_media: boolean
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
  chart_data_users?: ChartDataPoint[]
  chart_data_posts?: ChartDataPoint[]
  chart_data_reports?: ChartDataPoint[]
  chart_data_comments?: ChartDataPoint[]
  top_users?: TopActiveUser[]
  top_posts?: TopEngagedPost[]
  user_status_distribution?: StatusCount[]
  report_status_distribution?: StatusCount[]
  generated_at: string
}

// ===== Profile =====
export interface ViewProfileResponse {
  display_name: string
  phone_number: string
  date_of_birth?: string
  avatar_uri: string
  bio: string
  is_private_profile: boolean
  is_private_posts: boolean
  allow_stranger_friend_request: boolean
  updated_at?: string
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
  username: string
  display_name: string
  avatar_uri: string
  title: string
  content: string
  status: string
  views_count: number
  likes_count: number
  comments_count: number
  shares_count: number
  media_uris: string[]
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
  display_name?: string
  username?: string
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
  status: "active" | "archived" | "hidden"
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
  avatar_uri: string
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
  background_uri: string
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

// ===== Moderation Logs =====
export interface AdminModerationLogItem {
  id: string
  moderator_id: string
  moderator_name: string
  action: string
  target_type: string
  target_id: string
  reason: string
  created_at: string
}

export interface AdminModerationLogListResponse {
  logs: AdminModerationLogItem[]
  total: number
  page: number
  page_size: number
}

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
  sender_name?: string
  sender_avatar?: string
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
  community_enabled: boolean
  voice_call_enabled: boolean
}

// ===== Shared =====
export interface AdminModerateInput {
  reason: string
}

export interface AdminWarnInput {
  reason: string
  message: string
}

export interface AdminMediaGroupItem {
  user_id: string
  username: string
  display_name: string
  avatar_uri: string
  media: AdminMediaItem[]
}

export interface AdminMediaGroupedResponse {
  groups: AdminMediaGroupItem[]
  total: number
  page: number
  page_size: number
}

// ===== Ads =====
export interface AdminAdListItem {
  id: string
  title: string
  content: string
  partner_id: string
  partner_name: string
  partner_display_name: string
  media_id?: string
  media_uri: string
  target_url: string
  status: 'active' | 'paused' | 'completed'
  budget: number
  impressions: number
  clicks: number
  ctr: number
  started_at: string
  expires_at: string
  created_at: string
}

export interface AdminAdListResponse {
  ads: AdminAdListItem[]
  total: number
  page: number
  page_size: number
}

export interface AdPerformance {
  ad_id: string
  title: string
  status: string
  budget: number
  impressions: number
  clicks: number
  interactions: number
  ctr: number
}

// ===== Follow =====
export interface FollowSuggestionUser {
  id: string
  username: string
  display_name: string
  avatar_uri: string
  mutual_count: number
}

export interface FollowSuggestionsResponse {
  data: FollowSuggestionUser[]
  page: number
  page_size: number
  total: number
  has_more: boolean
}

export interface FollowToggleResponse {
  action: string
  is_following: boolean
  follower_count: number
  following_count: number
  message: string
}

export interface AdminSettingsResponse {
  settings: Record<string, string>
}

export interface AdminSettingsInput {
  settings: Record<string, string>
}