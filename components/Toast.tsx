'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import styles from './Toast.module.css'
import { useTranslation } from '../hooks/useTranslation'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: ToastAction
  exiting?: boolean
}

interface ToastItemProps {
  toast: ToastMessage
  onRemove: (id: string) => void
}

const ICONS: Record<ToastMessage['type'], string> = {
  success: 'bxs-check-circle',
  error: 'bxs-x-circle',
  warning: 'bxs-error',
  info: 'bxs-info-circle',
}

const SWIPE_THRESHOLD = 60

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const { t } = useTranslation()
  const { id, type, title, message, action, exiting } = toast
  const duration = toast.duration || 4000
  const [paused, setPaused] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [dragging, setDragging] = useState(false)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const remainingRef = useRef(duration)
  const startedAtRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const axisRef = useRef<'x' | 'y' | null>(null)
  const touchStartRef = useRef({ x: 0, y: 0 })
  const swipeXRef = useRef(0)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const arm = useCallback(
    (ms: number) => {
      clearTimer()
      startedAtRef.current = Date.now()
      timerRef.current = setTimeout(() => onRemove(id), ms)
    },
    [clearTimer, onRemove, id]
  )

  const pause = useCallback(() => {
    if (exiting) return
    if (timerRef.current) {
      const elapsed = Date.now() - startedAtRef.current
      remainingRef.current = Math.max(0, remainingRef.current - elapsed)
      clearTimer()
    }
    setPaused(true)
  }, [clearTimer, exiting])

  const resume = useCallback(() => {
    if (exiting) return
    if (rootRef.current?.contains(document.activeElement)) return
    setPaused(false)
    arm(remainingRef.current)
  }, [arm, exiting])

  useEffect(() => {
    if (exiting) {
      clearTimer()
      return
    }
    arm(remainingRef.current)
    return clearTimer
  }, [exiting, arm, clearTimer])

  const handleAction = () => {
    action?.onClick()
    onRemove(id)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (exiting) return
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    axisRef.current = null
    setDragging(true)
    pause()
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (exiting) return
    const dx = e.touches[0].clientX - touchStartRef.current.x
    const dy = e.touches[0].clientY - touchStartRef.current.y
    if (!axisRef.current) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        axisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      }
    }
    if (axisRef.current === 'x') {
      swipeXRef.current = dx
      setSwipeX(dx)
    }
  }

  const handleTouchEnd = () => {
    setDragging(false)
    const axis = axisRef.current
    const dx = swipeXRef.current
    axisRef.current = null
    swipeXRef.current = 0
    if (axis === 'x' && Math.abs(dx) > SWIPE_THRESHOLD) {
      setSwipeX(dx > 0 ? 400 : -400)
      onRemove(id)
      return
    }
    setSwipeX(0)
    resume()
  }

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) resume()
  }

  const canHover = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover)').matches

  const handleMouseEnter = () => {
    if (canHover()) pause()
  }

  const handleMouseLeave = () => {
    if (canHover()) resume()
  }

  return (
    <div
      ref={rootRef}
      className={`${styles.toast} ${styles[type]}${exiting ? ` ${styles.exit}` : ''}`}
      role={type === 'error' ? 'alert' : 'status'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={pause}
      onBlur={handleBlur}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className={`${styles.swipe}${dragging ? ` ${styles.dragging}` : ''}`}
        style={{ transform: `translateX(${swipeX}px)` }}
      >
        <div className={styles.card}>
          <div className={styles.body}>
            <span className={styles.chip}>
              <i className={`bx ${ICONS[type]}`} />
            </span>
            <div className={styles.content}>
              <p className={styles.title}>{title}</p>
              {message && <p className={styles.message}>{message}</p>}
            </div>
            {action && (
              <button className={styles.action} onClick={handleAction}>
                {action.label}
              </button>
            )}
            <button
              className={styles.close}
              onClick={() => onRemove(id)}
              aria-label={t('close')}
            >
              <i className="bx bx-x" />
            </button>
          </div>
          <div className={styles.progress}>
            <div
              className={styles.progressBar}
              style={{
                animationDuration: `${duration}ms`,
                animationPlayState: paused ? 'paused' : 'running',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export interface ToastContainerProps {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className={styles.container} aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}
