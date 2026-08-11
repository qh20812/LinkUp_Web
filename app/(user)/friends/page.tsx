'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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

export default function FriendsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, initializing } = useAuth()

  const [mainTab, setMainTab] = useState<MainTab>('requests')
  const [subTab, setSubTab] = useState<SubTab>('received')

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
    if (mainTab !== 'requests') return
    const id = requestAnimationFrame(() => loadRequests())
    return () => cancelAnimationFrame(id)
  }, [mainTab, loadRequests])

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

  const handleUnfriend = (user: FriendUser) => {
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

  if (initializing) {
    return <div className={styles.page} />
  }

  if (!isAuthenticated) {
    router.push('/login')
    return <div className={styles.page} />
  }

  const renderRequests = () => {
    const items = subTab === 'received' ? received : sent
    if (requestsLoading) {
      return (
        <div className={styles.center}>
          <i className="bx bx-loader-circle bx-spin" />
          <span>{t('common.loading')}</span>
        </div>
      )
    }
    if (requestsError && items.length === 0) {
      return (
        <div className={styles.empty}>
          <i className="bx bx-error-circle" />
          <p>{requestsError}</p>
          <button className={styles.retryBtn} onClick={loadRequests}>
            {t('common.retry') || 'Thử lại'}
          </button>
        </div>
      )
    }
    if (items.length === 0) {
      return (
        <div className={styles.empty}>
          <i className="bx bx-user-x" />
          <p>{subTab === 'received' ? t('friends.emptyReceived') : t('friends.emptySent')}</p>
        </div>
      )
    }
    return (
      <div className={styles.cardList}>
        {items.map((item) => (
          <div key={item.id} className={styles.card}>
            <div className={styles.cardAvatar}>
              {item.avatar_uri ? <ExternalImage src={item.avatar_uri} alt="" /> : <i className="bx bxs-user" />}
            </div>
            <span className={styles.cardName}>{item.display_name}</span>
            {subTab === 'received' ? (
              <div className={styles.cardActions}>
                <button className={styles.primaryBtn} onClick={() => handleAccept(item)}>
                  <i className="bx bx-check" />
                  {t('friends.accept')}
                </button>
                <button className={styles.ghostBtn} onClick={() => handleReject(item)}>
                  <i className="bx bx-x" />
                  {t('friends.reject')}
                </button>
              </div>
            ) : (
              <div className={styles.cardActions}>
                <button className={styles.ghostBtn} onClick={() => handleRevoke(item)}>
                  <i className="bx bx-undo" />
                  {t('friends.revoke')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderSuggestions = () => {
    if (suggestionsInitial) {
      return (
        <div className={styles.center}>
          <i className="bx bx-loader-circle bx-spin" />
          <span>{t('common.loading')}</span>
        </div>
      )
    }
    if (suggestionsError && suggestions.length === 0) {
      return (
        <div className={styles.empty}>
          <i className="bx bx-error-circle" />
          <p>{suggestionsError}</p>
          <button className={styles.retryBtn} onClick={() => { suggestionsPageRef.current = 0; loadSuggestions() }}>
            {t('common.retry') || 'Thử lại'}
          </button>
        </div>
      )
    }
    if (suggestions.length === 0) {
      return (
        <div className={styles.empty}>
          <i className="bx bx-user-plus" />
          <p>{t('friends.emptySuggestions')}</p>
        </div>
      )
    }
    return (
      <>
        <div className={styles.cardList}>
          {suggestions.map((user) => (
            <div key={user.user_id} className={styles.card}>
              <div className={styles.cardAvatar}>
                {user.avatar_uri ? <ExternalImage src={user.avatar_uri} alt="" /> : <i className="bx bxs-user" />}
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
              {user._friendStatus === 'sent' ? (
                <button className={`${styles.primaryBtn} ${styles.btnDisabled}`} disabled>
                  <i className="bx bx-check" />
                  {t('friends.sent')}
                </button>
              ) : (
                <button className={styles.primaryBtn} onClick={() => handleAddFriend(user)}>
                  <i className="bx bx-user-plus" />
                  {t('friends.addFriend')}
                </button>
              )}
            </div>
          ))}
        </div>
        {suggestionsLoading && (
          <div className={styles.loadingMore}>
            <i className="bx bx-loader-circle bx-spin" />
            <span>{t('common.loading')}</span>
          </div>
        )}
        {!suggestionsHasMore && suggestions.length > 0 && (
          <div className={styles.endMessage}>{t('friends.end')}</div>
        )}
        <div ref={suggestionsSentinelRef} className={styles.sentinel} />
      </>
    )
  }

  const renderFriends = () => {
    if (friendsInitial) {
      return (
        <div className={styles.center}>
          <i className="bx bx-loader-circle bx-spin" />
          <span>{t('common.loading')}</span>
        </div>
      )
    }
    if (friendsError && friends.length === 0) {
      return (
        <div className={styles.empty}>
          <i className="bx bx-error-circle" />
          <p>{friendsError}</p>
          <button className={styles.retryBtn} onClick={() => { friendsPageRef.current = 0; loadFriends() }}>
            {t('common.retry') || 'Thử lại'}
          </button>
        </div>
      )
    }
    if (friends.length === 0) {
      return (
        <div className={styles.empty}>
          <i className="bx bx-group" />
          <p>{t('friends.emptyList')}</p>
        </div>
      )
    }
    return (
      <>
        <div className={styles.cardList}>
          {friends.map((user) => (
            <div key={user.user_id} className={styles.card}>
              <div className={styles.cardAvatar}>
                {user.avatar_uri ? <ExternalImage src={user.avatar_uri} alt="" /> : <i className="bx bxs-user" />}
              </div>
              <span className={styles.cardName}>{user.display_name}</span>
              <div className={styles.cardActions}>
                <button className={styles.dangerBtn} onClick={() => handleUnfriend(user)}>
                  <i className="bx bx-user-x" />
                  {t('friends.unfriend')}
                </button>
              </div>
            </div>
          ))}
        </div>
        {friendsLoading && (
          <div className={styles.loadingMore}>
            <i className="bx bx-loader-circle bx-spin" />
            <span>{t('common.loading')}</span>
          </div>
        )}
        {!friendsHasMore && friends.length > 0 && (
          <div className={styles.endMessage}>{t('friends.end')}</div>
        )}
        <div ref={friendsSentinelRef} className={styles.sentinel} />
      </>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${mainTab === 'requests' ? styles.tabActive : ''}`}
          onClick={() => setMainTab('requests')}
        >
          <i className="bx bxs-user-detail" />
          {t('friends.tabRequests')}
          {received.length > 0 && <span className={styles.badge}>{Math.min(received.length, MAX_REQUESTS)}</span>}
        </button>
        <button
          className={`${styles.tab} ${mainTab === 'suggestions' ? styles.tabActive : ''}`}
          onClick={() => setMainTab('suggestions')}
        >
          <i className="bx bxs-user-plus" />
          {t('friends.tabSuggestions')}
        </button>
        <button
          className={`${styles.tab} ${mainTab === 'list' ? styles.tabActive : ''}`}
          onClick={() => setMainTab('list')}
        >
          <i className="bx bxs-group" />
          {t('friends.tabList')}
        </button>
      </div>

      {mainTab === 'requests' && (
        <>
          <div className={styles.subTabs}>
            <button
              className={`${styles.subTab} ${subTab === 'received' ? styles.subTabActive : ''}`}
              onClick={() => setSubTab('received')}
            >
              {t('friends.tabReceived')}
            </button>
            <button
              className={`${styles.subTab} ${subTab === 'sent' ? styles.subTabActive : ''}`}
              onClick={() => setSubTab('sent')}
            >
              {t('friends.tabSent')}
            </button>
          </div>
          {renderRequests()}
        </>
      )}

      {mainTab === 'suggestions' && renderSuggestions()}
      {mainTab === 'list' && renderFriends()}

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