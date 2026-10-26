'use client'

import { useCallback, useEffect, useRef } from 'react'
import ExternalImage from '../ExternalImage'
import { useTranslation } from '../../hooks/useTranslation'
import styles from './AvatarLightbox.module.css'

interface AvatarLightboxProps {
  src: string
  name: string
  username?: string
  onClose: () => void
}

/**
 * Xem ảnh đại diện ở kích thước lớn.
 *
 * Dùng `ExternalImage` (<img>) chứ không phải `next/image`: avatar có thể trỏ tới
 * host bất kỳ (Wikimedia, Unsplash, Cloudinary…) trong khi `images.remotePatterns`
 * chỉ whitelist một danh sách cố định — next/image sẽ ném lỗi ngay khi mở.
 */
export default function AvatarLightbox({ src, name, username, onClose }: AvatarLightboxProps) {
  const { t } = useTranslation()
  const closeRef = useRef<HTMLButtonElement>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    const prevOverflow = document.documentElement.style.overflow
    const prevFocus = document.activeElement as HTMLElement | null
    document.addEventListener('keydown', handleKeyDown)
    document.documentElement.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.documentElement.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [handleKeyDown])

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={name}
    >
      <button
        ref={closeRef}
        type="button"
        className={styles.closeBtn}
        onClick={(e) => { e.stopPropagation(); onClose() }}
        aria-label={t('common.close')}
      >
        <i className="bx bx-x" aria-hidden />
      </button>

      <figure className={styles.figure} onClick={(e) => e.stopPropagation()}>
        <ExternalImage src={src} alt={name} className={styles.image} />
        <figcaption className={styles.caption}>
          <span className={styles.name}>{name}</span>
          {username && <span className={styles.username}>@{username}</span>}
        </figcaption>
      </figure>
    </div>
  )
}
