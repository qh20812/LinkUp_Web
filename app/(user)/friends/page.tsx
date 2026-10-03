'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ExternalImage from '../../../components/ExternalImage'
import styles from './Friends.module.css'
import {
  getFriends,
  getFriendSuggestions,
  getFriendRequests,
  toggleFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  unfriend,
} from '../../../api/friends'
import { createDirectChat } from '../../../api/chats'
import type {
  FriendUser,
  FriendSuggestionUser,
  FriendRequestItem,
} from '../../../types'
import { useAuth } from '../../../hooks/useAuth'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import Modal from '../../../components/Modal'

type MainTab = 'requests' | 'suggestions' | 'list'
type SubTab = 'received' | 'sent'

const INFINITE_SCROLL_SIZE = 20

const MAX_REQUESTS = 100

const VALID_MAIN_TABS: MainTab[] = ['requests', 'suggestions', 'list']
const VALID_SUB_TABS: SubTab[] = ['received', 'sent']

export default function FriendsPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <FriendsContent />
    </Suspense>
  )
}

function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.skeletonItem} aria-hidden>
          <div className={styles.skeletonAvatar} />
          <div className={styles.skeletonContent}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
        </div>
      ))}
    </>
  )
}

function FriendsContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { isAuthenticated, initializing } = useAuth()

  const rawMain = searchParams.get('mainTab')
  const rawSub = searchParams.get('subTab')
  const mainTab: MainTab = VALID_MAIN_TABS.includes(rawMain as MainTab) ? (rawMain as MainTab) : 'requests'
  const subTab: SubTab = VALID_SUB_TABS.includes(rawSub as SubTab) ? (rawSub as SubTab) : 'received'

  const [received, setReceived] = useState<FriendRequestItem[]>([])
  const [sent, setSent] = useState<FriendRequestItem[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const requestsLoadingRef = useRef(false)

  const [suggestions, setSuggestions] = useState<FriendSuggestionUser[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsInitial, setSuggestionsInitial] = useState(true)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  const [suggestionsHasMore, setSuggestionsHasMore] = useState(true)
  const suggestionsPageRef = useRef(0)
  const suggestionsLoadingRef = useRef(false)
  const suggestionsSentinelRef = useRef<HTMLDivElement>(null)

  const [friends, setFriends] = useState<FriendUser[]>([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [friendsInitial, setFriendsInitial] = useState(true)
  const [friendsError, setFriendsError] = useState<string | null>(null)
  const [friendsHasMore, setFriendsHasMore] = useState(true)
  const friendsPageRef = useRef(0)
  const friendsLoadingRef = useRef(false)
  const friendsSentinelRef = useRef<HTMLDivElement>(null)

  const [unfriendTarget, setUnfriendTarget] = useState<FriendUser | null>(null)
  const [unfriending, setUnfriending] = useState(false)

  const [query, setQuery] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    if (requestsLoadingRef.current) return
    requestsLoadingRef.current = true
    setRequestsLoading(true)
    setRequestsError(null)
    try {
      const res = await getFriendRequests()
      setReceived(res.received)
      setSent(res.sent)
    } catch (err) {
      setRequestsError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setRequestsLoading(false)
      requestsLoadingRef.current = false
    }
  }, [t])

  const loadSuggestions = useCallback(async () => {
    if (suggestionsLoadingRef.current) return
    suggestionsLoadingRef.current = true
    setSuggestionsLoading(true)
    setSuggestionsError(null)
    const page = suggestionsPageRef.current + 1
    try {
      const res = await getFriendSuggestions(page, INFINITE_SCROLL_SIZE)
      suggestionsPageRef.current = res.page
      setSuggestions((prev) => {
        const list = page === 1 ? res.data : [...prev, ...res.data]
        const seen = new Set<string>()
        return list.filter((u) => (seen.has(u.user_id) ? false : (seen.add(u.user_id), true)))
      })
      setSuggestionsHasMore(res.has_more)
    } catch (err) {
      setSuggestionsError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSuggestionsLoading(false)
      setSuggestionsInitial(false)
      suggestionsLoadingRef.current = false
    }
  }, [t])

  const loadFriends = useCallback(async () => {
    if (friendsLoadingRef.current) return
    friendsLoadingRef.current = true
    setFriendsLoading(true)
    setFriendsError(null)
    const page = friendsPageRef.current + 1
    try {
      const res = await getFriends(page, INFINITE_SCROLL_SIZE)
      friendsPageRef.current = res.page
      setFriends((prev) => {
        const list = page === 1 ? res.data : [...prev, ...res.data]
        const seen = new Set<string>()
        return list.filter((u) => (seen.has(u.user_id) ? false : (seen.add(u.user_id), true)))
      })
      setFriendsHasMore(res.has_more)
    } catch (err) {
      setFriendsError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setFriendsLoading(false)
      setFriendsInitial(false)
      friendsLoadingRef.current = false
    }
  }, [t])

  useEffect(() => {
    const id = requestAnimationFrame(() => loadRequests())
    return () => cancelAnimationFrame(id)
  }, [loadRequests])

  useEffect(() => {
    if (mainTab === 'suggestions') loadSuggestions()
  }, [mainTab, loadSuggestions])

  useEffect(() => {
    if (mainTab === 'list') loadFriends()
  }, [mainTab, loadFriends])

  useEffect(() => {
    if (mainTab === 'suggestions') {
      const sentinel = suggestionsSentinelRef.current
      if (!sentinel) return
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && suggestionsHasMore && !suggestionsLoadingRef.current) {
            loadSuggestions()
          }
        },
        { rootMargin: '200px' },
      )
      observer.observe(sentinel)
      return () => observer.disconnect()
    }
  }, [mainTab, suggestionsHasMore, loadSuggestions])

  useEffect(() => {
    if (mainTab === 'list') {
      const sentinel = friendsSentinelRef.current
      if (!sentinel) return
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && friendsHasMore && !friendsLoadingRef.current) {
            loadFriends()
          }
        },
        { rootMargin: '200px' },
      )
      observer.observe(sentinel)
      return () => observer.disconnect()
    }
  }, [mainTab, friendsHasMore, loadFriends])

  useEffect(() => {
    if (!openMenuId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openMenuId])

  const [retryRequests, setRetryRequests] = useState(0)
  const [retrySuggestions, setRetrySuggestions] = useState(0)
  const [retryFriends, setRetryFriends] = useState(0)

  useEffect(() => {
    if (retryRequests === 0) return
    const id = requestAnimationFrame(() => loadRequests())
    return () => cancelAnimationFrame(id)
  }, [retryRequests, loadRequests])

  useEffect(() => {
    if (retrySuggestions === 0) return
    const id = requestAnimationFrame(() => {
      suggestionsPageRef.current = 0
      loadSuggestions()
    })
    return () => cancelAnimationFrame(id)
  }, [retrySuggestions, loadSuggestions])

  useEffect(() => {
    if (retryFriends === 0) return
    const id = requestAnimationFrame(() => {
      friendsPageRef.current = 0
      loadFriends()
    })
    return () => cancelAnimationFrame(id)
  }, [retryFriends, loadFriends])

  const runAction = useCallback(
    async (fn: Promise<unknown>, onSuccess: () => void, successMsg: string) => {
      try {
        await fn
        onSuccess()
        toast({ type: 'success', title: successMsg })
      } catch (err) {
        toast({ type: 'error', title: err instanceof Error ? err.message : t('common.error') })
      }
    },
    [t, toast],
  )

  const handleAccept = (item: FriendRequestItem) => {
    runAction(
      acceptFriendRequest(item.id),
      () => {
        setReceived((prev) => prev.filter((r) => r.id !== item.id))
        setSuggestions((prev) => prev.filter((s) => s.user_id !== item.user_id))
      },
      t('friends.acceptDone'),
    )
  }

  const handleReject = (item: FriendRequestItem) => {
    runAction(
      rejectFriendRequest(item.id),
      () => setReceived((prev) => prev.filter((r) => r.id !== item.id)),
      t('friends.rejectDone'),
    )
  }

  const handleRevoke = (item: FriendRequestItem) => {
    runAction(
      toggleFriendRequest(item.user_id),
      () => setSent((prev) => prev.filter((r) => r.id !== item.id)),
      t('friends.revokeDone'),
    )
  }

  const handleAddFriend = (user: FriendSuggestionUser) => {
    runAction(
      toggleFriendRequest(user.user_id),
      () => {
        setSuggestions((prev) =>
          prev.map((s) => (s.user_id === user.user_id ? { ...s, _friendStatus: 'sent' } : s)),
        )
        setSent((prev) => [
          ...prev,
          { id: '', user_id: user.user_id, display_name: user.display_name, avatar_uri: user.avatar_uri, status: 'pending', created_at: '', direction: 'sent' },
        ])
      },
      t('friends.addDone'),
    )
  }

  const handleMessage = async (user: FriendUser) => {
    setOpenMenuId(null)
    try {
      const res = await createDirectChat(user.user_id)
      router.push(`/messages?chat_id=${encodeURIComponent(res.chat_id)}`)
    } catch (err) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('common.error'),
      })
    }
  }

  const handleUnfriend = (user: FriendUser) => {
    setOpenMenuId(null)
    setUnfriendTarget(user)
  }

  const confirmUnfriend = async () => {
    if (!unfriendTarget) return
    setUnfriending(true)
    try {
      await unfriend(unfriendTarget.user_id)
      setFriends((prev) => prev.filter((f) => f.user_id !== unfriendTarget.user_id))
      toast({ type: 'success', title: t('friends.unfriendDone') })
      setUnfriendTarget(null)
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : t('common.error') })
    } finally {
      setUnfriending(false)
    }
  }

  const formatTime = (dateStr: string): string => {
    if (!dateStr) return ''
    const now = new Date()
    const past = new Date(dateStr)
    if (Number.isNaN(past.getTime())) return ''
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

  if (initializing) {
    return <div className={styles.page} />
  }

  if (!isAuthenticated) {
    router.push('/login')
    return <div className={styles.page} />
  }

  const visibleFriends = friends.filter((f) =>
    f.display_name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const renderEmpty = (
    icon: string,
    titleKey: string,
    hintKey: string,
    cta?: { labelKey: string; href: string },
  ) => (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>
        <i className={`bx ${icon}`} aria-hidden />
      </span>
      <p className={styles.emptyTitle}>{t(titleKey)}</p>
      <p className={styles.emptyHint}>{t(hintKey)}</p>
      {cta && (
        <div className={styles.emptyActions}>
          <Link href={cta.href} className={styles.emptyPrimary}>
            {t(cta.labelKey)}
          </Link>
        </div>
      )}
    </div>
  )

  const renderError = (message: string, onRetry: () => void) => (
    <div className={styles.errorBox} role="alert">
      <i className="bx bx-error-circle" aria-hidden />
      <p>{message}</p>
      <button type="button" className={styles.retryBtn} onClick={onRetry}>
        {t('common.retry') || 'Thử lại'}
      </button>
    </div>
  )

  const renderRequests = () => {
    const items = subTab === 'received' ? received : sent
    if (requestsLoading) {
      return (
        <div className={styles.cardList}>
          <SkeletonList />
        </div>
      )
    }
    if (requestsError && items.length === 0) {
      return renderError(requestsError, () => setRetryRequests((c) => c + 1))
    }
    if (items.length === 0) {
      return renderEmpty(
        'bx-user-x',
        subTab === 'received' ? 'friends.emptyReceived' : 'friends.emptySent',
        subTab === 'received' ? 'friends.emptyHintReceived' : 'friends.emptyHintSent',
        subTab === 'received'
          ? { labelKey: 'friends.viewSuggestions', href: '/friends?mainTab=suggestions' }
          : undefined,
      )
    }
    return (
      <div className={styles.cardList}>
        {items.map((item, i) => {
          const time = formatTime(item.created_at)
          return (
            <div
              key={item.id || item.user_id}
              className={`${styles.card} ${styles.cardLink}`}
              style={{ '--index': i } as React.CSSProperties}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/profile/${item.user_id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  router.push(`/profile/${item.user_id}`)
                }
              }}
            >
              <div className={styles.cardAvatar}>
                {item.avatar_uri ? <ExternalImage src={item.avatar_uri} alt="" /> : <i className="bx bxs-user" aria-hidden />}
              </div>
              <div className={styles.cardMeta}>
                <span className={styles.cardName}>{item.display_name}</span>
                {time && <span className={styles.cardSub}>{time}</span>}
              </div>
              <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                {subTab === 'received' ? (
                  <>
                    <button className={styles.primaryBtn} onClick={() => handleAccept(item)}>
                      <i className="bx bx-check" aria-hidden />
                      {t('friends.accept')}
                    </button>
                    <button className={styles.ghostBtn} onClick={() => handleReject(item)}>
                      <i className="bx bx-x" aria-hidden />
                      {t('friends.reject')}
                    </button>
                  </>
                ) : (
                  <button className={styles.ghostBtn} onClick={() => handleRevoke(item)}>
                    <i className="bx bx-undo" aria-hidden />
                    {t('friends.revoke')}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderSuggestions = () => {
    if (suggestionsInitial) {
      return (
        <div className={styles.cardList}>
          <SkeletonList />
        </div>
      )
    }
    if (suggestionsError && suggestions.length === 0) {
      return renderError(suggestionsError, () => setRetrySuggestions((c) => c + 1))
    }
    if (suggestions.length === 0) {
      return renderEmpty(
        'bx-user-plus',
        'friends.emptySuggestions',
        'friends.emptyHintSuggestions',
        { labelKey: 'friends.viewSuggestions', href: '/friends?mainTab=list' },
      )
    }
    return (
      <>
        <div className={styles.cardList}>
          {suggestions.map((user, i) => (
            <div
              key={user.user_id}
              className={`${styles.card} ${styles.cardLink}`}
              style={{ '--index': i % 20 } as React.CSSProperties}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/profile/${user.user_id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  router.push(`/profile/${user.user_id}`)
                }
              }}
            >
              <div className={styles.cardAvatar}>
                {user.avatar_uri ? <ExternalImage src={user.avatar_uri} alt="" /> : <i className="bx bxs-user" aria-hidden />}
              </div>
              <div className={styles.cardMeta}>
                <span className={styles.cardName}>{user.display_name}</span>
                {user.mutual_count > 0 && (
                  <span className={styles.cardSub}>{t('friends.mutual', { count: user.mutual_count })}</span>
                )}
                {user.mutual_names && user.mutual_names.length > 0 && (
                  <span className={styles.cardMutual}>
                    {t('friends.mutualWith', { names: user.mutual_names.join(', ') })}
                    {user.mutual_count > user.mutual_names.length && (
                      <>{' '}{t('friends.mutualMore', { count: user.mutual_count - user.mutual_names.length })}</>
                    )}
                  </span>
                )}
              </div>
              <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                {user._friendStatus === 'sent' ? (
                  <button className={`${styles.primaryBtn} ${styles.btnDisabled}`} disabled>
                    <i className="bx bx-check" aria-hidden />
                    {t('friends.sent')}
                  </button>
                ) : (
                  <button className={styles.primaryBtn} onClick={() => handleAddFriend(user)}>
                    <i className="bx bx-user-plus" aria-hidden />
                    {t('friends.addFriend')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {suggestionsLoading && (
          <div className={styles.cardList}>
            <SkeletonList count={2} />
          </div>
        )}
        {!suggestionsHasMore && suggestions.length > 0 && (
          <div className={styles.endMessage}>{t('friends.end')}</div>
        )}
      </>
    )
  }

  const renderFriends = () => {
    if (friendsInitial) {
      return (
        <div className={styles.cardList}>
          <SkeletonList />
        </div>
      )
    }
    if (friendsError && friends.length === 0) {
      return renderError(friendsError, () => setRetryFriends((c) => c + 1))
    }
    if (friends.length === 0) {
      return renderEmpty(
        'bx-group',
        'friends.emptyList',
        'friends.emptyHintList',
        { labelKey: 'friends.viewSuggestions', href: '/friends?mainTab=suggestions' },
      )
    }
    if (visibleFriends.length === 0) {
      return renderEmpty(
        'bx-search-alt',
        'friends.noSearchResult',
        'friends.noSearchResultHint',
      )
    }
    return (
      <>
        <div className={styles.listMeta}>
          {t('friends.listCount').replace('{count}', String(visibleFriends.length))}
        </div>
        <div className={styles.cardList}>
          {visibleFriends.map((user, i) => (
            <div
              key={user.user_id}
              className={`${styles.card} ${styles.cardLink}`}
              style={{ '--index': i % 20 } as React.CSSProperties}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/profile/${user.user_id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  router.push(`/profile/${user.user_id}`)
                }
              }}
            >
              <div className={styles.cardAvatar}>
                {user.avatar_uri ? <ExternalImage src={user.avatar_uri} alt="" /> : <i className="bx bxs-user" aria-hidden />}
              </div>
              <span className={styles.cardName}>{user.display_name}</span>
              <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                <div className={styles.menuWrap}>
                  <button
                    type="button"
                    className={styles.menuBtn}
                    aria-label={t('common.actions')}
                    aria-expanded={openMenuId === user.user_id}
                    aria-haspopup="menu"
                    onClick={() => setOpenMenuId((prev) => (prev === user.user_id ? null : user.user_id))}>
                    <i className="bx bx-dots-horizontal-rounded" aria-hidden />
                  </button>
                  {openMenuId === user.user_id && (
                    <>
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-hidden
                        className={styles.menuBackdrop}
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className={styles.menu} role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        className={styles.menuItem}
                        onClick={() => { setOpenMenuId(null); router.push(`/profile/${user.user_id}`) }}>
                        <i className="bx bx-user" aria-hidden />
                        {t('sidebar.profile')}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className={styles.menuItem}
                        onClick={() => handleMessage(user)}>
                        <i className="bx bx-message-rounded" aria-hidden />
                        {t('sidebar.messages')}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className={`${styles.menuItem} ${styles.menuDanger}`}
                        onClick={() => handleUnfriend(user)}>
                        <i className="bx bx-user-x" aria-hidden />
                        {t('friends.unfriend')}
                      </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {friendsLoading && (
          <div className={styles.cardList}>
            <SkeletonList count={2} />
          </div>
        )}
        {!friendsHasMore && visibleFriends.length > 0 && (
          <div className={styles.endMessage}>{t('friends.end')}</div>
        )}
      </>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.srOnly}>{t('friends.title')}</h1>
      <div className={styles.toolbar}>
        <div className={styles.segmented} role="tablist" aria-label={t('friends.title')}>
          <Link
            href="/friends"
            role="tab"
            aria-selected={mainTab === 'requests'}
            className={`${styles.segment} ${mainTab === 'requests' ? styles.segmentActive : ''}`}
          >
            <i className="bx bxs-user-detail" aria-hidden />
            {t('friends.tabRequests')}
            {received.length > 0 && <span className={styles.badge}>{Math.min(received.length, MAX_REQUESTS)}</span>}
          </Link>
          <Link
            href="/friends?mainTab=suggestions"
            role="tab"
            aria-selected={mainTab === 'suggestions'}
            className={`${styles.segment} ${mainTab === 'suggestions' ? styles.segmentActive : ''}`}
          >
            <i className="bx bxs-user-plus" aria-hidden />
            {t('friends.tabSuggestions')}
          </Link>
          <Link
            href="/friends?mainTab=list"
            role="tab"
            aria-selected={mainTab === 'list'}
            className={`${styles.segment} ${mainTab === 'list' ? styles.segmentActive : ''}`}
          >
            <i className="bx bxs-group" aria-hidden />
            {t('friends.tabList')}
          </Link>
        </div>
        {mainTab === 'list' && (
          <div className={styles.searchBox}>
            <i className="bx bx-search" aria-hidden />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('friends.searchPlaceholder')}
              aria-label={t('friends.searchPlaceholder')}
              className={styles.searchInput}
            />
            {query && (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => setQuery('')}
                aria-label={t('common.close')}>
                <i className="bx bx-x" aria-hidden />
              </button>
            )}
          </div>
        )}
      </div>

      {mainTab === 'requests' && (
        <div className={styles.chips} role="toolbar" aria-label={t('friends.tabRequests')}>
          <Link
            href="/friends"
            aria-pressed={subTab === 'received'}
            className={`${styles.chip} ${subTab === 'received' ? styles.chipActive : ''}`}
          >
            {t('friends.tabReceived')}
          </Link>
          <Link
            href="/friends?mainTab=requests&subTab=sent"
            aria-pressed={subTab === 'sent'}
            className={`${styles.chip} ${subTab === 'sent' ? styles.chipActive : ''}`}
          >
            {t('friends.tabSent')}
          </Link>
        </div>
      )}

      {mainTab === 'requests' && renderRequests()}
      {mainTab === 'suggestions' && renderSuggestions()}
      {mainTab === 'list' && renderFriends()}
      {mainTab === 'suggestions' && suggestionsHasMore && (
        <div ref={suggestionsSentinelRef} className={styles.sentinel} />
      )}
      {mainTab === 'list' && friendsHasMore && (
        <div ref={friendsSentinelRef} className={styles.sentinel} />
      )}

      <Modal
        open={unfriendTarget !== null}
        onClose={() => setUnfriendTarget(null)}
        title={t('friends.unfriendTitle')}
        footer={
          <>
            <button className={styles.ghostBtn} onClick={() => setUnfriendTarget(null)}>
              {t('common.cancel')}
            </button>
            <button className={styles.dangerBtn} onClick={confirmUnfriend} disabled={unfriending}>
              <i className="bx bx-user-x" />
              {unfriending ? t('common.loading') : t('friends.unfriendConfirm')}
            </button>
          </>
        }
      >
        <div className={styles.confirmBody}>
          <div className={styles.confirmAvatar}>
            {unfriendTarget?.avatar_uri ? (
              <ExternalImage src={unfriendTarget.avatar_uri} alt="" />
            ) : (
              <i className="bx bxs-user" />
            )}
          </div>
          <strong>{unfriendTarget?.display_name}</strong>
          <p>{t('friends.unfriendMessage')}</p>
        </div>
      </Modal>
    </div>
  )
}
