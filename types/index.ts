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

export interface VerifyEmailResponse {
  message: string
  verified: boolean
  access_token?: string
  refresh_token?: string
  role?: string
}

export interface ResendVerificationResponse {
  message: string
}

export interface ForgotPasswordResponse {
  message: string
}

export interface VerifyResetTokenResponse {
  message: string
  valid: boolean
}

export interface ResetPasswordResponse {
  message: string
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

export interface MediaItem {
  id: string
  post_id: string
  file_uri: string
  file_type: string
  file_size?: number
  created_at: string
}

export interface UserMediaResponse {
  data: MediaItem[]
  total: number
  page: number
  page_size: number
  has_more: boolean
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
  is_shared: boolean
  is_following: boolean
  is_pinned: boolean
  pinned_at?: string
}

export interface FeedResponse {
  page_size: number
  next_cursor: string | null
  data: FeedPost[]
}

export type PostStatus = 'public' | 'friend' | 'private' | 'hidden'

export interface CreatePostInput {
  title: string
  content: string
  status: PostStatus
  files?: File[]
  gifUrl?: string
  communityID?: string
}

export interface GifItem {
  id: string
  preview: string
  full: string
  title?: string
  preview_width?: number
  preview_height?: number
}

export interface CreatePostResponse {
  data: FeedPost
}

export interface CommentItem {
  id: string
  user_id: string
  post_id: string
  parent_id?: string
  username: string
  display_name: string
  avatar_uri: string
  content: string
  status: string
  created_at: string
  updated_at?: string
}

export interface CommentListResponse {
  page: number
  page_size: number
  total: number
  data: CommentItem[]
}

export interface CreateCommentResponse {
  message: string
  data: CommentItem[]
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
  cover_uri: string
  username: string
  post_count: number
  friend_count: number
  created_at: string
  bio: string
  location: string
  work: string
  education: string
  website: string
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

// ===== User-facing Community Types =====
export interface CommunityListItem {
  id: string
  name: string
  description: string
  avatar_uri: string
  privacy: 'public' | 'code' | 'invitation_only'
  member_count: number
  created_at: string
}

export interface CommunityListResponse {
  communities: CommunityListItem[]
  total: number
  page: number
  page_size: number
}

export interface CommunityDetailResponse {
  id: string
  name: string
  description: string
  avatar_uri: string
  background_uri: string
  creator_id: string
  creator_name: string
  privacy: 'public' | 'code' | 'invitation_only'
  auto_approve: boolean
  member_count: number
  membership_status: 'none' | 'pending' | 'member' | 'admin' | 'creator'
  user_member_role?: string
  created_at: string
}

export interface CommunityMember {
  user_id: string
  display_name: string
  avatar_uri: string
  role: string
  joined_at: string
  contribution_score: number
  badge_type?: string
}

export interface CommunityRule {
  id: string
  community_id: string
  category: string
  title: string
  content: string
  position: number
  created_at: string
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
  | 'like' | 'comment' | 'follow' | 'message' | 'share'
  | 'friend_request' | 'friend_accepted'
  | 'community_join_request' | 'community_join_approved' | 'community_join_rejected'
  | 'community_role_changed' | 'community_member_left' | 'community_member_kicked'
  | 'community_group_chat_added' | 'community_invite_code_used'
  | 'community_invitation_received' | 'community_invitation_accepted'
  | 'voice_call'
  | 'media_approved' | 'media_rejected' | 'media_flagged'

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

export interface NotificationGroup {
  key: string
  ids: string[]
  count: number
  is_read: boolean
  sender_id?: string
  sender_name?: string
  sender_avatar?: string
  type: NotificationType
  content: string
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

export interface FollowListItem {
  user_id: string
  username: string
  display_name: string
  avatar_uri: string
}

export interface FollowListResponse {
  data: FollowListItem[]
  page: number
  page_size: number
  total: number
  has_more: boolean
}

export interface AdminSettingsResponse {
  settings: Record<string, string>
}

export interface AdminSettingsInput {
  settings: Record<string, string>
}

// ===== User Settings =====
export interface PrivacySettingsResponse {
  discoverable_in_search: boolean
  allow_stranger_messages: boolean
}

export interface UpdatePrivacyInput {
  discoverable_in_search?: boolean
  allow_stranger_messages?: boolean
}

export type ThemeMode = 'light' | 'dark'

export type LanguageCode = 'vi' | 'en'

export interface AppearanceSettingsResponse {
  theme: ThemeMode
  language: LanguageCode
}

export interface UpdateAppearanceInput {
  theme?: ThemeMode
  language?: LanguageCode
}

export interface UserStorageInfo {
  quota_bytes: number
  used_bytes: number
  avail_bytes: number
}

export interface UserSessionDTO {
  id: string
  device_name: string
  ip_address: string
  user_agent: string
  created_at: string
  expires_at: string
  last_active_at: string
  is_current: boolean
}

export interface SessionsResponse {
  data: UserSessionDTO[]
}

export interface MessageResponse {
  message: string
}

// ===== Friends =====
export interface FriendUser {
  user_id: string
  display_name: string
  avatar_uri: string
  status: string
}

export interface FriendListResponse {
  data: FriendUser[]
  page: number
  page_size: number
  total: number
  has_more: boolean
}

export interface FriendSuggestionUser {
  user_id: string
  display_name: string
  avatar_uri: string
  mutual_count: number
  mutual_names?: string[]
  _friendStatus?: 'sent'
}

export interface FriendSuggestionsResponse {
  data: FriendSuggestionUser[]
  page: number
  page_size: number
  total: number
  has_more: boolean
}

export interface FriendRequestItem {
  id: string
  user_id: string
  display_name: string
  avatar_uri: string
  status: string
  created_at: string
  direction: 'sent' | 'received'
}

export interface FriendRequestListResponse {
  sent: FriendRequestItem[]
  received: FriendRequestItem[]
}

export interface FriendActionResponse {
  status: string
  message: string
}

export interface FriendStatusResponse {
  status: 'none' | 'sent' | 'received' | 'accepted' | 'self'
  request_id?: string
}

// ===== Chat / Messages =====
export interface ChatMessage {
  id: string
  chat_id: string
  sender_id: string
  content: string
  emoji_id?: string | null
  media_id?: string | null
  reply_to_message_id?: string | null
  // Optimistic (client-only) — gắn vào temp message để hiện media ngay khi gửi.
  media_uri?: string | null
  media_type?: string | null
  sender_name?: string
  sender_avatar?: string
  type?: string
  is_anonymized: boolean
  anonymous_name?: string | null
  e2e_version?: number
  decrypt_failed?: boolean
  deleted?: boolean
  created_at: string
}

export interface ChatPartner {
  user_id: string
  display_name: string
  avatar_uri: string
}

export interface ChatConversation {
  chat_id: string
  partner: ChatPartner
  last_message?: ChatMessage | null
  is_encrypted?: boolean
  updated_at: string
}

export interface ChatListResponse {
  data: ChatConversation[]
}

export interface CreateDirectChatResponse {
  chat_id: string
  message?: string
}

export interface ChatInviteItem {
  invite_id: string
  requester_id: string
  requester_name?: string
  requester_avatar?: string
  created_at: string
}

export interface ChatInviteResponse {
  invite_id: string
  chat_id?: string
  message: string
}

// ===== Group Chat =====
export interface GroupChatConversation {
  chat_id: string
  name: string
  avatar_uri: string
  member_count: number
  last_message?: ChatMessage | null
  updated_at: string
}

export interface GroupChatListResponse {
  data: GroupChatConversation[]
}

export interface GroupChatMember {
  user_id: string
  display_name: string
  avatar_uri: string
  role: 'CHAT_ADMIN' | 'CHAT_MEMBER'
  is_muted: boolean
  joined_at: string
}

export interface GroupChatSettings {
  chat_id: string
  name: string
  avatar_uri: string
  allow_member_add: boolean
  member_settings: {
    notifications_enabled: boolean
  }
  members: GroupChatMember[]
}

// ===== Group Chat Invite (message type) =====
export type GroupChatInviteStatus = 'pending' | 'accepted' | 'rejected'

export interface GroupChatInviteContent {
  request_id: string
  chat_id: string
  group_name: string
  group_avatar: string
  requester_id: string
  requester_name: string
  status: GroupChatInviteStatus
}

// ===== Search =====
export interface UserSearchResult {
  id: string
  username: string
  display_name: string
  avatar_uri: string
}

export interface PostSearchResult {
  id: string
  title: string
  user_id: string
  username: string
  created_at: string
}

export interface HashtagSearchResult {
  name: string
  post_count: number
}

export interface CommunitySearchResult {
  id: string
  name: string
  avatar_uri: string
  member_count: number
  privacy: string
}

export interface SearchResponse {
  users?: UserSearchResult[]
  posts?: PostSearchResult[]
  hashtags?: HashtagSearchResult[]
  communities?: CommunitySearchResult[]
  message?: string
}

// ===== Chat WebSocket payloads =====
export interface WsChatJoinPayload {
  chat_id: string
}

export interface WsSendMessagePayload {
  chat_id: string
  content: string
  emoji_id?: string | null
  media_id?: string | null
  reply_to_message_id?: string | null
  e2e_version?: number
}

export interface WsTypingPayload {
  chat_id: string
  user_id?: string
  is_typing?: boolean
}

export interface WsDeleteMessagePayload {
  chat_id: string
  message_id: string
  mode: 'all' | 'me'
}

export interface WsSearchMessagePayload {
  chat_id: string
  keyword: string
}

export interface WsMessageDeletedPayload {
  chat_id: string
  message_id: string
  deleted_by: string
  mode: string
}

export interface WsSearchResultPayload {
  chat_id: string
  keyword: string
  messages: ChatMessage[]
}

export interface WsErrorPayload {
  message: string
}

// ===== Stories =====
export interface StoryItem {
  id: string
  user_id: string
  display_name: string
  avatar_uri: string
  media_uri: string
  media_type: 'image' | 'video'
  caption: string
  created_at: string
  expires_at?: string
  has_viewed: boolean
}

export interface StoryFeedItem {
  user: {
    id: string
    display_name: string
    avatar_uri: string
  }
  stories: StoryItem[]
}

// ===== Presence =====
export type PresenceStatus = 'online' | 'offline'

export interface UserPresence {
  user_id: string
  status: PresenceStatus
  last_seen?: string
}

export interface PresenceBatchRequest {
  user_ids: string[]
}

export interface PresenceBatchResponse {
  data: Record<string, UserPresence>
}

// ===== Calls =====
export type CallType = 'voice' | 'video'

export type CallStatus =
  | 'calling'
  | 'ringing'
  | 'connected'
  | 'ended'
  | 'missed'
  | 'rejected'
  | 'busy'
  | 'cancelled'

export interface IceServer {
  urls: string
  username?: string
  credential?: string
}

export interface IceServersResponse {
  ice_servers: IceServer[]
}

export interface CallPeer {
  user_id: string
  display_name: string
  avatar_uri: string
}

export interface CallIncomingPayload {
  call_id: string
  caller_id: string
  call_type: CallType
  timestamp: number
}

export interface CallInitiatedPayload {
  call_id: string
}

export interface CallStatusPayload {
  call_id: string
  status: CallStatus
  caller_id: string
  callee_id: string
  call_type: CallType
  video_enabled_caller: boolean
  video_enabled_callee: boolean
  started_at?: number
  ended_at?: number
  duration?: number
}

export type CallSignalBody =
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice'; candidate: RTCIceCandidateInit }

export interface CallSignalPayload {
  call_id: string
  sender_id?: string
  signal: CallSignalBody
}

export interface CallMutePayload {
  call_id: string
  user_id: string
  muted: boolean
}

export interface CallVideoPayload {
  call_id: string
  user_id: string
  video_enabled: boolean
}

export interface CallMissedPayload {
  call_id: string
  caller_id: string
  timestamp: number
}

export interface CallBusyPayload {
  callee_id: string
}

export interface CallHistoryItem {
  id: string
  other_user: {
    id: string
    display_name: string
    avatar_uri: string
  }
  call_type: CallType
  direction: 'outgoing' | 'incoming'
  status: CallStatus
  is_missed: boolean
  duration: number
  started_at?: number
  ended_at?: number
  created_at: number
}

export interface CallHistoryListResponse {
  data: CallHistoryItem[]
  total: number
  limit: number
  offset: number
}