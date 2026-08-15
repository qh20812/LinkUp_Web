'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import ExternalImage from '../ExternalImage'
import { viewStory, interactStory } from '../../api/stories'
import styles from './StoryViewer.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import type { StoryItem } from '../../types'

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

interface StoryViewerProps {
  stories: StoryItem[]
  initialIndex?: number
  onClose: () => void
  onStoryViewed?: (storyId: string) => void
}

export default function StoryViewer({
  stories,
  initialIndex = 0,
  onClose,
  onStoryViewed,
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [replyText, setReplyText] = useState('')
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const story = stories[currentIndex]
  const isVideo = story?.media_type === 'video'

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
      setProgress((prev) => {
        if (prev >= 100) {
          goNext()
          return 0
        }
        return prev + step
      })
    }, interval)

    return () => clearInterval(timer)
  }, [story, isPaused, isVideo, goNext])

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

  // Touch/swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    touchStartRef.current = null
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goNext()
      else goPrev()
    }
  }

  const handleReplySubmit = async () => {
    if (!replyText.trim() || !story) return
    try {
      await interactStory(story.id, 'reply', undefined, replyText.trim())
      setReplyText('')
    } catch { /* ignore */ }
  }

  const handleNavClick = (side: 'left' | 'right') => (e: React.MouseEvent) => {
    e.stopPropagation()
    if (side === 'left') goPrev()
    else goNext()
  }

  if (!story) return null

  return (
    <div
      className={`${styles.overlay} ${isPaused ? styles.paused : ''}`}
      onClick={() => setIsPaused((p) => !p)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
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
      <button className={styles.closeBtn} onClick={(e) => { e.stopPropagation(); onClose() }}>
        <i className="bx bx-x" />
      </button>

      {/* Content */}
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.navLeft} onClick={handleNavClick('left')}>
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

        <div className={styles.navRight} onClick={handleNavClick('right')}>
          <i className="bx bx-chevron-right" />
        </div>
      </div>

      {/* Caption */}
      {story.caption && (
        <div className={styles.caption}>{story.caption}</div>
      )}

      {/* Reply bar */}
      <div className={styles.replyBar} onClick={(e) => e.stopPropagation()}>
        <input
          className={styles.replyInput}
          placeholder={t('story.replyPlaceholder')}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleReplySubmit() }}
        />
        <button className={styles.sendBtn} onClick={handleReplySubmit}>
          <i className="bx bx-send" />
        </button>
      </div>
    </div>
  )
}
