'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ExternalImage from '../ExternalImage'
import { viewStory, interactStory, reactStory, shareStory, deleteStory, getStoryAnalytics } from '../../api/stories'
import styles from './StoryViewer.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import { useEmojis } from '../../hooks/useEmojis'
import StoryStatsModal, { timeAgo } from './StoryStatsModal'
import type { StoryItem, StoryAnalytics } from '../../types'

function currentTime(): number {
  return Date.now()
}

interface StoryViewerProps {
  stories: StoryItem[]
  initialIndex?: number
  currentUserId?: string
  onClose: () => void
  onStoryViewed?: (storyId: string) => void
  onStoryDeleted?: (storyId: string) => void
}

export default function StoryViewer({
  stories,
  initialIndex = 0,
  currentUserId,
  onClose,
  onStoryViewed,
  onStoryDeleted,
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [reactOpen, setReactOpen] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analytics, setAnalytics] = useState<StoryAnalytics | null>(null)
  const { t } = useTranslation()
  const { toast } = useToast()
  const { emojis } = useEmojis()
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const lastTapRef = useRef<number>(0)
  const [tapHeartVisible, setTapHeartVisible] = useState(false)

  const story = stories[currentIndex]
  const isVideo = story?.media_type === 'video'
  const isOwner = !!currentUserId && story?.user_id === currentUserId

  const emojiList = useMemo(() => Array.from(emojis.values()), [emojis])

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1)
      setProgress(0)
    } else {
      onClose()
    }
  }, [currentIndex, stories.length, onClose])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
      setProgress(0)
    }
  }, [currentIndex])

  // Mark story as viewed
  useEffect(() => {
    if (!story) return
    if (!story.has_viewed) {
      viewStory(story.id).catch(() => {})
      onStoryViewed?.(story.id)
    }
  }, [story, onStoryViewed])

  // Auto-advance for images
  useEffect(() => {
    if (!story || isPaused || isVideo) return

    const duration = 5000
    const interval = 50
    const step = (interval / duration) * 100

    const timer = setInterval(() => {
      setProgress((prev) => prev + step)
    }, interval)

    return () => clearInterval(timer)
  }, [story, isPaused, isVideo])

  // Trigger advance at event phase when image progress reaches 100%
  useEffect(() => {
    if (!story || isVideo || isPaused) return
    if (progress < 100) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    goNext()
  }, [progress, story, isVideo, isPaused, goNext])

  // Video auto-advance
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isVideo || isPaused) return

    const handleTimeUpdate = () => {
      if (video.duration > 0) {
        setProgress((video.currentTime / video.duration) * 100)
      }
    }

    const handleEnded = () => {
      goNext()
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
    }
  }, [isVideo, isPaused, goNext])

  // Pause/play video when isPaused changes
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isVideo) return
    if (isPaused) {
      video.pause()
    } else {
      video.play().catch(() => {})
    }
  }, [isPaused, isVideo])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === ' ') {
        e.preventDefault()
        setIsPaused((p) => !p)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, goPrev, goNext])

  // Focus dialog + trap Tab inside + restore focus on close
  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    overlay.focus()

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusables = Array.from(
        overlay.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute('disabled'))
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && (active === first || !overlay.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !overlay.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    overlay.addEventListener('keydown', handleTab)

    return () => {
      overlay.removeEventListener('keydown', handleTab)
      previouslyFocused?.focus?.()
    }
  }, [])

  // Touch/swipe + double tap
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    touchStartRef.current = null

    if (Math.abs(dx) > 50 || Math.abs(dy) > 50) {
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) goNext()
        else goPrev()
      }
      return
    }

    const now = currentTime()
    if (now - lastTapRef.current < 300) {
      handleDoubleTap()
    }
    lastTapRef.current = now
  }

  const handleDoubleTap = async () => {
    if (!story) return
    setTapHeartVisible(true)
    window.setTimeout(() => setTapHeartVisible(false), 900)
    const love = emojiList.find((e) => e.code === ':love:') ?? emojiList[0]
    await ensureReact(love?.id)
  }

  const ensureReact = async (emojiId: string | undefined) => {
    if (!story || !emojiId) return
    try {
      await reactStory(story.id, emojiId)
    } catch { /* ignore */ }
  }

  const handleReactPick = async (emojiId: string) => {
    setReactOpen(false)
    await ensureReact(emojiId)
  }

  const handleReplySubmit = async () => {
    if (!replyText.trim() || !story) return
    try {
      await interactStory(story.id, 'reply', undefined, replyText.trim())
      setReplyText('')
      toast({ type: 'success', title: t('story.replySent') })
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : t('common.error') })
    }
  }

  const handleShare = async () => {
    if (!story) return
    const link = `${window.location.origin}/posts?story=${story.id}`
    try {
      await navigator.clipboard.writeText(link)
    } catch { /* clipboard may be unavailable */ }
    shareStory(story.id).catch(() => {})
    toast({ type: 'success', title: t('story.linkCopied') })
  }

  const openAnalytics = async () => {
    if (!story) return
    setShowAnalytics(true)
    try {
      const data = await getStoryAnalytics(story.id)
      setAnalytics(data)
    } catch (err) {
      setAnalytics(null)
      toast({ type: 'error', title: err instanceof Error ? err.message : t('common.error') })
    }
  }

  const handleDelete = async () => {
    if (!story) return
    const confirmed = window.confirm(t('story.confirmDelete'))
    if (!confirmed) return
    try {
      await deleteStory(story.id)
      toast({ type: 'success', title: t('story.deleted') })
      onStoryDeleted?.(story.id)
      onClose()
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : t('common.error') })
    }
  }

  const handleNavClick = (side: 'left' | 'right') => (e: React.MouseEvent) => {
    e.stopPropagation()
    if (side === 'left') goPrev()
    else goNext()
  }

  const handleNavKey = (side: 'left' | 'right') => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      if (side === 'left') goPrev()
      else goNext()
    }
  }

  if (!story) return null

  return (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${isPaused ? styles.paused : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('story.stories')}
      tabIndex={-1}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.frame} onClick={() => setIsPaused((p) => !p)}>
        {/* Progress bars */}
        <div className={styles.progressBar}>
          {stories.map((s, i) => (
            <div key={s.id} className={styles.progressSegment}>
              <div
                className={styles.progressFill}
                style={{
                  width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className={styles.header}>
          <ExternalImage src={story.avatar_uri} alt="" className={styles.avatar} />
          <span className={styles.username}>{story.display_name}</span>
          <span className={styles.timeAgo}>{timeAgo(story.created_at)}</span>
        </div>

        {/* Close */}
        <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); onClose() }} aria-label={t('common.close')}>
          <i className="bx bx-x" />
        </button>

        {/* Owner actions */}
        {isOwner && (
          <div className={styles.ownerActions} onClick={(e) => e.stopPropagation()}>
            <button className={styles.ownerBtn} onClick={openAnalytics} title={t('story.viewStats')} aria-label={t('story.viewStats')}>
              <i className="bx bx-bar-chart-alt-2" />
            </button>
            <button className={styles.ownerBtn} onClick={handleDelete} title={t('story.delete')} aria-label={t('story.delete')}>
              <i className="bx bx-trash" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={styles.content} onClick={(e) => e.stopPropagation()}>
          <div
            className={styles.navLeft}
            onClick={handleNavClick('left')}
            role="button"
            tabIndex={0}
            aria-label={t('story.prevStory')}
            onKeyDown={handleNavKey('left')}
          >
            <i className="bx bx-chevron-left" />
          </div>

          {isVideo ? (
            <video
              ref={videoRef}
              src={story.media_uri}
              className={styles.media}
              autoPlay
              muted
              playsInline
            />
          ) : (
            <ExternalImage src={story.media_uri} alt={story.caption} className={styles.media} />
          )}

          <div
            className={styles.navRight}
            onClick={handleNavClick('right')}
            role="button"
            tabIndex={0}
            aria-label={t('story.nextStory')}
            onKeyDown={handleNavKey('right')}
          >
            <i className="bx bx-chevron-right" />
          </div>
        </div>

        {/* Double-tap heart */}
        {tapHeartVisible && (
          <div className={`${styles.tapHeart} ${tapHeartVisible ? styles.tapHeartShow : ''}`}>
            <i className="bx bxs-heart" />
          </div>
        )}

        {/* Caption */}
        {story.caption && (
          <div className={styles.caption}>{story.caption}</div>
        )}

        {/* Action row */}
        <div className={styles.actionRow} onClick={(e) => e.stopPropagation()}>
          <div className={styles.reactWrap}>
            <button
              className={styles.actionBtn}
              onClick={() => setReactOpen((o) => !o)}
              title={t('story.react')}
              aria-label={t('story.react')}
            >
              <i className="bx bxs-heart" />
            </button>
            {reactOpen && (
              <div className={styles.reactPicker}>
                {emojiList.map((e) => (
                  <button
                    key={e.id}
                    className={styles.reactOption}
                    onClick={() => handleReactPick(e.id)}
                    title={e.code}
                    aria-label={e.code}
                  >
                    <ExternalImage src={e.image_uri} alt={e.code} className={styles.reactImg} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className={styles.actionBtn} onClick={handleShare} title={t('story.share')} aria-label={t('story.share')}>
            <i className="bx bx-share-alt" />
          </button>
        </div>

        {/* Reply bar */}
        <div className={styles.replyBar} onClick={(e) => e.stopPropagation()}>
          <input
            className={styles.replyInput}
            placeholder={t('story.replyPlaceholder')}
            aria-label={t('story.replyPlaceholder')}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleReplySubmit() }}
          />
          <button className={styles.sendBtn} onClick={handleReplySubmit} aria-label={t('story.sendReply')}>
            <i className="bx bx-send" />
          </button>
        </div>
      </div>

      {showAnalytics && (
        <StoryStatsModal
          analytics={analytics}
          loading={!analytics}
          emojiList={emojiList}
          onClose={() => { setShowAnalytics(false); setAnalytics(null) }}
        />
      )}
    </div>
  )
}