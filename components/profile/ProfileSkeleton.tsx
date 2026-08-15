'use client'

import styles from './ProfileSkeleton.module.css'

interface ProfileSkeletonProps {
  showCover?: boolean
}

export default function ProfileSkeleton({ showCover = true }: ProfileSkeletonProps) {
  return (
    <div className={styles.skeleton}>
      {showCover && <div className={styles.cover} />}
      <div className={styles.body}>
        <div className={styles.headerTop}>
          <div className={styles.avatar} />
          <div className={styles.info}>
            <div className={`${styles.line} ${styles.lineWide}`} />
            <div className={`${styles.line} ${styles.lineMedium}`} />
            <div className={`${styles.line} ${styles.lineShort}`} />
          </div>
        </div>
        <div className={styles.stats}>
          <div className={`${styles.line} ${styles.lineShort}`} />
          <div className={`${styles.line} ${styles.lineShort}`} />
        </div>
        <div className={styles.actions}>
          <div className={`${styles.line} ${styles.linePill}`} />
          <div className={`${styles.line} ${styles.linePill}`} />
        </div>
      </div>
    </div>
  )
}
