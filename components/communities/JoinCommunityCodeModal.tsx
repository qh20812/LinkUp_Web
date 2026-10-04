'use client'

import { useState } from 'react'
import Modal from '../Modal'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import { joinCommunity } from '../../api/communities'
import styles from './JoinCommunityCodeModal.module.css'

interface JoinCommunityCodeModalProps {
  open: boolean
  communityID: string
  communityName: string
  onClose: () => void
  onJoined: (status: 'member' | 'pending') => void
}

export default function JoinCommunityCodeModal({
  open,
  communityID,
  communityName,
  onClose,
  onJoined,
}: JoinCommunityCodeModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    if (loading) return
    setCode('')
    setError('')
    onClose()
  }

  const handleSubmit = async () => {
    const normalized = code.trim().toUpperCase()
    if (!normalized) {
      setError(t('communities.codeRequired'))
      return
    }
    setLoading(true)
    setError('')
    try {
      await joinCommunity(communityID, normalized)
      toast({ type: 'success', title: t('communities.joinSuccess') })
      const status: 'member' | 'pending' = 'member'
      setCode('')
      onClose()
      onJoined(status)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('communities.joinError')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('communities.enterCodeTitle')}
      footer={
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={handleClose} disabled={loading}>
            {t('common.cancel')}
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={loading || !code.trim()}
          >
            {loading ? t('communities.joining') : t('communities.join')}
          </button>
        </div>
      }
    >
      <div className={styles.body}>
        <p className={styles.communityName}>{communityName}</p>
        <input
          className={`${styles.codeInput} ${error ? styles.codeInputInvalid : ''}`}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32))
            if (error) setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSubmit()
            }
          }}
          placeholder={t('communities.codePlaceholder')}
          maxLength={32}
          autoFocus
          aria-invalid={!!error}
          aria-label={t('communities.enterCode')}
        />
        {error ? (
          <p className={styles.error} role="alert">{error}</p>
        ) : (
          <p className={styles.hint}>{t('communities.codeHint')}</p>
        )}
      </div>
    </Modal>
  )
}
