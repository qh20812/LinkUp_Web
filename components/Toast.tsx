'use client'

import React, { useEffect, useState } from 'react'
import styles from './Toast.module.css'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

interface ToastItemProps {
  toast: ToastMessage
  onRemove: (id: string) => void
}

const ICONS: Record<ToastMessage['type'], string> = {
  success: 'bx-check-circle',
  error: 'bx-x-circle',
  warning: 'bx-error',
  info: 'bx-info-circle',
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [exiting, setExiting] = useState(false)
  const duration = toast.duration || 4000

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onRemove(toast.id), 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.id, duration, onRemove])

  const handleClose = () => {
    setExiting(true)
    setTimeout(() => onRemove(toast.id), 300)
  }

  return (
    <div
      className={`${styles.toast} ${styles[toast.type]}${exiting ? ` ${styles.exit}` : ''}`}
      role="alert"
    >
      <div className={styles.accent} />
      <div className={styles.body}>
        <i className={`bx ${ICONS[toast.type]} ${styles.icon}`} />
        <div className={styles.content}>
          <p className={styles.title}>{toast.title}</p>
          {toast.message && <p className={styles.message}>{toast.message}</p>}
        </div>
        <button className={styles.close} onClick={handleClose} aria-label="Close">
          <i className="bx bx-x" />
        </button>
      </div>
      <div className={styles.progress}>
        <div className={styles.progressBar} style={{ animationDuration: `${duration}ms` }} />
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
    <div className={styles.container} aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}
