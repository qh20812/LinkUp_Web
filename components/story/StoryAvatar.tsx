'use client'

import ExternalImage from '../ExternalImage'
import styles from './StoryAvatar.module.css'

interface StoryAvatarProps {
  src: string
  name: string
  hasStory: boolean
  hasViewed?: boolean
  size?: number
  onClick?: () => void
}

export default function StoryAvatar({
  src,
  name,
  hasStory,
  hasViewed = false,
  size = 48,
  onClick,
}: StoryAvatarProps) {
  const imgStyle = { width: size, height: size }

  if (!hasStory) {
    return (
      <div
        className={styles.noRing}
        style={imgStyle}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {src ? (
          <ExternalImage src={src} alt={name} className={styles.avatar} style={imgStyle} />
        ) : (
          <i className="bx bxs-user" style={{ fontSize: size * 0.5 }} />
        )}
      </div>
    )
  }

  return (
    <div
      className={`${styles.ring} ${hasViewed ? styles.ringViewed : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={styles.ringInner}>
        {src ? (
          <ExternalImage src={src} alt={name} className={styles.avatar} style={imgStyle} />
        ) : (
          <div className={styles.avatar} style={{ ...imgStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)' }}>
            <i className="bx bxs-user" style={{ fontSize: size * 0.5 }} />
          </div>
        )}
      </div>
    </div>
  )
}
