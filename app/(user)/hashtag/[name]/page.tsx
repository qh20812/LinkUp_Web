'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import styles from './HashtagPage.module.css'
import {
  getPostsByHashtag,
  reactPost,
  savePost,
  getEmojis,
} from '../../../../api/posts'
import type { FeedPost, EmojiItem } from '../../../../types'
import PostCard from '../../../../components/PostCard'
import PostDetailModal from '../../../../components/PostDetailModal'
import { useTranslation } from '../../../../hooks/useTranslation'
import { useFollowContext } from '../../../../contexts/FollowContext'
import { useToast } from '../../../../contexts/ToastContext'
import { toErrorMessage } from '../../../../utils/errorMessage'

const PAGE_SIZE = 10

async function ensureLikeEmojiId(): Promise<string | undefined> {
  try {
    const res = await getEmojis()
    const emoji = res.data.find((e: EmojiItem) => e.code === ':like:')
    if (emoji) return emoji.id
  } catch { /* ignore */ }
  return undefined
}

export default function HashtagPage() {
  const params = useParams<{ name: string }>()
  const rawName = params?.name ?? ''
  const name = decodeURIComponent(rawName)

  const { t } = useTranslation()
  const { toast } = useToast()
  const { followUser: ctxFollowUser } = useFollowContext()

  const [posts, setPosts] = useState<FeedPost[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [sharePostId, setSharePostId] = useState<string | null>(null)
  const loadingRef = useRef(false)

  const fetchPage = useCallback(async (pageNum: number, tag: string) => {
    if (loadingRef.current) return
    loadingRef.current = true
    if (pageNum > 1) setLoadingMore(true)
    setError(null)
    try {
      const res = await getPostsByHashtag(tag, pageNum, PAGE_SIZE)
      setPosts((prev) => {
        const list = pageNum === 1 ? res.data : [...prev, ...res.data]
        const seen = new Set<string>()
        return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
      })
      setPage(pageNum)
      setHasMore(res.data.length >= PAGE_SIZE)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('hashtag.error'))
    } finally {
      setInitialLoading(false)
      setLoadingMore(false)
      loadingRef.current = false
    }
  }, [t])

  useEffect(() => {
    if (!name) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPosts([])
    setPage(1)
    setHasMore(true)
    setInitialLoading(true)
    fetchPage(1, name)
  }, [name, fetchPage])

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

  const detailPost = selectedPostId ? posts.find((p) => p.id === selectedPostId) ?? null : null

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.hashIcon} aria-hidden="true">
          <i className="bx bx-hash" />
        </div>
        <div className={styles.headerMeta}>
          <h1 className={styles.title}>#{name}</h1>
          {!initialLoading && !error && (
            <span className={styles.count}>
              {posts.length} {t('hashtag.posts')}
            </span>
          )}
        </div>
      </div>

      {initialLoading ? (
        <div className={styles.skeleton} role="status" aria-label={t('common.loading')}>
          <div className={styles.skelHeader}>
            <div className={styles.skelAvatar} />
            <div className={styles.skelLines}>
              <div className={styles.skelLine} style={{ width: '35%' }} />
              <div className={styles.skelLine} style={{ width: '20%' }} />
            </div>
          </div>
          <div className={styles.skelLine} style={{ width: '70%' }} />
          <div className={styles.skelLine} style={{ width: '50%' }} />
        </div>
      ) : error && posts.length === 0 ? (
        <div className={styles.errorBox}>
          <i className="bx bx-error-circle" />
          <p>{toErrorMessage(error)}</p>
          <button className={styles.retryBtn} onClick={() => fetchPage(1, name)}>
            {t('common.retry') || 'Thử lại'}
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className={styles.empty}>
          <i className="bx bx-hash" />
          <p>{t('hashtag.empty')}</p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onSave={handleSave}
              onComment={setSelectedPostId}
              onShare={(postId) => {
                setSelectedPostId(postId)
                setSharePostId(postId)
              }}
              onFollow={handleFollow}
              onOpenDetail={setSelectedPostId}
            />
          ))}

          {hasMore && (
            <button
              className={styles.loadMoreBtn}
              onClick={() => fetchPage(page + 1, name)}
              disabled={loadingMore}
            >
              {loadingMore ? t('common.loading') : t('hashtag.loadMore')}
            </button>
          )}
        </>
      )}

      {detailPost && (
        <PostDetailModal
          key={detailPost.id}
          post={detailPost}
          open
          initialShareOpen={sharePostId === detailPost.id}
          onClose={() => {
            setSelectedPostId(null)
            setSharePostId(null)
          }}
          onUpdated={(updated) => setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))}
          onDeleted={(postId) => setPosts((prev) => prev.filter((p) => p.id !== postId))}
        />
      )}
    </div>
  )
}
