'use client'

import type { CSSProperties } from 'react'
import ExternalImage from '../ExternalImage'
import styles from './StoryAvatar.module.css'

interface StoryAvatarProps {
  src: string
  name: string
  hasStory: boolean
  hasViewed?: boolean
  /** Cạnh cố định (px). Bị bỏ qua khi bật `fluid`. */
  size?: number
  /**
   * Co giãn theo khung cha (100%) thay vì ép pixel cứng.
   *
   * Cần cho avatar ở trang profile: CSS đổi khung 120px → 96px ở mobile, còn
   * inline `width/height` thì không đổi theo, khiến vành story tràn ra ngoài
   * khung và đè lên viền trắng + quầng sáng.
   */
  fluid?: boolean
  onClick?: () => void
}

export default function StoryAvatar({
  src,
  name,
  hasStory,
  hasViewed = false,
  size = 48,
  fluid = false,
  onClick,
}: StoryAvatarProps) {
  const boxStyle: CSSProperties | undefined = fluid
    ? undefined
    : { width: size, height: size }
  const iconStyle: CSSProperties | undefined = fluid
    ? undefined
    : { fontSize: size * 0.5 }
  const fluidClass = fluid ? ` ${styles.fluid}` : ''

  if (!hasStory) {
    return (
      <div
        className={`${styles.noRing}${fluidClass}`}
        style={boxStyle}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {src ? (
          <ExternalImage src={src} alt={name} className={styles.avatar} style={boxStyle} />
        ) : (
          <i className="bx bxs-user" style={iconStyle} />
        )}
      </div>
    )
  }

  return (
    <div
      className={`${styles.ring} ${hasViewed ? styles.ringViewed : ''}${fluidClass}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={styles.ringInner}>
        {src ? (
          <ExternalImage src={src} alt={name} className={styles.avatar} style={boxStyle} />
        ) : (
          <div className={styles.avatar} style={{ ...boxStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)' }}>
            <i className="bx bxs-user" style={iconStyle} />
          </div>
        )}
      </div>
    </div>
  )
}
