import type { NotificationItem } from '../types'

export function notificationHref(item: NotificationItem): string | null {
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
    default:
      return null
  }
}
