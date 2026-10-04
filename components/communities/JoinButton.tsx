'use client'

import { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import { joinCommunity, leaveCommunity } from '../../api/communities'
import Modal from '../Modal'
import styles from './JoinButton.module.css'

interface JoinButtonProps {
  communityID: string
  status: 'none' | 'pending' | 'member' | 'admin' | 'creator'
  privacy: 'public' | 'invitation_only'
  onStatusChange: (newStatus: 'none' | 'pending' | 'member' | 'admin' | 'creator') => void
  onRequestCode?: () => void
}

export default function JoinButton({
  communityID,
  status,
  privacy,
  onStatusChange,
  onRequestCode,
}: JoinButtonProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)

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
      setConfirmLeave(false)
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
      <span className={`${styles.button} ${styles.manage}`} role="status">
        <i className="bx bx-cog" aria-hidden /> {t('communities.manage')}
      </span>
    )
  }

  if (status === 'pending') {
    return (
      <span className={`${styles.button} ${styles.pending}`} role="status" aria-live="polite">
        <i className="bx bx-check" aria-hidden /> {t('communities.pendingApproval')}
      </span>
    )
  }

  if (status === 'member') {
    return (
      <>
        <button
          type="button"
          className={`${styles.button} ${styles.ghost}`}
          onClick={() => setConfirmLeave(true)}
          disabled={loading}
        >
          {t('communities.leave')}
        </button>
        <Modal
          open={confirmLeave}
          onClose={() => setConfirmLeave(false)}
          title={t('communities.leaveConfirmTitle')}
          footer={
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setConfirmLeave(false)}
                disabled={loading}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={handleLeave}
                disabled={loading}
              >
                {loading ? t('communities.leaving') : t('communities.leave')}
              </button>
            </div>
          }
        >
          <p className={styles.confirmText}>{t('communities.leaveConfirmBody')}</p>
        </Modal>
      </>
    )
  }

  if (privacy === 'invitation_only') {
    return (
      <span className={`${styles.button} ${styles.locked}`} role="status">
        <i className="bx bx-lock-alt" aria-hidden /> {t('communities.inviteOnlyShort')}
      </span>
    )
  }

  void onRequestCode
  return (
    <button
      type="button"
      className={`${styles.button} ${styles.primary}`}
      onClick={handleJoin}
      disabled={loading}
    >
      {loading ? t('communities.joining') : t('communities.join')}
    </button>
  )
}
