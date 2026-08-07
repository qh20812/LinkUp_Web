'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './Saved.module.css'
import { getSavedPosts, reactPost, savePost, getEmojis } from '../../../api/posts'
import type { FeedPost, EmojiItem } from '../../../types'
import PostCard from '../../../components/PostCard'
import PostDetailModal from '../../../components/PostDetailModal'
import { useAuth } from '../../../hooks/useAuth'
import { useTranslation } from '../../../hooks/useTranslation'
import { useFollowContext } from '../../../contexts/FollowContext'
import { useToast } from '../../../contexts/ToastContext'

const PAGE_SIZE = 10

async function ensureLikeEmojiId(): Promise<string | undefined> {
  try {
    const res = await getEmojis()
    const emoji = res.data.find((e: EmojiItem) => e.code === ':like:')
    if (emoji) return emoji.id
  } catch { /* ignore */ }
  return undefined
}

export default function SavedPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const { isAuthenticated, initializing } = useAuth()
  const { followUser: ctxFollowUser } = useFollowContext()

  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const cursorRef = useRef<string | null>(null)

  const fetchNext = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setError(null)
    const isFirst = cursorRef.current === null
    try {
      const res = await getSavedPosts(cursorRef.current, PAGE_SIZE)
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
  }, [t])

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
      prev.map((p) => (p.id === postId ? { ...p, is_saved: false } : p)),
    )

    try {
      const res = await savePost(postId)
      if (res.action === 'removed') {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
      }
    } catch (e) {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, is_saved: true } : p)),
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

  if (initializing) {
    return <div className={styles.page} />
  }

  if (!isAuthenticated) {
    router.push('/login')
    return <div className={styles.page} />
  }

  const detailPost = selectedPostId ? posts.find((p) => p.id === selectedPostId) ?? null : null

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {initialLoading && (
          <>
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
          </>
        )}

        {!initialLoading && error && posts.length === 0 && (
          <div className={styles.errorBox}>
            <i className="bx bx-error-circle" />
            <p>{error}</p>
            <button className={styles.retryBtn} onClick={() => { cursorRef.current = null; fetchNext() }}>
              {t('common.retry') || 'Thử lại'}
            </button>
          </div>
        )}

        {!initialLoading && !error && posts.length === 0 && (
          <div className={styles.empty}>
            <i className="bx bx-bookmark" />
            <p>{t('saved.empty')}</p>
            <p className={styles.emptyDesc}>{t('saved.emptyDesc')}</p>
            <Link href="/" className={styles.exploreLink}>
              {t('feed.exploreLink')}
            </Link>
          </div>
        )}

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
            {t('saved.end')}
          </div>
        )}

        <div ref={sentinelRef} className={styles.sentinel} />

        {detailPost && (
          <PostDetailModal
            key={detailPost.id}
            post={detailPost}
            open
            onClose={() => setSelectedPostId(null)}
            onUpdated={(updated) =>
              setPosts((prev) =>
                updated.is_saved
                  ? prev.map((p) => (p.id === updated.id ? updated : p))
                  : prev.filter((p) => p.id !== updated.id),
              )
            }
            onDeleted={(postId) => setPosts((prev) => prev.filter((p) => p.id !== postId))}
          />
        )}
      </div>
    </div>
  )
}
