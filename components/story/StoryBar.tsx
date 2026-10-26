'use client'

import styles from './StoryBar.module.css'
import type { StoryFeedItem, StoryItem } from '../../types'
import ExternalImage from '../ExternalImage'
import { useTranslation } from '../../hooks/useTranslation'
import { useCallback, useEffect, useRef, useState } from 'react'

/** Dưới ngưỡng này coi như đang ở sát mép (sai số làm tròn của scrollLeft). */
const EDGE_EPSILON = 4

type ScrollDirection = -1 | 1

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

interface StoryBarProps {
  stories: StoryFeedItem[]
  loading?: boolean
  currentUserId?: string
  /** Current user's avatar for the "Your Story" create tile. */
  avatarUri?: string
  onSelectStory: (userId: string, stories: StoryItem[]) => void
  onCreateStory: () => void
  onMuteUser: (userId: string) => void
}

function StoryPreview({ story, viewed }: { story: StoryItem; viewed: boolean }) {
  if (!story.media_uri) {
    return (
      <div className={`${styles.previewFallback} ${viewed ? styles.viewed : ''}`}>
        <i className="bx bx-image-alt" aria-hidden="true" />
        {story.caption && <span className={styles.previewFallbackText}>{story.caption}</span>}
      </div>
    )
  }

  if (story.media_type === 'video') {
    return (
      <video
        className={`${styles.previewMedia} ${viewed ? styles.viewed : ''}`}
        src={story.media_uri}
        muted
        playsInline
        loop
        preload="metadata"
      />
    )
  }

  return (
    <ExternalImage
      src={story.media_uri}
      alt={story.caption}
      className={`${styles.previewMedia} ${viewed ? styles.viewed : ''}`}
    />
  )
}

export default function StoryBar({
  stories,
  loading = false,
  currentUserId,
  avatarUri,
  onSelectStory,
  onCreateStory,
  onMuteUser,
}: StoryBarProps) {
  const { t } = useTranslation()
  const [menuAnchor, setMenuAnchor] = useState<{ userId: string; top: number; right: number } | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const openMenu = (e: React.MouseEvent<HTMLElement>, userId: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuAnchor({
      userId,
      top: rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right - 12),
    })
  }

  useEffect(() => {
    if (!menuAnchor) return
    const close = () => setMenuAnchor(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [menuAnchor])

  /**
   * Cập nhật trạng thái "còn nội dung để cuộn" ở hai mép. Dùng cho cả việc hiện
   * nút mũi tên lẫn mask fade — fade chỉ bật khi thực sự còn thẻ bị khuất.
   */
  const syncEdges = useCallback(() => {
    const el = barRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    const left = el.scrollLeft > EDGE_EPSILON
    const right = maxScroll > EDGE_EPSILON && el.scrollLeft < maxScroll - EDGE_EPSILON
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
  }, [])

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    // Đo sau khi browser hoàn tất layout (font/ảnh) — jsdom không có rAF thì bỏ qua.
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(syncEdges) : null
    el.addEventListener('scroll', syncEdges, { passive: true })
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(syncEdges)
      observer.observe(el)
    }
    return () => {
      if (raf !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf)
      el.removeEventListener('scroll', syncEdges)
      observer?.disconnect()
    }
  }, [syncEdges, stories, loading])

  const scrollByPage = useCallback((dir: ScrollDirection) => {
    const el = barRef.current
    if (!el) return
    // ~80% viewport: luôn thấy một phần thẻ trước để giữ mạch đọc.
    const step = Math.max(160, Math.round(el.clientWidth * 0.8))
    const scrollBehavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth'
    if (typeof el.scrollBy === 'function') {
      el.scrollBy({ left: dir * step, behavior: scrollBehavior })
    } else {
      el.scrollLeft += dir * step
    }
  }, [])

  const scrollToEdge = useCallback((edge: 'start' | 'end') => {
    const el = barRef.current
    if (!el) return
    const left = edge === 'start' ? 0 : el.scrollWidth - el.clientWidth
    const scrollBehavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth'
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ left, behavior: scrollBehavior })
    } else {
      el.scrollLeft = left
    }
  }, [])

  const handleBarKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      scrollByPage(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      scrollByPage(-1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      scrollToEdge('start')
    } else if (e.key === 'End') {
      e.preventDefault()
      scrollToEdge('end')
    }
  }

  if (loading && stories.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.bar}>
          {['a', 'b', 'c', 'd', 'e', 'f'].map((k) => (
            <div key={k} className={styles.skeletonCard} />
          ))}
        </div>
      </div>
    )
  }

  if (!currentUserId && stories.length === 0) {
    return null
  }

  return (
    <div className={styles.wrap}>
      <div
        ref={barRef}
        className={[
          styles.bar,
          edges.left ? styles.barFadeLeft : '',
          edges.right ? styles.barFadeRight : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="group"
        aria-label={t('story.barLabel')}
        tabIndex={0}
        onKeyDown={handleBarKeyDown}
      >
        {currentUserId && (
          <div
            className={`${styles.storyItem} ${styles.yourStory}`}
            onClick={onCreateStory}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onCreateStory()
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={t('story.addStory')}
          >
            <div className={styles.yourStoryCard}>
              {avatarUri ? (
                <>
                  <ExternalImage src={avatarUri} alt="" className={styles.previewMedia} />
                  <div className={styles.gradient} />
                  <span className={styles.plusBadge} aria-hidden="true">
                    <i className="bx bx-plus" />
                  </span>
                  <div className={styles.overlay}>
                    <span className={styles.storyName}>{t('story.yourStory')}</span>
                  </div>
                </>
              ) : (
                <>
                  <span className={styles.yourStoryIcon}>
                    <i className="bx bx-plus" aria-hidden="true" />
                  </span>
                  <span className={styles.yourStoryLabel}>{t('story.yourStory')}</span>
                </>
              )}
            </div>
          </div>
        )}

        {stories.map((item) => {
          const hasViewed = item.stories.every((s) => s.has_viewed)
          const preview = item.stories[0]
          return (
            <div
              key={item.user.id}
              className={`${styles.storyItem} ${styles.previewCard}`}
              onClick={() => onSelectStory(item.user.id, item.stories)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectStory(item.user.id, item.stories)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${t('story.viewStory')}: ${item.user.display_name}`}
              onContextMenu={(e) => {
                e.preventDefault()
                if (item.user.id !== currentUserId) openMenu(e, item.user.id)
              }}
            >
              <div className={styles.previewMediaWrap}>
                {preview ? (
                  <StoryPreview story={preview} viewed={hasViewed} />
                ) : (
                  <div className={styles.previewFallback}>
                    <i className="bx bxs-user" aria-hidden="true" />
                  </div>
                )}
                <div className={styles.gradient} />

                {item.user.id !== currentUserId && (
                  <button
                    type="button"
                    className={styles.moreBtn}
                    aria-label={t('story.moreActions')}
                    title={t('story.moreActions')}
                    onClick={(e) => {
                      e.stopPropagation()
                      openMenu(e, item.user.id)
                    }}
                  >
                    <i className="bx bx-dots-vertical-rounded" aria-hidden="true" />
                  </button>
                )}

                <div className={styles.overlay}>
                  <div className={`${styles.ring} ${hasViewed ? styles.ringViewed : ''}`}>
                    <div className={styles.ringInner}>
                      <ExternalImage
                        src={item.user.avatar_uri}
                        alt={item.user.display_name}
                        className={styles.avatarOverlay}
                      />
                    </div>
                  </div>
                  <span className={styles.storyName}>{item.user.display_name}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {edges.left && (
        <button
          type="button"
          className={`${styles.navBtn} ${styles.navPrev}`}
          aria-label={t('story.scrollPrev')}
          title={t('story.scrollPrev')}
          onClick={() => scrollByPage(-1)}
        >
          <i className="bx bx-chevron-left" aria-hidden="true" />
        </button>
      )}
      {edges.right && (
        <button
          type="button"
          className={`${styles.navBtn} ${styles.navNext}`}
          aria-label={t('story.scrollNext')}
          title={t('story.scrollNext')}
          onClick={() => scrollByPage(1)}
        >
          <i className="bx bx-chevron-right" aria-hidden="true" />
        </button>
      )}

      {menuAnchor && (
        <div
          className={styles.menuBackdrop}
          onClick={(e) => {
            e.stopPropagation()
            setMenuAnchor(null)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            setMenuAnchor(null)
          }}
        >
          <div
            className={styles.menu}
            style={{ top: menuAnchor.top, right: menuAnchor.right }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.menuTitle}>
              {stories.find((s) => s.user.id === menuAnchor.userId)?.user.display_name}
            </div>
            {menuAnchor.userId !== currentUserId && (
              <button
                className={styles.menuItem}
                onClick={() => {
                  setMenuAnchor(null)
                  onMuteUser(menuAnchor.userId)
                }}
              >
                <i className="bx bx-hide" />
                <span>{t('story.muteUser')}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
