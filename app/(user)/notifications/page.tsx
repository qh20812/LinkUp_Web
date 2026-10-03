'use client'

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWRInfinite from 'swr/infinite'
import { swrFetcher, invalidate } from '../../../api/swr'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { useAuth } from '../../../hooks/useAuth'
import { useNotification } from '../../../contexts/NotificationContext'
import { notificationHref } from '../../../utils/notificationNavigate'
import { groupNotifications } from '../../../utils/groupNotifications'
import ExternalImage from '../../../components/ExternalImage'
import NotificationsForm from '../settings/NotificationsForm'
import type {
  NotificationGroup,
  NotificationItem,
  NotificationListResponse,
  NotificationType,
} from '../../../types'
import styles from './Notifications.module.css'

type Filter = 'all' | 'unread' | 'read'
type Kind =
  | 'all'
  | 'like'
  | 'comment'
  | 'follow'
  | 'friend'
  | 'community'
  | 'message'
  | 'call'
  | 'media'
type TimeBucket = 'today' | 'yesterday' | 'week' | 'older'

const PAGE_SIZE = 20

const ALLOWED_FILTERS: Filter[] = ['all', 'unread', 'read']
const ALLOWED_KINDS: Kind[] = [
  'all',
  'like',
  'comment',
  'follow',
  'friend',
  'community',
  'message',
  'call',
  'media',
]
const BUCKET_ORDER: TimeBucket[] = ['today', 'yesterday', 'week', 'older']

function matchesKind(type: NotificationType, kind: Kind): boolean {
  switch (kind) {
    case 'all':
      return true
    case 'like':
      return type === 'like' || type === 'story_react' || type === 'share'
    case 'comment':
      return type === 'comment'
    case 'follow':
      return type === 'follow'
    case 'friend':
      return type === 'friend_request' || type === 'friend_accepted'
    case 'community':
      return type.startsWith('community_')
    case 'message':
      return type === 'message'
    case 'call':
      return type === 'voice_call'
    case 'media':
      return type.startsWith('media_')
  }
}

function bucketOf(dateStr: string): TimeBucket {
  const past = new Date(dateStr)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfPast = new Date(past.getFullYear(), past.getMonth(), past.getDate())
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfPast.getTime()) / 86400000,
  )
  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays <= 7) return 'week'
  return 'older'
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <NotificationsContent />
    </Suspense>
  )
}

function NotificationsContent() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const { isAuthenticated, initializing } = useAuth()
  const { unreadCount, markAsRead, markAllAsRead } = useNotification()
  const [prefsOpen, setPrefsOpen] = useState(false)
  const prefsRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const searchParams = useSearchParams()
  const filter = ALLOWED_FILTERS.includes(searchParams.get('filter') as Filter)
    ? (searchParams.get('filter') as Filter)
    : 'all'
  const kind = ALLOWED_KINDS.includes(searchParams.get('kind') as Kind)
    ? (searchParams.get('kind') as Kind)
    : 'all'

  const getKey = (
    pageIndex: number,
    prev: NotificationListResponse | null,
  ): string | null => {
    if (prev && prev.data.length < PAGE_SIZE) return null
    const params = new URLSearchParams({
      page: String(pageIndex + 1),
      pageSize: String(PAGE_SIZE),
    })
    if (filter === 'unread') params.set('unreadOnly', 'true')
    return `/notifications?${params.toString()}`
  }

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<NotificationListResponse>(getKey, swrFetcher)

  const pages = useMemo(() => data ?? [], [data])
  const lastPage = pages[pages.length - 1]
  const hasMore = !lastPage || lastPage.data.length === PAGE_SIZE

  const groups: NotificationGroup[] = useMemo(() => {
    const all: NotificationItem[] = pages.flatMap((p) => p.data)
    const source = filter === 'read' ? all.filter((n) => n.is_read) : all
    return groupNotifications(source).filter((g) => matchesKind(g.type, kind))
  }, [pages, filter, kind])

  const sections: { bucket: TimeBucket; items: NotificationGroup[] }[] =
    useMemo(() => {
      const byBucket = new Map<TimeBucket, NotificationGroup[]>()
      for (const g of groups) {
        const b = bucketOf(g.created_at)
        const list = byBucket.get(b)
        if (list) list.push(g)
        else byBucket.set(b, [g])
      }
      return BUCKET_ORDER.filter((b) => byBucket.has(b)).map((b) => ({
        bucket: b,
        items: byBucket.get(b) ?? [],
      }))
    }, [groups])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isValidating) {
          setSize(size + 1)
        }
      },
      { rootMargin: '320px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, isValidating, size, setSize, filter, kind])

  useEffect(() => {
    if (!prefsOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (prefsRef.current && !prefsRef.current.contains(e.target as Node)) {
        setPrefsOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPrefsOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [prefsOpen])

  const updateParams = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(next)) {
      if (v === null) params.delete(k)
      else params.set(k, v)
    }
    router.replace(`/notifications?${params.toString()}`, { scroll: false })
  }

  const handleItemClick = async (item: NotificationGroup) => {
    if (!item.is_read) {
      try {
        await markAsRead(item)
      } catch {
        /* context already reverts on error */
      }
      mutate(
        (pages) =>
          pages?.map((p) => ({
            ...p,
            data: p.data.map((n) =>
              item.ids.includes(n.id) ? { ...n, is_read: true } : n,
            ),
          })),
        false,
      )
      invalidate('/notifications')
    }
    const href = notificationHref(item)
    if (href) router.push(href)
  }

  const handleMarkOne = async (
    e: React.MouseEvent,
    item: NotificationGroup,
  ) => {
    e.stopPropagation()
    try {
      await markAsRead(item)
      toast({ type: 'success', title: t('notifications.markRead') })
    } catch (err) {
      toast({
        type: 'error',
        title:
          err instanceof Error ? err.message : t('notifications.markReadError'),
      })
      return
    }
    mutate(
      (pages) =>
        pages?.map((p) => ({
          ...p,
          data: p.data.map((n) =>
            item.ids.includes(n.id) ? { ...n, is_read: true } : n,
          ),
        })),
      false,
    )
    invalidate('/notifications')
  }

  const handleMarkAll = async () => {
    try {
      await markAllAsRead()
      mutate(
        (pages) =>
          pages?.map((p) => ({
            ...p,
            data: p.data.map((n) => ({ ...n, is_read: true })),
          })),
        false,
      )
      invalidate('/notifications')
      toast({ type: 'success', title: t('notifications.markAllRead') })
    } catch (err) {
      toast({
        type: 'error',
        title:
          err instanceof Error ? err.message : t('notifications.markAllReadError'),
      })
    }
  }

  const formatTime = (dateStr: string): string => {
    const now = new Date()
    const past = new Date(dateStr)
    const diffMs = now.getTime() - past.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return t('notifications.justNow')
    if (diffMins < 60)
      return t('notifications.minutesAgo').replace('{minutes}', String(diffMins))
    if (diffHours < 24)
      return t('notifications.hoursAgo').replace('{hours}', String(diffHours))
    return t('notifications.daysAgo').replace('{days}', String(diffDays))
  }

  const getIconName = (type: NotificationType): string => {
    switch (type) {
      case 'like':
      case 'story_react':
        return 'bx bx-heart'
      case 'comment':
        return 'bx bx-message-dots'
      case 'share':
        return 'bx bx-share-alt'
      case 'follow':
        return 'bx bx-user-plus'
      case 'message':
        return 'bx bx-envelope'
      case 'friend_request':
      case 'friend_accepted':
        return 'bx bx-group'
      case 'voice_call':
        return 'bx bx-phone'
      case 'media_approved':
        return 'bx bx-check-circle'
      case 'media_rejected':
        return 'bx bx-x-circle'
      case 'media_flagged':
        return 'bx bx-error'
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
        return 'bx bx-world'
      default:
        return 'bx bx-bell'
    }
  }

  const getIconColorClass = (type: NotificationType): string => {
    switch (type) {
      case 'like':
      case 'story_react':
      case 'share':
        return styles.iconLike
      case 'comment':
        return styles.iconComment
      case 'follow':
      case 'friend_request':
      case 'friend_accepted':
        return styles.iconFollow
      case 'message':
        return styles.iconMessage
      case 'voice_call':
        return styles.iconCall
      case 'media_approved':
        return styles.iconApproved
      case 'media_rejected':
        return styles.iconDanger
      case 'media_flagged':
        return styles.iconFlagged
      default:
        return styles.iconCommunity
    }
  }

  const getTypeLabel = (type: NotificationType): string => {
    switch (type) {
      case 'share':
        return t('notifications.typeLabel_share')
      case 'story_react':
        return t('notifications.typeLabel_story_react')
      case 'like':
        return t('notifications.typeLabel_like')
      case 'comment':
        return t('notifications.typeLabel_comment')
      case 'follow':
        return t('notifications.typeLabel_follow')
      case 'message':
        return t('notifications.typeLabel_message')
      case 'friend_request':
        return t('notifications.typeLabel_friend_request')
      case 'friend_accepted':
        return t('notifications.typeLabel_friend_accepted')
      case 'voice_call':
        return t('notifications.typeLabel_voice_call')
      default:
        if (type.startsWith('community_'))
          return t('notifications.typeLabel_community')
        if (type.startsWith('media_')) return t('notifications.typeLabel_media')
        return type
    }
  }

  if (initializing) {
    return <div className={styles.page} />
  }

  if (!isAuthenticated) {
    router.push('/login')
    return <div className={styles.page} />
  }

  const showInitialSkeleton = isLoading && groups.length === 0
  const showError = error && groups.length === 0

  return (
    <div className={styles.page}>
      <h1 className={styles.srOnly}>{t('notifications.title')}</h1>
      <div className={styles.toolbar}>
        <div className={styles.segmented} role="tablist" aria-label={t('notifications.title')}>
          {(['all', 'unread', 'read'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={`${styles.segment} ${filter === f ? styles.segmentActive : ''}`}
              onClick={() => updateParams({ filter: f })}>
              {f === 'read' ? (
                <i className="bx bx-check-double" aria-hidden />
              ) : (
                <i className="bx bx-bell" aria-hidden />
              )}
              {t(`notifications.filter${f.charAt(0).toUpperCase()}${f.slice(1)}`)}
              {f === 'unread' && unreadCount > 0 && (
                <span className={styles.segmentCount}>{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className={styles.headerActions}>
          {unreadCount > 0 && (
            <button
              type="button"
              className={styles.markAllBtn}
              onClick={handleMarkAll}>
              <i className="bx bx-envelope-open" aria-hidden />
              {t('notifications.markAllRead')}
            </button>
          )}
          <div className={styles.prefsWrap} ref={prefsRef}>
            <button
              type="button"
              className={styles.settingsBtn}
              onClick={() => setPrefsOpen((v) => !v)}
              aria-label={t('notifications.preferences')}
              aria-expanded={prefsOpen}
              aria-haspopup="dialog"
              title={t('notifications.preferences')}>
              <i className="bx bx-cog" aria-hidden />
            </button>
            {prefsOpen && (
              <div
                className={styles.prefsPanel}
                role="dialog"
                aria-label={t('notifications.preferences')}>
                <div className={styles.prefsHeader}>
                  <span className={styles.prefsTitle}>
                    {t('notifications.preferences')}
                  </span>
                  <button
                    type="button"
                    className={styles.prefsClose}
                    onClick={() => setPrefsOpen(false)}
                    aria-label={t('notifications.prefsClose')}>
                    <i className="bx bx-x" aria-hidden />
                  </button>
                </div>
                <div className={styles.prefsBody}>
                  <NotificationsForm />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.chips} role="toolbar" aria-label={t('notifications.typeAll')}>
        {ALLOWED_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            className={`${styles.chip} ${kind === k ? styles.chipActive : ''}`}
            onClick={() => updateParams({ kind: k === 'all' ? null : k })}>
            {t(`notifications.type${k.charAt(0).toUpperCase()}${k.slice(1)}`)}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {showInitialSkeleton ? (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.skeletonItem} aria-hidden>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonContent}>
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLineShort} />
                </div>
              </div>
            ))}
          </>
        ) : showError ? (
          <div className={styles.errorBox} role="alert">
            <i className="bx bx-error-circle" aria-hidden />
            <p>{t('notifications.loadError')}</p>
            <button
              type="button"
              className={styles.retryBtn}
              onClick={() => mutate()}>
              {t('notifications.retryBtn')}
            </button>
          </div>
        ) : groups.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <i className="bx bx-bell" aria-hidden />
            </span>
            <p className={styles.emptyTitle}>{t('notifications.noNotifications')}</p>
            <p className={styles.emptyHint}>{t('notifications.emptyHint')}</p>
            <div className={styles.emptyActions}>
              <button
                type="button"
                className={styles.emptyPrimary}
                onClick={() => router.push('/friends')}>
                {t('notifications.exploreFriends')}
              </button>
              <button
                type="button"
                className={styles.emptyGhost}
                onClick={() => setPrefsOpen(true)}>
                {t('notifications.preferences')}
              </button>
            </div>
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.bucket} aria-label={t(`notifications.group${section.bucket.charAt(0).toUpperCase()}${section.bucket.slice(1)}`)}>
              <div className={styles.separator} aria-hidden>
                <span>
                  {t(
                    `notifications.group${section.bucket.charAt(0).toUpperCase()}${section.bucket.slice(1)}`,
                  )}
                </span>
              </div>
              {section.items.map((item, i) => {
                const time = formatTime(item.created_at)
                const label = `${item.sender_name ? `${item.sender_name} ` : ''}${item.content}, ${time}`
                return (
                  <article
                    key={item.key}
                    role="button"
                    tabIndex={0}
                    aria-label={label}
                    className={`${styles.card} ${!item.is_read ? styles.cardUnread : ''}`}
                    style={{ '--index': i } as React.CSSProperties}
                    onClick={() => handleItemClick(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleItemClick(item)
                      }
                    }}>
                    <div className={styles.avatarWrap}>
                      {item.sender_avatar ? (
                        <ExternalImage
                          src={item.sender_avatar}
                          alt=""
                          className={styles.avatar}
                        />
                      ) : (
                        <span
                          className={`${styles.iconChip} ${getIconColorClass(item.type)}`}>
                          <i className={getIconName(item.type)} aria-hidden />
                        </span>
                      )}
                      {item.sender_avatar && (
                        <span
                          className={`${styles.typeBadge} ${getIconColorClass(item.type)}`}
                          aria-hidden>
                          <i className={getIconName(item.type)} />
                        </span>
                      )}
                    </div>
                    <div className={styles.body}>
                      <p className={styles.content}>
                        {item.sender_name && (
                          <strong className={styles.senderName}>
                            {item.sender_name}
                          </strong>
                        )}
                        {item.sender_name ? ` ${item.content}` : item.content}
                      </p>
                      <span className={styles.meta}>
                        {time} · {getTypeLabel(item.type)}
                        {item.count > 1 && (
                          <>
                            {' · '}
                            {t('notifications.andOthers').replace(
                              '{count}',
                              String(item.count),
                            )}
                          </>
                        )}
                      </span>
                    </div>
                    <div className={styles.side}>
                      {!item.is_read && (
                        <span className={styles.unreadDot} aria-hidden />
                      )}
                      {!item.is_read && (
                        <button
                          type="button"
                          className={styles.markOne}
                          aria-label={t('notifications.markRead')}
                          title={t('notifications.markRead')}
                          onClick={(e) => handleMarkOne(e, item)}>
                          <i className="bx bx-check" aria-hidden />
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </section>
          ))
        )}
      </div>

      {!showInitialSkeleton && !showError && groups.length > 0 && (
        <div className={styles.more} ref={sentinelRef} aria-live="polite">
          {isValidating ? (
            <span className={styles.moreText}>
              {t('notifications.loadingMore')}
            </span>
          ) : hasMore ? (
            <button
              type="button"
              className={styles.loadMoreBtn}
              onClick={() => setSize(size + 1)}>
              {t('notifications.loadMore')}
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
