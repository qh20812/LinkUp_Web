'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getUserPosts, reactPost, savePost, getEmojis } from '../../api/posts'
import type { FeedPost, EmojiItem } from '../../types'

const PAGE_SIZE = 10

async function ensureLikeEmojiId(): Promise<string | undefined> {
  try {
    const res = await getEmojis()
    const emoji = res.data.find((e: EmojiItem) => e.code === ':like:')
    if (emoji) return emoji.id
  } catch { /* ignore */ }
  return undefined
}

export interface UseProfilePostsResult {
  posts: FeedPost[]
  setPosts: React.Dispatch<React.SetStateAction<FeedPost[]>>
  postsLoading: boolean
  postsError: string | null
  hasMore: boolean
  selectedPostId: string | null
  setSelectedPostId: (id: string | null) => void
  handleLike: (postId: string) => Promise<void>
  handleSavePost: (postId: string) => Promise<void>
  sentinelRef: React.RefObject<HTMLDivElement | null>
}

export function useProfilePosts(
  userID: string | null,
  options?: { onLikeError?: string; onSaveError?: string },
): UseProfilePostsResult {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsError, setPostsError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadingRef = useRef(false)
  const cursorRef = useRef<string | null>(null)

  const fetchNextPosts = useCallback(async () => {
    if (!userID || loadingRef.current) return
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
      setPostsError(err instanceof Error ? err.message : (options?.onLikeError ?? 'Error'))
    } finally {
      setPostsLoading(false)
      loadingRef.current = false
    }
  }, [userID, options?.onLikeError])

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

  const handleLike = useCallback(async (postId: string) => {
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
  }, [])

  const handleSavePost = useCallback(async (postId: string) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_saved: false } : p)))
    try {
      const res = await savePost(postId)
      if (res.action === 'removed') {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
      }
    } catch {
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_saved: true } : p)))
    }
  }, [])

  return {
    posts,
    setPosts,
    postsLoading,
    postsError,
    hasMore,
    selectedPostId,
    setSelectedPostId,
    handleLike,
    handleSavePost,
    sentinelRef,
  }
}
