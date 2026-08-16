'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import styles from './ProfileTabs.module.css'
import mediaStyles from './ProfileMediaGrid.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import { getUserPosts, getSavedPosts, reactPost, savePost, getEmojis, pinPost, unpinPost } from '../../api/posts'
import { getUserMedia } from '../../api/posts'
import PostCard from '../PostCard'
import PostDetailModal from '../PostDetailModal'
import ProfileFriendsTab from './ProfileFriendsTab'
import ProfileAboutTab from './ProfileAboutTab'
import MediaLightbox from './MediaLightbox'
import type { FeedPost, EmojiItem, MediaItem, ViewProfileResponse } from '../../types'

const PAGE_SIZE = 10
const MEDIA_PAGE_SIZE = 18

async function ensureLikeEmojiId(): Promise<string | undefined> {
  try {
    const res = await getEmojis()
    const emoji = res.data.find((e: EmojiItem) => e.code === ':like:')
    if (emoji) return emoji.id
  } catch { /* ignore */ }
  return undefined
}

export type ProfileTab = 'posts' | 'media' | 'saved' | 'friends' | 'about'

interface ProfileTabsProps {
  userID: string
  isSelf: boolean
  profile?: ViewProfileResponse
  onFollow?: (userId: string) => void
}

export default function ProfileTabs({ userID, isSelf, profile, onFollow }: ProfileTabsProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts')
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [pinBusy, setPinBusy] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadingRef = useRef(false)
  const cursorRef = useRef<string | null>(null)
  const mediaLoadingRef = useRef(false)
  const mediaPageRef = useRef(1)

  // Media gallery state
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaHasMore, setMediaHasMore] = useState(true)

  const fetchPosts = useCallback(async (reset = false) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setError(null)
    const isFirst = reset || cursorRef.current === null
    try {
      let res
      if (activeTab === 'saved' && isSelf) {
        res = await getSavedPosts(isFirst ? null : cursorRef.current, PAGE_SIZE)
      } else {
        res = await getUserPosts(userID, isFirst ? null : cursorRef.current, PAGE_SIZE)
      }
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
      loadingRef.current = false
    }
  }, [userID, activeTab, isSelf, t])

  const fetchMedia = useCallback(async (page: number, reset = false) => {
    if (mediaLoadingRef.current) return
    mediaLoadingRef.current = true
    setMediaLoading(true)
    try {
      const res = await getUserMedia(userID, page, MEDIA_PAGE_SIZE)
      setMediaItems((prev) => (page === 1 || reset ? res.data : [...prev, ...res.data]))
      setMediaHasMore(res.has_more)
    } catch { /* ignore */ } finally {
      setMediaLoading(false)
      mediaLoadingRef.current = false
    }
  }, [userID])

  const prevTabRef = useRef(activeTab)

  useEffect(() => {
    const tabChanged = prevTabRef.current !== activeTab
    if (tabChanged) {
      prevTabRef.current = activeTab
      cursorRef.current = null
      loadingRef.current = false
      mediaLoadingRef.current = false
      mediaPageRef.current = 1
      setHasMore(true)
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'media') {
      setTimeout(() => { fetchMedia(1, true) }, 0)
    } else if (prevTabRef.current === 'media') {
      setTimeout(() => { fetchPosts(true) }, 0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'media') return
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursorRef.current !== null && !loadingRef.current) {
          fetchPosts()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchPosts, posts.length, activeTab])

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

  const handlePin = async (postId: string) => {
    if (pinBusy) return
    setPinBusy(postId)
    try {
      if (posts.find((p) => p.id === postId)?.is_pinned) {
        await unpinPost(postId)
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, is_pinned: false, pinned_at: undefined } : p,
          ),
        )
      } else {
        await pinPost(postId)
        const now = new Date().toISOString()
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, is_pinned: true, pinned_at: now } : p,
          ),
        )
      }
    } catch { /* ignore */ } finally {
      setPinBusy(null)
    }
  }

  const handleMediaScroll = () => {
    if (mediaHasMore && !mediaLoading) {
      mediaPageRef.current += 1
      fetchMedia(mediaPageRef.current)
    }
  }

  const tabs: Array<{ key: ProfileTab; label: string; icon: string }> = [
    { key: 'posts', label: t('profile.tabPosts'), icon: 'bx bx-file' },
    { key: 'media', label: t('profile.tabMedia'), icon: 'bx bx-image' },
    { key: 'friends', label: t('profile.tabFriends'), icon: 'bx bx-group' },
    { key: 'about', label: t('profile.tabAbout'), icon: 'bx bx-info-circle' },
  ]
  if (isSelf) {
    tabs.push({ key: 'saved', label: t('profile.tabSaved'), icon: 'bx bx-bookmark' })
  }

  const sortedPosts = [...posts].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return 0
  })

  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <i className={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'friends' ? (
          <ProfileFriendsTab userID={userID} />
        ) : activeTab === 'about' && profile ? (
          <ProfileAboutTab profile={profile} />
        ) : activeTab === 'media' ? (
          <>
            {mediaItems.length === 0 && !mediaLoading && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}><i className="bx bx-image" /></span>
                <p className={styles.emptyText}>{t('profile.noMedia')}</p>
              </div>
            )}
            {mediaItems.length === 0 && mediaLoading && (
              <div className={mediaStyles.grid}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={`${mediaStyles.gridItem} ${mediaStyles.skeleton}`} />
                ))}
              </div>
            )}
            {mediaItems.length > 0 && (
              <div className={mediaStyles.grid}>
                {mediaItems.map((item, index) => (
                <div
                  key={item.id}
                  className={mediaStyles.gridItem}
                  onClick={() => setLightboxIndex(index)}
                >
                  {item.file_type.startsWith('video') ? (
                    <video
                      src={item.file_uri}
                      className={mediaStyles.gridMedia}
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <Image
                      src={item.file_uri}
                      alt=""
                      fill
                      sizes="(max-width: 480px) 33vw, (max-width: 768px) 25vw, 16vw"
                      className={mediaStyles.gridMedia}
                      unoptimized
                    />
                  )}
                </div>
              ))}
              </div>
            )}
            {mediaLoading && (
              <div className={styles.loadingWrap}><div className={styles.loadingSpinner} /></div>
            )}
            {mediaHasMore && mediaItems.length > 0 && (
              <button className={styles.loadMoreBtn} onClick={handleMediaScroll}>
                {t('common.loading')}
              </button>
            )}
          </>
        ) : (
          <>
            {!loading && error && posts.length === 0 && (
              <div className={styles.loadingWrap}><p>{error}</p></div>
            )}

            {!loading && !error && posts.length === 0 && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>
                  <i className={activeTab === 'saved' ? 'bx bx-bookmark' : 'bx bx-file'} />
                </span>
                <p className={styles.emptyText}>
                  {activeTab === 'saved' ? t('profile.noSavedPosts') : t('profile.noPosts')}
                </p>
              </div>
            )}

            {sortedPosts.map((post) => (
              <div key={post.id} className={styles.postItem}>
                {post.is_pinned && (
                  <div className={styles.pinnedBadge}>
                    <i className="bx bx-pin" /> {t('profile.pinnedLabel')}
                  </div>
                )}
                <PostCard
                  post={post}
                  onLike={handleLike}
                  onSave={handleSavePost}
                  onComment={(id) => setSelectedPostId(id)}
                  onShare={(id) => setSelectedPostId(id)}
                  onFollow={onFollow}
                  onOpenDetail={setSelectedPostId}
                />
                {isSelf && (
                  <button
                    className={`${styles.pinBtn} ${post.is_pinned ? styles.pinBtnActive : ''}`}
                    onClick={() => handlePin(post.id)}
                    disabled={pinBusy === post.id}
                  >
                    <i className={post.is_pinned ? 'bx bx-pin' : 'bx bx-pin'} />
                    {post.is_pinned ? t('profile.unpinPost') : t('profile.pinPost')}
                  </button>
                )}
              </div>
            ))}

            {loading && (
              <div className={styles.loadingWrap}><div className={styles.loadingSpinner} /></div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className={styles.loadingWrap}>
                <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
              </div>
            )}

            <div ref={sentinelRef} />
          </>
        )}
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

      {lightboxIndex !== null && (
        <MediaLightbox
          items={mediaItems}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(postId) => {
            setLightboxIndex(null)
            setSelectedPostId(postId)
          }}
        />
      )}
    </div>
  )
}
