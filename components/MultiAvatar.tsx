'use client'

import ExternalImage from './ExternalImage'
import styles from './MultiAvatar.module.css'

interface MultiAvatarProps {
  srcs: string[]
  size?: number
  className?: string
}

export default function MultiAvatar({ srcs, size = 40, className }: MultiAvatarProps) {
  const count = srcs.length
  const visible = srcs.slice(0, 3)
  const overflow = count - visible.length

  if (count === 0) {
    return (
      <div
        className={`${styles.wrap} ${className ?? ''}`}
        style={{ width: size, height: size }}
      >
        <div className={styles.single}>
          <i className="bx bx-group" />
        </div>
      </div>
    )
  }

  if (count === 1) {
    return (
      <div
        className={`${styles.wrap} ${className ?? ''}`}
        style={{ width: size, height: size }}
      >
        <div className={styles.single}>
          {visible[0] ? (
            <ExternalImage src={visible[0]} alt="" />
          ) : (
            <i className="bx bxs-user" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${styles.wrap} ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      {visible.map((src, i) => (
        <div
          key={i}
          className={`${styles.layer} ${styles[`pos${i}`]}`}
          style={{ width: size * 0.65, height: size * 0.65 }}
        >
          {src ? (
            <ExternalImage src={src} alt="" />
          ) : (
            <i className="bx bxs-user" />
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={`${styles.layer} ${styles.overflow}`}
          style={{ width: size * 0.5, height: size * 0.5 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
