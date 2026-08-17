'use client'

import { useEffect, useCallback } from 'react'
import styles from './ChatMediaLightbox.module.css'

interface ChatMediaLightboxProps {
  src: string
  isVideo: boolean
  onClose: () => void
}

export default function ChatMediaLightbox({ src, isVideo, onClose }: ChatMediaLightboxProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
        <i className="bx bx-x" />
      </button>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        {isVideo ? (
          <video src={src} className={styles.media} controls autoPlay playsInline />
        ) : (
          <img src={src} alt="" className={styles.media} />
        )}
      </div>
    </div>
  )
}
