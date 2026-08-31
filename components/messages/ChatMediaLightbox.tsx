'use client'

import { useCallback, useEffect, useState } from 'react'
import ExternalImage from '../ExternalImage'
import { useMessageMedia } from './useMessageMedia'
import type { ChatMessage } from '../../types'
import styles from './ChatMediaLightbox.module.css'

interface ChatMediaLightboxProps {
  msgs: ChatMessage[]
  initialIndex: number
  onClose: () => void
}

function MediaView({ message }: { message: ChatMessage }) {
  const { src, isVideo, failed, loading } = useMessageMedia(message, { eager: true })
  const [ratio, setRatio] = useState<{ width: number; height: number } | null>(null)

  if (loading) {
    return (
      <span className={styles.loading}>
        <i className="bx bx-loader-circle bx-spin" />
      </span>
    )
  }
  if (failed || !src) {
    return <span className={styles.failed}>Không tải được media</span>
  }
  if (isVideo) {
    return (
      <video
        src={src}
        className={styles.media}
        controls
        autoPlay
        playsInline
        onClick={(e) => e.stopPropagation()}
      />
    )
  }
  return (
    <div className={styles.mediaWrapper}>
      <ExternalImage
        src={src}
        alt=""
        className={styles.img}
        onClick={(e) => e.stopPropagation()}
        onLoad={(e) => {
          const img = e.currentTarget
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            setRatio({ width: img.naturalWidth, height: img.naturalHeight })
          }
        }}
        style={ratio ? { aspectRatio: `${ratio.width} / ${ratio.height}` } : undefined}
      />
    </div>
  )
}

export default function ChatMediaLightbox({ msgs, initialIndex, onClose }: ChatMediaLightboxProps) {
  const [index, setIndex] = useState(initialIndex)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, msgs.length - 1))
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
    },
    [onClose, msgs.length],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    const prevOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.documentElement.style.overflow = prevOverflow
    }
  }, [handleKeyDown])

  if (msgs.length === 0) return null

  const msg = msgs[index]
  const caption = msg.content?.trim()

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container}>
        <button
          className={styles.closeBtn}
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          aria-label="Close"
        >
          <i className="bx bx-x" />
        </button>

        <div className={styles.content}>
          <MediaView key={msg.id} message={msg} />
        </div>

        <div className={styles.meta} onClick={(e) => e.stopPropagation()}>
          {caption && <div className={styles.caption}>{caption}</div>}
          <div className={styles.counter}>
            {index + 1} / {msgs.length}
          </div>
        </div>

        {index > 0 && (
          <button
            className={`${styles.navBtn} ${styles.prevBtn}`}
            onClick={(e) => {
              e.stopPropagation()
              setIndex((i) => i - 1)
            }}
            aria-label="Previous"
          >
            <i className="bx bx-chevron-left" />
          </button>
        )}
        {index < msgs.length - 1 && (
          <button
            className={`${styles.navBtn} ${styles.nextBtn}`}
            onClick={(e) => {
              e.stopPropagation()
              setIndex((i) => i + 1)
            }}
            aria-label="Next"
          >
            <i className="bx bx-chevron-right" />
          </button>
        )}
      </div>
    </div>
  )
}
