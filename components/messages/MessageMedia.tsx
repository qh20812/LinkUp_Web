'use client'

import { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import ExternalImage from '../ExternalImage'
import VoicePlayer from './VoicePlayer'
import { useMessageMedia, mediaRatioCache } from './useMessageMedia'
import type { ChatMessage } from '../../types'
import styles from './ChatWindow.module.css'

interface MessageMediaProps {
  message: ChatMessage
  onClick?: () => void
}

export default function MessageMedia({ message, onClick }: MessageMediaProps) {
  const { t } = useTranslation()
  const { src, isVideo, isAudio, failed, loading, boxRef } = useMessageMedia(message)
  const cachedRatio = mediaRatioCache.get(message.id)
  const [loaded, setLoaded] = useState(() => !message.media_uri && !!src)
  const [ratio, setRatio] = useState<{ width: number; height: number } | null>(
    cachedRatio ?? null,
  )
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true)
    const img = e.currentTarget
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      const dims = { width: img.naturalWidth, height: img.naturalHeight }
      mediaRatioCache.set(message.id, dims)
      setRatio(dims)
    }
  }

  const wrap = (node: React.ReactNode) =>
    onClick ? (
      <span className={styles.mediaClickable} onClick={onClick} role="button" tabIndex={0}>
        {node}
      </span>
    ) : (
      node
    )

  if (loading) {
    return (
      <span ref={boxRef} className={styles.mediaLoading} />
    )
  }
  if (failed || !src) {
    return <span className={styles.deletedText}>{t('chat.mediaFailed')}</span>
  }
  if (isVideo) {
    return wrap(
      <video
        src={src}
        controls
        muted
        playsInline
        preload="metadata"
        className={styles.mediaEl}
      />,
    )
  }
  if (isAudio) {
    return <VoicePlayer src={src} duration={message.duration_seconds} />
  }
  return wrap(
    <span
      ref={boxRef}
      className={`${styles.mediaBox}${loaded ? '' : ` ${styles.mediaBoxLoading}`}`}
    >
      {!loaded && (
        <span className={styles.mediaLoading} />
      )}
      <ExternalImage
        src={src}
        alt=""
        className={styles.mediaEl}
        onLoad={handleImageLoad}
        loading="eager"
        decoding="async"
        style={ratio ? { aspectRatio: `${ratio.width} / ${ratio.height}` } : undefined}
      />
    </span>,
  )
}
