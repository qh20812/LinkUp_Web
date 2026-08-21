'use client'

import { useState, useEffect, useRef, useCallback, useReducer } from 'react'
import useSWR from 'swr'
import { getCommunityPosts } from '../../api/communities'
import PostCard from '../PostCard'
import { useTranslation } from '../../hooks/useTranslation'
import styles from './CommunityFeed.module.css'
import type { FeedPost } from '../../types'

interface CommunityFeedProps {
  communityID: string
  membershipStatus: 'none' | 'pending' | 'member' | 'admin' | 'creator'
}

const PAGE_SIZE = 10

interface FeedState {
  posts: FeedPost[]
  cursor: string | null
  hasMore: boolean
}

type FeedAction =
  | { type: 'INIT'; posts: FeedPost[] }
  | { type: 'APPEND'; posts: FeedPost[]; cursor: string | null }
  | { type: 'UPDATE'; posts: FeedPost[] }

function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case 'INIT':
      return {
        posts: action.posts,
        cursor: action.posts.length > 0 ? action.posts[action.posts.length - 1].id : null,
        hasMore: action.posts.length >= PAGE_SIZE,
      }
    case 'APPEND': {
      const seen = new Set(state.posts.map((p) => p.id))
      const newPosts = action.posts.filter((p) => !seen.has(p.id))
      return { ...state, posts: [...state.posts, ...newPosts], cursor: action.cursor, hasMore: action.posts.length >= PAGE_SIZE }
    }
    case 'UPDATE':
      return { ...state, posts: action.posts }
    default:
      return state
  }
}

export default function CommunityFeed({ communityID, membershipStatus }: CommunityFeedProps) {
  const { t } = useTranslation()
  const [feed, dispatch] = useReducer(feedReducer, { posts: [], cursor: null, hasMore: true })
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const dataVersionRef = useRef(-1)

  const shouldFetch = membershipStatus === 'member' || membershipStatus === 'admin' || membershipStatus === 'creator'

  const { data, isLoading, error } = useSWR(
    shouldFetch ? `/communities/${communityID}/posts?page_size=${PAGE_SIZE}` : null,
    () => getCommunityPosts(communityID, undefined, PAGE_SIZE),
  )

  useEffect(() => {
    if (data?.posts && dataVersionRef.current === -1) {
      dataVersionRef.current = 0
      dispatch({ type: 'INIT', posts: data.posts })
    }
  }, [data])

  const fetchNext = useCallback(async () => {
    if (loadingRef.current || !feed.hasMore || feed.cursor === null) return
    loadingRef.current = true
    setLoadingMore(true)
    try {
      const res = await getCommunityPosts(communityID, feed.cursor, PAGE_SIZE)
      dispatch({ type: 'APPEND', posts: res.posts, cursor: res.posts.length > 0 ? feed.cursor : null })
    } catch {
      // error handled silently
    } finally {
      setLoadingMore(false)
      loadingRef.current = false
    }
  }, [communityID, feed.cursor, feed.hasMore])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !feed.hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current && feed.hasMore) {
          fetchNext()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchNext, feed.hasMore, feed.posts.length])

  const handleLike = (postId: string) => {
    dispatch({
      type: 'UPDATE',
      posts: feed.posts.map((p) =>
        p.id === postId
          ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
          : p,
      ),
    })
  }

  const handleSave = (postId: string) => {
    dispatch({
      type: 'UPDATE',
      posts: feed.posts.map((p) =>
        p.id === postId ? { ...p, is_saved: !p.is_saved } : p,
      ),
    })
  }

  if (isLoading) {
    return (
      <div className={styles.feed}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className={styles.skeletonCircle} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                <div className={styles.skeletonLine} style={{ width: '35%' }} />
              </div>
            </div>
            <div className={styles.skeletonLine} style={{ width: '80%', marginTop: 12 }} />
            <div className={styles.skeletonLine} />
            <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
          </div>
        ))}
      </div>
    )
  }

  if (error && feed.posts.length === 0) {
    return (
      <div className={styles.feed}>
        <div className={styles.empty}>
          <i className="bx bx-error-circle" style={{ fontSize: 48, color: 'var(--color-danger)' }} />
          <p>{t('common.error')}</p>
        </div>
      </div>
    )
  }

  if (!shouldFetch || feed.posts.length === 0) {
    return (
      <div className={styles.feed}>
        <div className={styles.empty}>
          <i className={`bx bx-chat ${styles.emptyIcon}`} />
          <p>{t('communities.noPosts') || 'Chưa có bài viết nào'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.feed}>
      {feed.posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={handleLike}
          onSave={handleSave}
        />
      ))}

      {loadingMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24, color: 'var(--color-text-secondary)', fontSize: 14 }}>
          <i className="bx bx-loader-circle bx-spin" />
        </div>
      )}

      {feed.hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}

      {!feed.hasMore && feed.posts.length > 0 && (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-secondary)', fontSize: 14 }}>
          {t('feed.end') || 'Đã xem hết bài viết.'}
        </div>
      )}
    </div>
  )
}
