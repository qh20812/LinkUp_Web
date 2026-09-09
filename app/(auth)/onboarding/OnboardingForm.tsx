'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { uploadAvatar, updateProfile } from '../../../api/profile'
import AuthCard from '../../../components/auth/AuthCard'
import AuthSplit from '../../../components/auth/AuthSplit'
import styles from './OnboardingForm.module.css'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_BIO_LENGTH = 200

export default function OnboardingForm() {
  const [step, setStep] = useState(1)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { t } = useTranslation()
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({ type: 'error', title: t('onboarding.invalidFileType') })
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({ type: 'error', title: t('onboarding.fileTooLarge') })
      return
    }

    setAvatarFile(file)
    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      let finalAvatarUri: string | null = null

      if (avatarFile) {
        const uploadRes = await uploadAvatar(avatarFile)
        finalAvatarUri = uploadRes.data.file_uri
      }

      const profileUpdate: { avatar_uri?: string; bio?: string } = {}
      if (finalAvatarUri) profileUpdate.avatar_uri = finalAvatarUri
      if (bio.trim()) profileUpdate.bio = bio.trim()

      if (Object.keys(profileUpdate).length > 0) {
        const res = await updateProfile(profileUpdate)
        if (!res.data) throw new Error(t('onboarding.updateError'))
      }

      router.push('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : t('onboarding.updateError')
      toast({ type: 'error', title: message })
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    router.push('/')
  }

  return (
    <AuthSplit>
      <AuthCard>
        <div className={styles.logo}>
          <Image src="/S-Logo-Rmbg.png" alt="LinkUp" width={500} height={500} className={styles.logoImg} priority />
          <span className={styles.logoText}>LinkUp</span>
        </div>

        <h1 className={styles.title}>{t('onboarding.title')}</h1>
        <p className={styles.subtitle}>{t('onboarding.subtitle')}</p>

        <div className={styles.stepIndicator}>
          <span className={`${styles.dot}${step === 1 ? ` ${styles.dotActive}` : ''}`} />
          <span className={`${styles.dot}${step === 2 ? ` ${styles.dotActive}` : ''}`} />
        </div>

        {step === 1 ? (
          <div className={styles.avatarSection}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.fileInput}
              onChange={handleFileSelect}
            />
            <div
              className={styles.avatarCircle}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              {avatarPreview ? (
                <Image src={avatarPreview} alt="Avatar" fill unoptimized />
              ) : (
                <i className={`bx bx-user ${styles.avatarIcon}`} />
              )}
            </div>
            <p className={styles.avatarHint}>{t('onboarding.avatarHint')}</p>

            {avatarPreview && (
              <div className={styles.avatarActions}>
                <button
                  type="button"
                  className={styles.avatarActionBtn}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('onboarding.changePhoto')}
                </button>
                <button
                  type="button"
                  className={`${styles.avatarActionBtn} ${styles.avatarActionBtnDanger}`}
                  onClick={handleRemoveAvatar}
                >
                  {t('onboarding.removePhoto')}
                </button>
              </div>
            )}

            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={handleSkip}
              >
                {t('onboarding.skip')}
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={() => setStep(2)}
              >
                {t('onboarding.next')}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.bioSection}>
            <label className={styles.bioLabel}>{t('onboarding.bioLabel')}</label>
            <textarea
              className={styles.bioTextarea}
              placeholder={t('onboarding.bioPlaceholder')}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={MAX_BIO_LENGTH}
            />
            <span className={styles.bioCounter}>
              {MAX_BIO_LENGTH - bio.length} {t('onboarding.bioMaxLength')}
            </span>

            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={handleSkip}
              >
                {t('onboarding.skip')}
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? '...' : t('onboarding.complete')}
              </button>
            </div>
          </div>
        )}
      </AuthCard>
    </AuthSplit>
  )
}
