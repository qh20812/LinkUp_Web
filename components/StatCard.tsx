import React, { useState, useEffect, useRef } from 'react'
import styles from './StatCard.module.css'

interface StatCardProps {
  title: string
  value: string | number
  icon: string
  color: string
  loading?: boolean
  animateValue?: number
  trend?: number | null
}

export default function StatCard({ title, value, icon, color, loading, animateValue, trend }: StatCardProps) {
  const [display, setDisplay] = useState(0)
  const [ready, setReady] = useState(false)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    if (loading || animateValue === undefined) return

    const duration = 800
    const start = performance.now()
    const from = 0
    const to = animateValue

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * eased))

      if (progress < 1) {
        raf.current = requestAnimationFrame(tick)
      } else {
        setReady(true)
      }
    }

    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [loading, animateValue])

  const formatted = (() => {
    if (animateValue !== undefined && !loading) {
      if (ready && display >= 1_000_000) return `${(display / 1_000_000).toFixed(1)}M`
      if (ready && display >= 1_000) return `${(display / 1_000).toFixed(1)}K`
      return display.toLocaleString()
    }
    return value
  })()

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.accent} style={{ background: color }} />
        <div className={styles.body}>
          <div className={styles.skeletonIcon} />
          <div className={styles.skeletonContent}>
            <div className={styles.skeletonTitle} />
            <div className={styles.skeletonValue} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.accent} style={{ background: color }} />
      <div className={styles.body}>
        <div className={styles.iconWrap} style={{ background: `${color}1A`, color }}>
          <i className={icon} />
        </div>
        <div className={styles.content}>
          <p className={styles.title}>{title}</p>
          <p className={styles.value}>{formatted}</p>
          {trend !== undefined && trend !== null && (
            <p className={`${styles.trend} ${trend > 0 ? styles.trendUp : trend < 0 ? styles.trendDown : styles.trendFlat}`}>
              <i className={`bx ${trend > 0 ? 'bx-trending-up' : trend < 0 ? 'bx-trending-down' : 'bx-minus'}`} />
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
