'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getProfileByUserID } from '../../../../api/profile'
import { getFollowStats, followUser } from '../../../../api/follow'
import { getUserPosts, reactPost, savePost, getEmojis } from '../../../../api/posts'
import { startDirectChat, createChatInvite } from '../../../../api/chats'
import { getTokenPayload } from '../../../../api/auth'
import { useTranslation } from '../../../../hooks/useTranslation'
import { useFollowContext } from '../../../../contexts/FollowContext'
import type { ViewProfileResponse, FeedPost, EmojiItem } from '../../../../types'
import ExternalImage from '../../../../components/ExternalImage'
import PostCard from '../../../../components/PostCard'
import PostDetailModal from '../../../../components/PostDetailModal'
import styles from './ProfilePage.module.css'

const PAGE_SIZE = 10

interface FollowStats {
  follower_count: number
  following_count: number
  is_following?: boolean
}

async function ensureLikeEmojiId(): Promise<string | undefined> {
  try {
    const res = await getEmojis()
    const emoji = res.data.find((e: EmojiItem) => e.code === ':like:')
    if (emoji) return emoji.id
  } catch { /* ignore */ }
  return undefined
}

export default function ProfilePage() {
  const params = useParams<{ userID: string }>()
  const userID = params?.userID
  if (!userID) return <div className={styles.center} />
  return <ProfileView key={userID} userID={userID} />
}

function ProfileView({ userID }: { userID: string }) {
  const { t } = useTranslation()
  const router = useRouter()
  const { followUser: ctxFollowUser } = useFollowContext()
  const [profile, setProfile] = useState<ViewProfileResponse | null>(null)
  const [stats, setStats] = useState<FollowStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [following, setFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [messageBusy, setMessageBusy] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [currentUserID, setCurrentUserID] = useState<string | null>(null)

  const [posts, setPosts] = useState<FeedPost[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsError, setPostsError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const cursorRef = useRef<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUserID(getTokenPayload()?.user_id ?? null)
  }, [])

  useEffect(() => {
    let cancelled = false
    getProfileByUserID(userID)
      .then((p) => {
        if (!cancelled) setProfile(p)
      })
      .catch((err) => {
        if (cancelled) return
        const msg = err?.message ?? ''
        if (msg.includes('PRIVATE_PROFILE') || msg.includes('403')) {
          setError(t('profile.private'))
        } else {
          setError(t('profile.errorLoad'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userID, t])

  useEffect(() => {
    let cancelled = false
    getFollowStats(userID)
      .then((s) => {
        if (cancelled) return
        setStats(s)
        setFollowing(!!s.is_following)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [userID])

  const fetchNextPosts = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setPostsLoading(true)
    setPostsError(null)
    const isFirst = cursorRef.current === null
    try {
      const res = await getUserPosts(userID, cursorRef.current, PAGE_SIZE)
      setPosts((prev) => {
        const list = isFirst ? res.data : [...prev, ...res.data]
        const seen = new Set<string>()
        return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
      })
      cursorRef.current = res.next_cursor
      setHasMore(res.next_cursor !== null)
    } catch (err) {
      setPostsError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setPostsLoading(false)
      loadingRef.current = false
    }
  }, [userID, t])

  useEffect(() => {
    fetchNextPosts()
  }, [fetchNextPosts])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursorRef.current !== null && !loadingRef.current) {
          fetchNextPosts()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchNextPosts, posts.length])

  const isSelf = currentUserID != null && currentUserID === userID
  const isPrivate = !!profile?.is_private_profile && !isSelf

  const handleFollow = async () => {
    if (!userID || followBusy) return
    setFollowBusy(true)
    try {
      await followUser(userID)
      setFollowing((v) => !v)
      setStats((s) =>
        s
          ? {
              ...s,
              follower_count: Math.max(0, s.follower_count + (following ? -1 : 1)),
            }
          : s,
      )
    } catch {
      /* ignore */
    } finally {
      setFollowBusy(false)
    }
  }

  const handleLike = async (postId: string) => {
    const emojiId = await ensureLikeEmojiId()
    if (!emojiId) return
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
          : p,
      ),
    )
    try {
      await reactPost(postId, emojiId)
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
            : p,
        ),
      )
    }
  }

  const handleSavePost = async (postId: string) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_saved: false } : p)))
    try {
      const res = await savePost(postId)
      if (res.action === 'removed') {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
      }
    } catch {
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_saved: true } : p)))
    }
  }

  const handlePostFollow = async (userId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.user_id === userId ? { ...p, is_following: true } : p)),
    )
    try {
      await ctxFollowUser(userId)
    } catch {
      setPosts((prev) =>
        prev.map((p) => (p.user_id === userId ? { ...p, is_following: false } : p)),
      )
    }
  }

  const handleMessage = async () => {
    if (!userID || messageBusy || inviteSent) return
    setMessageBusy(true)
    try {
      const res = await startDirectChat(userID)
      if ('needInvite' in res) {
        // Người lạ chưa cho phép nhắn tin → gửi lời mời chat, chờ chấp nhận.
        await createChatInvite(userID)
        setInviteSent(true)
        return
      }
      router.push(`/messages?chat_id=${res.chatId}`)
    } catch {
      /* giữ nguyên trạng thái nút */
    } finally {
      setMessageBusy(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={`${styles.skeletonAvatar}`} />
          <div className={styles.skeletonCardBody}>
            <div className={`${styles.skeletonLine} ${styles.skeletonLineWide}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonLineMedium}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className={styles.center}>
        <i className="bx bx-user-x" />
        <p>{error ?? t('profile.notFound')}</p>
        <Link href="/" className={styles.backBtn}>
          {t('common.back')}
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.avatarWrap}>
          {profile.avatar_uri ? (
            <ExternalImage src={profile.avatar_uri} alt="" className={styles.avatar} />
          ) : (
            <i className="bx bxs-user" />
          )}
        </div>
        <div className={styles.info}>
          <h2 className={styles.name}>{profile.display_name}</h2>
          {isPrivate ? (
            <span className={styles.privateLabel}>
              <i className="bx bx-lock-alt" /> {t('profile.private')}
            </span>
          ) : profile.bio && <p className={styles.bio}>{profile.bio}</p>}

          <div className={styles.stats}>
            <span>
              <strong>{stats?.follower_count ?? 0}</strong> {t('profile.followers')}
            </span>
            <span>
              <strong>{stats?.following_count ?? 0}</strong> {t('profile.following')}
            </span>
          </div>
        </div>

        {isSelf ? (
          <Link href="/settings" className={styles.actionBtn}>
            <i className="bx bx-cog" />
            {t('nav.settings')}
          </Link>
        ) : currentUserID && !isPrivate ? (
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.actionBtn} ${
                inviteSent || messageBusy ? styles.actionBtnDisabled : ''
              }`}
              onClick={handleMessage}
              disabled={messageBusy || inviteSent}
            >
              {inviteSent ? (
                <i className="bx bx-time-five" />
              ) : (
                <i className="bx bx-message-rounded" />
              )}
              {inviteSent ? t('profile.inviteSent') : t('profile.message')}
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnSecondary} ${
                following ? styles.actionBtnActive : ''
              }`}
              onClick={handleFollow}
              disabled={followBusy}
            >
              {following ? <i className="bx bx-user-check" /> : <i className="bx bx-user-plus" />}
              {following ? t('profile.unfollow') : t('profile.follow')}
            </button>
          </div>
        ) : null}
      </div>

      <div className={styles.postsSection}>
        <h2 className={styles.postsSectionTitle}>{t('profile.myPosts')}</h2>
        <div className={styles.postsList}>
          {!postsLoading && postsError && posts.length === 0 && (
            <div className={styles.loadingWrap}>
              <p>{postsError}</p>
            </div>
          )}

          {!postsLoading && !postsError && posts.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}><i className="bx bx-file" /></span>
              <p className={styles.emptyText}>{t('profile.noPosts')}</p>
            </div>
          )}

          {posts.map((post) => (
            <div key={post.id} className={styles.postItem}>
              <PostCard
                post={post}
                onLike={handleLike}
                onSave={handleSavePost}
                onComment={(id) => setSelectedPostId(id)}
                onShare={(id) => setSelectedPostId(id)}
                onFollow={isSelf ? undefined : handlePostFollow}
                onOpenDetail={setSelectedPostId}
              />
            </div>
          ))}

          {postsLoading && (
            <div className={styles.loadingWrap}>
              <div className={styles.loadingSpinner} />
              <span>{t('profile.loadingPosts')}</span>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className={styles.loadingWrap}>
              <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
            </div>
          )}

          <div ref={sentinelRef} />
        </div>
      </div>

      {selectedPostId && (() => {
        const detailPost = posts.find((p) => p.id === selectedPostId)
        return detailPost ? (
          <PostDetailModal
            key={detailPost.id}
            post={detailPost}
            open
            onClose={() => setSelectedPostId(null)}
            onUpdated={(updated) =>
              setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
            }
            onDeleted={(postId) => setPosts((prev) => prev.filter((p) => p.id !== postId))}
          />
        ) : null
      })()}
    </div>
  )
}
