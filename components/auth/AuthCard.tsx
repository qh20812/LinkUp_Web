import React from 'react'
import styles from './AuthCard.module.css'

export default function AuthCard({
  children,
  className,
  cardClassName,
}: {
  children: React.ReactNode
  className?: string
  cardClassName?: string
}) {
  return (
    <div className={`${styles.wrap}${className ? ` ${className}` : ''}`}>
      <div className={`${styles.card}${cardClassName ? ` ${cardClassName}` : ''}`}>{children}</div>
    </div>
  )
}