import React from 'react'
import styles from './OnlineIndicator.module.css'

interface OnlineIndicatorProps {
  isOnline: boolean
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function OnlineIndicator({
  isOnline,
  size = 'medium',
  className = '',
}: OnlineIndicatorProps) {
  if (!isOnline) return null

  return (
    <span
      className={`${styles.indicator} ${styles[size]} ${styles.online} ${className}`}
      aria-label="Online"
    />
  )
}
