import type { NotificationType } from '../types'

interface NotificationTarget {
  type: NotificationType
  redirect_post_id?: string
  redirect_user_id?: string
  redirect_comment_id?: string
}

export function notificationHref(item: NotificationTarget): string | null {
  switch (item.type) {
    case 'like':
    case 'comment':
    case 'share':
      if (item.redirect_post_id) return `/posts/${item.redirect_post_id}`
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
      return '/messages'
    case 'media_approved':
    case 'media_rejected':
    case 'media_flagged':
      if (item.redirect_post_id) return `/posts/${item.redirect_post_id}`
      return '/'
    default:
      return null
  }
}
