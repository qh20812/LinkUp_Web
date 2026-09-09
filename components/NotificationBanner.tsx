'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ExternalImage from './ExternalImage'
import { useNotification } from '../contexts/NotificationContext'
import { useTranslation } from '../hooks/useTranslation'
import { notificationHref } from '../utils/notificationNavigate'
import type { NotificationItem, NotificationType } from '../types'
import styles from './NotificationBanner.module.css'

function getIconClass(type: NotificationType): string {
  switch (type) {
    case 'like':
      return 'bx bx-heart ' + styles.iconLike
    case 'comment':
      return 'bx bx-message-dots ' + styles.iconComment
    case 'share':
      return 'bx bx-share-alt ' + styles.iconLike
    case 'follow':
      return 'bx bx-user-plus ' + styles.iconFollow
    case 'message':
      return 'bx bx-envelope ' + styles.iconMessage
    case 'friend_request':
    case 'friend_accepted':
      return 'bx bx-group ' + styles.iconFriend
    case 'voice_call':
      return 'bx bx-phone ' + styles.iconCall
    case 'media_approved':
      return 'bx bx-check-circle ' + styles.iconFollow
    case 'media_rejected':
      return 'bx bx-x-circle ' + styles.iconCall
    case 'media_flagged':
      return 'bx bx-error ' + styles.iconComment
    default:
      return 'bx bx-bell ' + styles.iconCommunity
  }
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext()

    // "Ding" — high note
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(1200, ctx.currentTime)
    gain1.gain.setValueAtTime(0.3, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.3)

    // "Dong" — lower note
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(900, ctx.currentTime + 0.15)
    gain2.gain.setValueAtTime(0, ctx.currentTime)
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6)
    osc2.start(ctx.currentTime + 0.15)
    osc2.stop(ctx.currentTime + 0.6)
  } catch {
    // AudioContext not available — silently ignore
  }
}

export default function NotificationBanner() {
  const { t } = useTranslation()
  const router = useRouter()
  const { unreadCount, notifications } = useNotification()

  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [current, setCurrent] = useState<NotificationItem | null>(null)

  const prevCountRef = useRef(unreadCount)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setLeaving(true)
    setTimeout(() => {
      setVisible(false)
      setLeaving(false)
      setCurrent(null)
    }, 350)
  }, [])

  useEffect(() => {
    const prev = prevCountRef.current
    prevCountRef.current = unreadCount

    if (unreadCount > prev && notifications.length > 0) {
      const latest = notifications[0]
      const item: NotificationItem = {
        id: latest.ids[0] ?? '',
        sender_id: latest.sender_id,
        sender_name: latest.sender_name,
        sender_avatar: latest.sender_avatar,
        type: latest.type,
        content: latest.content,
        is_read: latest.is_read,
        created_at: latest.created_at,
        redirect_post_id: latest.redirect_post_id,
        redirect_user_id: latest.redirect_user_id,
        redirect_comment_id: latest.redirect_comment_id,
      }

      if (timerRef.current) clearTimeout(timerRef.current)

      setCurrent(item)
      setLeaving(false)
      setVisible(true)
      playNotificationSound()

      timerRef.current = setTimeout(() => {
        dismiss()
      }, 5000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadCount])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleClick = () => {
    if (!current) return
    dismiss()
    const href = notificationHref(current)
    if (href) router.push(href)
    else router.push('/notifications')
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    dismiss()
  }

  if (!visible || !current) return null

  const className = `${styles.banner}${visible && !leaving ? ` ${styles.bannerVisible}` : ''}${leaving ? ` ${styles.bannerLeaving}` : ''}`

  return (
    <div className={className} onClick={handleClick}>
      {current.sender_avatar ? (
        <ExternalImage src={current.sender_avatar} alt="" className={styles.avatar} />
      ) : (
        <div className={styles.iconWrapper}>
          <i className={getIconClass(current.type)} />
        </div>
      )}
      <div className={styles.body}>
        <p className={styles.content}>
          {current.sender_name && (
            <strong className={styles.senderName}>{current.sender_name} </strong>
          )}
          {current.content}
        </p>
      </div>
      <button className={styles.closeBtn} onClick={handleClose} aria-label={t('common.close')}>
        <i className="bx bx-x" />
      </button>
    </div>
  )
}
