'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '../Modal'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import { request } from '../../api/api'
import styles from './CreateCommunityModal.module.css'

type Privacy = 'public' | 'invitation_only'

interface CreateCommunityModalProps {
  open: boolean
  onClose: () => void
}

export default function CreateCommunityModal({ open, onClose }: CreateCommunityModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const bgInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [privacy, setPrivacy] = useState<Privacy>('public')
  const [autoApprove, setAutoApprove] = useState(true)

  const [bgFile, setBgFile] = useState<File | null>(null)
  const [bgPreview, setBgPreview] = useState<string>('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')

  const [loading, setLoading] = useState(false)

  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBgFile(file)
    const reader = new FileReader()
    reader.onload = () => setBgPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleRemoveBg = () => {
    setBgFile(null)
    setBgPreview('')
    if (bgInputRef.current) bgInputRef.current.value = ''
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!name.trim() || name.trim().length < 3) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      if (description.trim()) formData.append('description', description.trim())
      formData.append('privacy', privacy)
      formData.append('auto_approve', String(autoApprove))
      if (avatarFile) formData.append('avatar', avatarFile)
      if (bgFile) formData.append('background', bgFile)

      const res = await request<{ community_id: string }>('/communities', {
        method: 'POST',
        body: formData,
      })

      toast({ type: 'success', title: t('communities.createSuccess') })
      onClose()
      router.push(`/communities/${res.community_id}`)
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('communities.createError'),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setName('')
    setDescription('')
    setPrivacy('public')
    setAutoApprove(true)
    setBgFile(null)
    setBgPreview('')
    setAvatarFile(null)
    setAvatarPreview('')
    onClose()
  }

  const privacyOptions: { value: Privacy; icon: string; labelKey: string }[] = [
    { value: 'public', icon: 'bx-globe', labelKey: 'communities.privacyPublic' },
    { value: 'invitation_only', icon: 'bx-lock-alt', labelKey: 'communities.privacyInvitation' },
  ]

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('communities.createTitle')}
      footer={
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={handleClose} disabled={loading}>
            {t('common.cancel')}
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={loading || !name.trim() || name.trim().length < 3}
          >
            {loading ? t('communities.creating') : t('communities.createSubmit')}
          </button>
        </div>
      }
    >
      <div className={styles.form}>
        {/* Background + Avatar section */}
        <div className={styles.heroSection}>
          <div className={styles.bgSection}>
            {bgPreview ? (
              <div className={styles.bgPreview}>
                <img src={bgPreview} alt="Background preview" className={styles.bgImg} />
                <button className={styles.removeBg} onClick={handleRemoveBg} disabled={loading}>
                  <i className="bx bx-x" />
                </button>
              </div>
            ) : (
              <button
                className={styles.bgUpload}
                onClick={() => bgInputRef.current?.click()}
                disabled={loading}
              >
                <i className="bx bx-image-add" />
                <span>{t('communities.createBackgroundHint')}</span>
              </button>
            )}
            <input
              ref={bgInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className={styles.fileInput}
              onChange={handleBgChange}
            />
          </div>

          <div className={styles.avatarOverlay}>
            {avatarPreview ? (
              <div className={styles.avatarPreview} onClick={() => avatarInputRef.current?.click()}>
                <img src={avatarPreview} alt="Avatar preview" className={styles.avatarImg} />
              </div>
            ) : (
              <button
                className={styles.avatarUpload}
                onClick={() => avatarInputRef.current?.click()}
                disabled={loading}
              >
                <i className="bx bx-camera" />
              </button>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className={styles.fileInput}
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        {/* Name */}
        <div className={styles.field}>
          <label className={styles.label}>{t('communities.createName')}</label>
          <input
            className={styles.input}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('communities.createName')}
            maxLength={100}
            disabled={loading}
          />
          <span className={styles.hint}>{name.length}/100</span>
        </div>

        {/* Description */}
        <div className={styles.field}>
          <label className={styles.label}>{t('communities.createDesc')}</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('communities.createDesc')}
            maxLength={500}
            rows={3}
            disabled={loading}
          />
          <span className={styles.hint}>{description.length}/500</span>
        </div>

        {/* Privacy */}
        <div className={styles.field}>
          <label className={styles.label}>{t('communities.privacy')}</label>
          <div className={styles.privacyOptions}>
            {privacyOptions.map(opt => (
              <button
                key={opt.value}
                className={`${styles.privacyOption} ${privacy === opt.value ? styles.privacyOptionActive : ''}`}
                onClick={() => setPrivacy(opt.value)}
                disabled={loading}
                type="button"
              >
                <i className={`bx ${opt.icon}`} />
                <span>{t(opt.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Auto-approve */}
        <div className={styles.field}>
          <label className={styles.label}>{t('communities.autoApprove')}</label>
          <div className={styles.toggleRow}>
            <button
              className={`${styles.toggle} ${autoApprove ? styles.toggleActive : ''}`}
              onClick={() => setAutoApprove(!autoApprove)}
              disabled={loading}
              type="button"
            >
              <div className={styles.toggleKnob} />
            </button>
            <span className={styles.toggleLabel}>
              {autoApprove ? t('communities.autoApproveOn') : t('communities.autoApproveOff')}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
