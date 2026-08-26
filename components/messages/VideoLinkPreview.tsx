'use client'

import { useMemo, useState } from 'react'
import { getVideoThumbnail, getYouTubeVideoId } from '../../utils/videoLink'
import styles from './VideoLinkPreview.module.css'

interface VideoLinkPreviewProps {
  url: string
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function getTitle(url: string): string | null {
  const ytId = getYouTubeVideoId(url)
  if (ytId) return `YouTube Video`
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/\/+$/, '')
    if (path && path !== '/') {
      const slug = path.split('/').pop() ?? ''
      return decodeURIComponent(slug).replace(/[-_]/g, ' ')
    }
  } catch { /* ignore */ }
  return null
}

export default function VideoLinkPreview({ url }: VideoLinkPreviewProps) {
  const thumbnail = useMemo(() => getVideoThumbnail(url), [url])
  const domain = useMemo(() => getDomain(url), [url])
  const title = useMemo(() => getTitle(url), [url])
  const [thumbLoaded, setThumbLoaded] = useState(false)
  const [thumbFailed, setThumbFailed] = useState(false)

  const handleOpen = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleOpen()
    }
  }

  const showThumb = thumbnail && !thumbFailed

  return (
    <div
      className={styles.card}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      title={url}
    >
      <div className={styles.thumbnailWrap}>
        {showThumb ? (
          <>
            {!thumbLoaded && (
              <div className={styles.loadingThumb}>
                <i className="bx bx-loader-circle bx-spin" />
              </div>
            )}
            <img
              src={thumbnail}
              alt=""
              className={styles.thumbnail}
              loading="lazy"
              onLoad={() => setThumbLoaded(true)}
              onError={() => setThumbFailed(true)}
              style={thumbLoaded ? undefined : { position: 'absolute', opacity: 0 }}
            />
          </>
        ) : (
          <div className={styles.thumbnailPlaceholder}>
            <i className="bx bx-video" />
          </div>
        )}
        <div className={styles.playBtn}>
          <i className={`bx bx-play ${styles.playIcon}`} />
        </div>
      </div>
      <div className={styles.info}>
        <span className={styles.domain}>{domain}</span>
        {title && <span className={styles.title}>{title}</span>}
      </div>
    </div>
  )
}
