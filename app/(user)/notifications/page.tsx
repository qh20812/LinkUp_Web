'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { swrFetcher, invalidate } from '../../../api/swr'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { useAuth } from '../../../hooks/useAuth'
import { useNotification } from '../../../contexts/NotificationContext'
import { notificationHref } from '../../../utils/notificationNavigate'
import { groupNotifications } from '../../../utils/groupNotifications'
import ExternalImage from '../../../components/ExternalImage'
import type {
  NotificationGroup,
  NotificationListResponse,
  NotificationType,
} from '../../../types'
import styles from './Notifications.module.css'

type Filter = 'all' | 'unread' | 'read'

const PAGE_SIZE = 20

const ALLOWED_FILTERS: Filter[] = ['all', 'unread', 'read']

export default function NotificationsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const { isAuthenticated, initializing } = useAuth()
  const {
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotification()

  const searchParams = useSearchParams()
  const filter = ALLOWED_FILTERS.includes(searchParams.get('filter') as Filter)
    ? (searchParams.get('filter') as Filter) : 'all'
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
  })
  if (filter === 'unread') params.set('unreadOnly', 'true')

  const swrKey = `/notifications?${params.toString()}`
  const { data: res, isLoading } = useSWR<NotificationListResponse>(
    swrKey,
    (url: string) => swrFetcher<NotificationListResponse>(url),
  )

  let items: NotificationGroup[] = []
  if (res) {
    const source =
      filter === 'read' ? res.data.filter((n) => n.is_read) : res.data
    items = groupNotifications(source)
  }
  const total =
    filter === 'read'
      ? (res?.data.filter((n) => n.is_read).length ?? 0)
      : (res?.total ?? 0)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleFilterChange = (next: Filter) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('filter', next)
    params.delete('page')
    router.replace(`/notifications?${params.toString()}`)
  }

  const handleItemClick = async (item: NotificationGroup) => {
    if (!item.is_read) {
      try {
        await markAsRead(item)
      } catch {
        /* context already reverts on error */
      }
      invalidate('/notifications')
    }
    const href = notificationHref(item)
    if (href) router.push(href)
  }

  const handleMarkAll = async () => {
    try {
      await markAllAsRead()
      invalidate('/notifications')
      toast({ type: 'success', title: t('notifications.markAllRead') })
    } catch (err) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('notifications.markAllReadError'),
      })
    }
  }

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = []
    pages.push(1)
    const left = Math.max(2, page - 1)
    const right = Math.min(totalPages - 1, page + 1)
    if (left > 2) pages.push('...')
    for (let i = left; i <= right; i++) pages.push(i)
    if (right < totalPages - 1) pages.push('...')
    if (totalPages > 1) pages.push(totalPages)
    return pages
  }

  const formatTime = (dateStr: string): string => {
    const now = new Date()
    const past = new Date(dateStr)
    const diffMs = now.getTime() - past.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return t('notifications.justNow')
    if (diffMins < 60) return t('notifications.minutesAgo').replace('{minutes}', String(diffMins))
    if (diffHours < 24) return t('notifications.hoursAgo').replace('{hours}', String(diffHours))
    return t('notifications.daysAgo').replace('{days}', String(diffDays))
  }

  const getIconClass = (type: NotificationType): string => {
    switch (type) {
      case 'like':
        return 'bx bx-heart ' + styles.iconLike
      case 'comment':
        return 'bx bx-message-dots ' + styles.iconComment
      case 'share':
        return 'bx bx-share-alt ' + styles.iconLike
      case 'follow':
        return 'bx bx-user-plus ' + styles.iconFollow
      case 'message':
        return 'bx bx-envelope ' + styles.iconMessage
      case 'friend_request':
      case 'friend_accepted':
        return 'bx bx-group ' + styles.iconFriend
      case 'voice_call':
        return 'bx bx-phone ' + styles.iconCall
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
        return 'bx bx-world ' + styles.iconCommunity
      case 'media_approved':
        return 'bx bx-check-circle ' + styles.iconFollow
      case 'media_rejected':
        return 'bx bx-x-circle ' + styles.iconCall
      case 'media_flagged':
        return 'bx bx-error ' + styles.iconComment
      default:
        return 'bx bx-bell ' + styles.iconCommunity
    }
  }

  if (initializing) {
    return <div className={styles.page} />
  }

  if (!isAuthenticated) {
    router.push('/login')
    return <div className={styles.page} />
  }

  return (
    <div className={styles.page}>
      <div className={styles.tabs}>
        {(['all', 'unread', 'read'] as Filter[]).map((f) => (
          <button
            key={f}
            className={`${styles.tab} ${filter === f ? styles.tabActive : ''}`}
            onClick={() => handleFilterChange(f)}>
            {f === 'all' && <i className="bx bx-bell" />}
            {f === 'unread' && <i className="bx bx-bell" />}
            {f === 'read' && <i className="bx bx-check-double" />}
            {t(`notifications.filter${f.charAt(0).toUpperCase()}${f.slice(1)}`)}
          </button>
        ))}
        <div className={styles.tabsActions}>
          {unreadCount > 0 && (
            <button className={styles.markAllBtn} onClick={handleMarkAll}>
              <i className="bx bx-envelope-open" />
              {t('notifications.markAllRead')}
            </button>
          )}
          <button
            type="button"
            className={styles.settingsBtn}
            onClick={() => router.push('/settings?tab=notifications')}
            aria-label={t('notifications.preferences')}
            title={t('notifications.preferences')}
          >
            <i className="bx bx-cog" />
          </button>
        </div>
      </div>

      <div className={styles.list}>
        {isLoading && items.length === 0 ? (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.skeletonItem}>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonContent}>
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLineShort} />
                </div>
              </div>
            ))}
          </>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <i className="bx bx-bell-off" />
            <p>{t('notifications.noNotifications')}</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.key}
              className={`${styles.item} ${!item.is_read ? styles.itemUnread : ''}`}
              onClick={() => handleItemClick(item)}>
              <div className={styles.iconWrapper}>
                {item.sender_avatar ? (
                  <ExternalImage src={item.sender_avatar} alt="" className={styles.avatar} />
                ) : (
                  <i className={getIconClass(item.type)} />
                )}
              </div>
              <div className={styles.body}>
                <p className={styles.content}>
                  {item.sender_name && (
                    <strong className={styles.senderName}>{item.sender_name}</strong>
                  )}
                  {item.sender_name ? ' ' + item.content : item.content}
                </p>
                <span className={styles.time}>{formatTime(item.created_at)}</span>
              </div>
              {item.count > 1 && (
                <span className={styles.countBadge}>+{item.count}</span>
              )}
              {!item.is_read && <span className={styles.unreadDot} />}
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => { const params = new URLSearchParams(searchParams.toString()); params.set('page', String(page - 1)); router.replace(`/notifications?${params.toString()}`) }}>
            <i className="bx bx-chevron-left" />
          </button>
          {getPageNumbers().map((p, i) =>
            typeof p === 'string' ? (
              <span key={`e${i}`} className={styles.pageInfo}>
                {p}
              </span>
            ) : (
              <button
                key={p}
                className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                onClick={() => { const params = new URLSearchParams(searchParams.toString()); params.set('page', String(p)); router.replace(`/notifications?${params.toString()}`) }}>
                {p}
              </button>
            ),
          )}
          <button
            className={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => { const params = new URLSearchParams(searchParams.toString()); params.set('page', String(page + 1)); router.replace(`/notifications?${params.toString()}`) }}>
            <i className="bx bx-chevron-right" />
          </button>
        </div>
      )}

      </div>
  )
}
