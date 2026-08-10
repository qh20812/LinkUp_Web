'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from './Feed.module.css'
import { getFeedPosts, reactPost, savePost, getEmojis } from '../api/posts'
import type { FeedPost, EmojiItem } from '../types'
import PostCard from './PostCard'
import PostComposer from './PostComposer'
import PostDetailModal from './PostDetailModal'
import { useTranslation } from '../hooks/useTranslation'
import { useFollowContext } from '../contexts/FollowContext'
import { useToast } from '../contexts/ToastContext'

const PAGE_SIZE = 10

async function ensureLikeEmojiId(): Promise<string | undefined> {
  try {
    const res = await getEmojis()
    const emoji = res.data.find((e: EmojiItem) => e.code === ':like:')
    if (emoji) return emoji.id
  } catch { /* ignore */ }
  return undefined
}

export default function Feed() {
  return (
    <Suspense fallback={null}>
      <FeedContent />
    </Suspense>
  )
}

function FeedContent() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const { followedUserIds, followUser: ctxFollowUser } = useFollowContext()
  const tab = searchParams.get('tab') || 'explore'
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const cursorRef = useRef<string | null>(null)

  const filter = tab === 'following' ? 'following' : undefined

  const prevFollowedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const prev = prevFollowedRef.current
    const curr = followedUserIds
    if (prev === curr) return
    let changed = false
    for (const id of curr) {
      if (!prev.has(id)) { changed = true; break }
    }
    if (!changed) {
      for (const id of prev) {
        if (!curr.has(id)) { changed = true; break }
      }
    }
    if (changed) {
      setPosts((prevPosts) =>
        prevPosts.map((p) => ({
          ...p,
          is_following: curr.has(p.user_id),
        })),
      )
    }
    prevFollowedRef.current = new Set(curr)
  }, [followedUserIds])

  useEffect(() => {
    cursorRef.current = null
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPosts([])
    setInitialLoading(true)
    setError(null)
    setHasMore(true)
  }, [tab])

  const fetchNext = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setError(null)
    const isFirst = cursorRef.current === null
    try {
      const res = await getFeedPosts(cursorRef.current, PAGE_SIZE, filter)
      setPosts((prev) => {
        const list = isFirst ? res.data : [...prev, ...res.data]
        const seen = new Set<string>()
        return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
      })
      cursorRef.current = res.next_cursor
      setHasMore(res.next_cursor !== null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
      setInitialLoading(false)
      loadingRef.current = false
    }
  }, [t, filter, setPosts])

  useEffect(() => {
    fetchNext()
  }, [fetchNext])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursorRef.current !== null && !loadingRef.current) {
          fetchNext()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchNext, posts.length])

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

  const handleSave = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, is_saved: !p.is_saved } : p,
      ),
    )

    try {
      await savePost(postId)
    } catch (e) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, is_saved: !p.is_saved } : p,
        ),
      )
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  const handleComment = (postId: string) => {
    setSelectedPostId(postId)
  }

  const handleShare = (postId: string) => {
    setSelectedPostId(postId)
  }

  const handleFollow = async (userId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.user_id === userId ? { ...p, is_following: true } : p,
      ),
    )
    try {
      await ctxFollowUser(userId)
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.user_id === userId ? { ...p, is_following: false } : p,
        ),
      )
    }
  }

  if (initialLoading) {
    return (
      <div className={styles.container}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.skeleton}>
            <div className={styles.skelHeader}>
              <div className={styles.skelAvatar} />
              <div className={styles.skelLines}>
                <div className={styles.skelLine} style={{ width: '40%' }} />
                <div className={styles.skelLine} style={{ width: '25%' }} />
              </div>
            </div>
            <div className={styles.skelLine} style={{ width: '60%', marginTop: 12 }} />
            <div className={styles.skelLine} style={{ width: '80%' }} />
            <div className={styles.skelMedia} />
          </div>
        ))}
      </div>
    )
  }

  if (error && posts.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>
          <i className="bx bx-error-circle" />
          <p>{error}</p>
          <button className={styles.retryBtn} onClick={() => { cursorRef.current = null; fetchNext() }}>
            {t('common.retry') || 'Thử lại'}
          </button>
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <i className={`bx ${tab === 'following' ? 'bx-user-x' : 'bx-file-blank'}`} />
          <p>{tab === 'following' ? t('feed.emptyFollowing') : t('feed.empty')}</p>
          {tab === 'following' && (
            <Link href="/?tab=explore" className={styles.exploreLink}>
              {t('feed.exploreLink')}
            </Link>
          )}
        </div>
      </div>
    )
  }

  const detailPost = selectedPostId ? posts.find((p) => p.id === selectedPostId) ?? null : null

  return (
    <div className={styles.container}>
      <PostComposer onPosted={(post) => setPosts((prev) => [post, ...prev])} />
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={handleLike}
          onSave={handleSave}
          onComment={handleComment}
          onShare={handleShare}
          onFollow={handleFollow}
          onOpenDetail={setSelectedPostId}
        />
      ))}

      {loading && (
        <div className={styles.loadingMore}>
          <i className="bx bx-loader-circle bx-spin" />
          <span>{t('common.loading')}</span>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className={styles.endMessage}>
          {t('feed.end') || 'Đã xem hết bài viết.'}
        </div>
      )}

      <div ref={sentinelRef} className={styles.sentinel} />

      {detailPost && (
        <PostDetailModal
          key={detailPost.id}
          post={detailPost}
          open
          onClose={() => setSelectedPostId(null)}
          onUpdated={(updated) => setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))}
          onDeleted={(postId) => setPosts((prev) => prev.filter((p) => p.id !== postId))}
        />
      )}
    </div>
  )
}
