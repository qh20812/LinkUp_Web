'use client'

import { useEffect, useCallback } from 'react'
import Image from 'next/image'
import styles from './MediaLightbox.module.css'
import type { MediaItem } from '../../types'

interface MediaLightboxProps {
  items: MediaItem[]
  initialIndex: number
  onClose: () => void
  onNavigate?: (postId: string) => void
}

export default function MediaLightbox({ items, initialIndex, onClose, onNavigate }: MediaLightboxProps) {
  const isVideo = (fileType: string) => fileType.startsWith('video/')

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.documentElement.style.overflow = prevHtmlOverflow
    }
  }, [handleKeyDown])

  if (items.length === 0) return null

  const item = items[initialIndex]

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <i className="bx bx-x" />
        </button>

        <div className={styles.content}>
          {isVideo(item.file_type) ? (
            <video
              src={item.file_uri}
              className={styles.media}
              controls
              autoPlay
              playsInline
            />
          ) : (
            <div className={styles.mediaWrapper}>
              <Image
                src={item.file_uri}
                alt=""
                fill
                sizes="100vw"
                className={styles.mediaImg}
                unoptimized
              />
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.counter}>
            {initialIndex + 1} / {items.length}
          </span>
          {onNavigate && (
            <button
              className={styles.viewPostBtn}
              onClick={() => onNavigate(item.post_id)}
            >
              <i className="bx bx-link-external" />
              <span>Xem bài viết</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
