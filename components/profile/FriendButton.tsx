'use client'

import { useState, useEffect } from 'react'
import styles from './FriendButton.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import { getFriendStatus, toggleFriendRequest, acceptFriendRequest, unfriend } from '../../api/friends'
import type { FriendStatusResponse } from '../../types'

interface FriendButtonProps {
  userID: string
  onStatusChange?: (status: string) => void
}

export default function FriendButton({ userID, onStatusChange }: FriendButtonProps) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<FriendStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    getFriendStatus(userID)
      .then((res) => {
        if (!cancelled) {
          setStatus(res)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userID])

  const handleAction = async () => {
    if (!status || actionLoading) return
    setActionLoading(true)
    try {
      if (status.status === 'none') {
        await toggleFriendRequest(userID)
        setStatus({ status: 'sent' })
        onStatusChange?.('sent')
      } else if (status.status === 'sent') {
        await toggleFriendRequest(userID)
        setStatus({ status: 'none' })
        onStatusChange?.('none')
      } else if (status.status === 'received' && status.request_id) {
        await acceptFriendRequest(status.request_id)
        setStatus({ status: 'accepted' })
        onStatusChange?.('accepted')
      } else if (status.status === 'accepted') {
        await unfriend(userID)
        setStatus({ status: 'none' })
        onStatusChange?.('none')
      }
    } catch {
      /* ignore */
    } finally {
      setActionLoading(false)
    }
  }

  if (loading || !status || status.status === 'self') return null

  const getButtonConfig = () => {
    switch (status.status) {
      case 'none':
        return { label: t('friends.addFriend'), icon: 'bx bx-user-plus', className: '' }
      case 'sent':
        return { label: t('friends.sent'), icon: 'bx bx-time-five', className: styles.btnSent }
      case 'received':
        return { label: t('friends.accept'), icon: 'bx bx-check', className: styles.btnAccept }
      case 'accepted':
        return { label: t('friends.unfriend'), icon: 'bx bx-user-check', className: styles.btnAccepted }
      default:
        return { label: t('friends.addFriend'), icon: 'bx bx-user-plus', className: '' }
    }
  }

  const config = getButtonConfig()

  return (
    <button
      className={`${styles.btn} ${config.className}`}
      onClick={handleAction}
      disabled={actionLoading || status.status === 'sent'}
    >
      <i className={`bx ${config.icon}`} />
      <span>{config.label}</span>
    </button>
  )
}
