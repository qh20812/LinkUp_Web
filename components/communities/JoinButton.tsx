'use client'

import { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import { joinCommunity, leaveCommunity } from '../../api/communities'
import styles from './JoinButton.module.css'

interface JoinButtonProps {
  communityID: string
  status: 'none' | 'pending' | 'member' | 'admin' | 'creator'
  privacy: 'public' | 'invitation_only'
  onStatusChange: (newStatus: 'none' | 'pending' | 'member' | 'admin' | 'creator') => void
}

export default function JoinButton({
  communityID,
  status,
  privacy,
  onStatusChange,
}: JoinButtonProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    setLoading(true)
    try {
      await joinCommunity(communityID)
      const newStatus = privacy === 'public' ? 'member' : 'pending'
      onStatusChange(newStatus)
      toast({ type: 'success', title: t('communities.joinSuccess') })
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('communities.joinError'),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLeave = async () => {
    setLoading(true)
    try {
      await leaveCommunity(communityID)
      onStatusChange('none')
      toast({ type: 'success', title: t('communities.leaveSuccess') })
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('communities.leaveError'),
      })
    } finally {
      setLoading(false)
    }
  }

  if (status === 'admin' || status === 'creator') {
    return (
      <button className={`${styles.button} ${styles.outline}`} disabled>
        {t('communities.manage')}
      </button>
    )
  }

  if (status === 'pending') {
    return (
      <button className={`${styles.button} ${styles.outline} ${styles.disabled}`} disabled>
        {t('communities.pendingApproval')}
      </button>
    )
  }

  if (status === 'member') {
    return (
      <button
        className={`${styles.button} ${styles.ghost}`}
        onClick={handleLeave}
        disabled={loading}
      >
        {loading ? t('communities.leaving') : t('communities.leave')}
      </button>
    )
  }

  if (privacy === 'invitation_only') {
    return (
      <button className={`${styles.button} ${styles.outline} ${styles.disabled}`} disabled>
        {t('communities.inviteOnly')}
      </button>
    )
  }

  return (
    <button
      className={`${styles.button} ${styles.primary}`}
      onClick={() => handleJoin()}
      disabled={loading}
    >
      {loading ? t('communities.joining') : t('communities.join')}
    </button>
  )
}
