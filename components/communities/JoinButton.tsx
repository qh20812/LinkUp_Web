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
  privacy: 'public' | 'code' | 'invitation_only'
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
  const [codeModalOpen, setCodeModalOpen] = useState(false)
  const [code, setCode] = useState('')

  const handleJoin = async (codeValue?: string) => {
    setLoading(true)
    try {
      await joinCommunity(communityID, codeValue)
      const newStatus = privacy === 'public' && !codeValue ? 'member' : 'pending'
      onStatusChange(newStatus)
      toast({ type: 'success', title: t('communities.joinSuccess') })
      setCodeModalOpen(false)
      setCode('')
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

  const handleCodeSubmit = () => {
    const trimmed = code.trim()
    if (!trimmed) return
    handleJoin(trimmed)
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

  if (privacy === 'code') {
    return (
      <>
        <button
          className={`${styles.button} ${styles.primary}`}
          onClick={() => setCodeModalOpen(true)}
        >
          {t('communities.enterCode')}
        </button>
        <Modal
          open={codeModalOpen}
          onClose={() => {
            setCodeModalOpen(false)
            setCode('')
          }}
          title={t('communities.enterCodeTitle')}
          footer={
            <button
              className={`${styles.button} ${styles.primary}`}
              onClick={handleCodeSubmit}
              disabled={loading || !code.trim()}
            >
              {loading ? t('communities.joining') : t('communities.join')}
            </button>
          }
        >
          <div className={styles.codeModal}>
            <input
              className={styles.codeInput}
              type="text"
              maxLength={6}
              placeholder="ABCDEF"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCodeSubmit()
              }}
              autoFocus
            />
            <span className={styles.codeHint}>{t('communities.codeHint')}</span>
          </div>
        </Modal>
      </>
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
