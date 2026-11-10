import type { NotificationType } from '../types'

interface NotificationTarget {
  type: NotificationType
  redirect_post_id?: string
  redirect_user_id?: string
  redirect_comment_id?: string
  redirect_community_id?: string
  redirect_ad_id?: string
}

export function notificationHref(item: NotificationTarget): string | null {
  switch (item.type) {
    case 'like':
    case 'comment':
    case 'share':
      if (item.redirect_post_id) return `/posts/${item.redirect_post_id}`
      // Story comment/share không có post — điều hướng về người tương tác.
      if (item.redirect_user_id) return `/profile/${item.redirect_user_id}`
      return null
    case 'story_react':
      if (item.redirect_user_id) return `/profile/${item.redirect_user_id}`
      return null
    case 'follow':
    case 'friend_accepted':
      if (item.redirect_user_id) return `/profile/${item.redirect_user_id}`
      return null
    case 'friend_request':
      return '/friends'
    case 'message':
      if (item.redirect_comment_id) return `/messages?chat_id=${item.redirect_comment_id}`
      if (item.redirect_post_id) return `/posts/${item.redirect_post_id}`
      if (item.redirect_user_id) return `/profile/${item.redirect_user_id}`
      return '/messages'
    case 'message_react':
      // redirect_comment_id mang chat ID (convention của server).
      if (item.redirect_comment_id) return `/messages?chat_id=${item.redirect_comment_id}`
      return '/messages'
    case 'report_submitted':
    case 'report_result':
      if (item.redirect_post_id) return `/posts/${item.redirect_post_id}`
      if (item.redirect_user_id) return `/profile/${item.redirect_user_id}`
      return null
    case 'media_approved':
    case 'media_rejected':
    case 'media_flagged':
      if (item.redirect_post_id) return `/posts/${item.redirect_post_id}`
      return '/'
    case 'community_join_request':
    case 'community_join_approved':
    case 'community_join_rejected':
    case 'community_role_changed':
    case 'community_member_left':
    case 'community_member_kicked':
    case 'community_group_chat_added':
    case 'community_invite_code_used':
    case 'community_invitation_received':
    case 'community_invitation_accepted':
      if (item.redirect_community_id) return `/communities/${item.redirect_community_id}`
      return '/communities'
    case 'moderation':
      if (item.redirect_post_id) return `/posts/${item.redirect_post_id}`
      if (item.redirect_community_id) return `/communities/${item.redirect_community_id}`
      if (item.redirect_ad_id) return `/partner/ads/${item.redirect_ad_id}`
      if (item.redirect_comment_id) return `/messages?chat_id=${item.redirect_comment_id}`
      if (item.redirect_user_id) return `/profile/${item.redirect_user_id}`
      return null
    case 'wallet':
      return '/wallet'
    case 'package':
      return '/partner/packages'
    case 'voice_call':
      return '/messages'
    default:
      return null
  }
}
