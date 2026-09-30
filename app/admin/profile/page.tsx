'use client'

import React, { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { getMyProfile, updateProfile, uploadAvatar } from '../../../api/profile'
import { changePassword, getTokenPayload } from '../../../api/auth'
import { invalidate } from '../../../api/swr'
import styles from './Profile.module.css'

export default function AdminProfilePage() {
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [role, setRole] = useState<string>('')

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [copied, setCopied] = useState(false)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const payload = getTokenPayload()
    if (!payload) {
      router.push('/login')
      return
    }
    if (payload.role !== 'ADMIN' && payload.role !== 'SUPER_ADMIN') {
      toast({ title: t('settings.unauthorized'), type: 'error' })
      router.push('/')
      return
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    setRole(payload.role)
    setAuthorized(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [router, toast, t])

  const { data, error, isLoading } = useSWR(
    authorized ? '/profile' : null,
    getMyProfile,
    { revalidateOnFocus: false },
  )

  useEffect(() => {
    if (data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayName(data.display_name ?? '')
      setBio(data.bio ?? '')
    }
  }, [data])

  const nameError =
    nameTouched && !displayName.trim() ? t('settings.validationRequired') : null
  const dirty =
    !!data &&
    (displayName.trim() !== (data.display_name ?? '') || bio !== (data.bio ?? ''))
  const userId = getTokenPayload()?.user_id ?? ''

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString(
        language === 'vi' ? 'vi-VN' : 'en-US',
        { day: '2-digit', month: '2-digit', year: 'numeric' },
      )
    } catch {
      return iso
    }
  }

  const handleAvatarChange = async (file: File) => {
    setUploadingAvatar(true)
    try {
      const uploadRes = await uploadAvatar(file)
      const avatarUri = uploadRes.data?.file_uri
      if (!avatarUri) throw new Error(t('common.error'))
      await updateProfile({ avatar_uri: avatarUri })
      toast({ type: 'success', title: t('profile.changeAvatar') })
      invalidate('/profile')
    } catch (err) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('common.error'),
      })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    setNameTouched(true)
    if (!displayName.trim()) return
    if (!dirty) {
      toast({ title: t('settings.noChanges'), type: 'warning' })
      return
    }
    setSaving(true)
    try {
      await updateProfile({
        display_name: displayName.trim(),
        bio,
      })
      toast({ title: t('adminProfile.saveSuccess'), type: 'success' })
      invalidate('/profile')
    } catch (err) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('adminProfile.saveError'),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (!data) return
    setDisplayName(data.display_name ?? '')
    setBio(data.bio ?? '')
    setNameTouched(false)
  }

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) return
    if (newPassword !== confirmPassword) {
      toast({ title: t('common.passwordMismatch'), type: 'error' })
      return
    }
    setChangingPassword(true)
    try {
      await changePassword(oldPassword, newPassword)
      toast({ title: t('common.passwordChanged'), type: 'success' })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('common.error'),
      })
    } finally {
      setChangingPassword(false)
    }
  }

  const handleCopyId = async () => {
    if (!userId) return
    try {
      await navigator.clipboard.writeText(userId)
      setCopied(true)
      toast({ title: t('adminProfile.copied'), type: 'success' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  if (authorized === null) return null

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <i className="bx bx-error-circle" />
          <p>{t('adminProfile.loadError')}</p>
        </div>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerText}>
            <div className={styles.skTitle} />
            <div className={styles.skSubtitle} />
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.identity}>
            <div className={styles.skAvatar} />
            <div className={styles.identityText}>
              <div className={styles.skLineLg} />
              <div className={styles.skLineSm} />
            </div>
          </div>
          <div className={styles.infoGrid}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={styles.skInfo}>
                <div className={styles.skLineSm} />
                <div className={styles.skLineMd} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const shortId = userId ? `${userId.slice(0, 8)}…` : '—'
  const roleLabel =
    role === 'SUPER_ADMIN' ? t('settings.superAdminBadge') : t('settings.roleAdmin')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t('adminProfile.title')}</h1>
          <p className={styles.subtitle}>{t('adminProfile.description')}</p>
        </div>
        <span
          className={
            role === 'SUPER_ADMIN' ? styles.roleBadgeSuper : styles.roleBadgeAdmin
          }>
          <i className="bx bx-shield-quarter" aria-hidden="true" />
          {roleLabel}
        </span>
      </div>

      <section className={styles.card} aria-labelledby="account-heading">
        <h2 className={styles.cardTitle} id="account-heading">
          {t('adminProfile.sectionAccount')}
        </h2>

        <div className={styles.identity}>
          <button
            type="button"
            className={styles.avatarBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            aria-label={t('profile.changeAvatar')}
            data-tooltip={t('adminProfile.avatarHint')}>
            <Image
              className={styles.avatarImg}
              src={data.avatar_uri || '/S-Logo.png'}
              alt=""
              width={96}
              height={96}
              unoptimized
            />
            <span className={styles.avatarOverlay} aria-hidden="true">
              <i className={uploadingAvatar ? 'bx bx-loader-alt bx-spin' : 'bx bx-camera'} />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleAvatarChange(file)
              e.target.value = ''
            }}
          />
          <div className={styles.identityText}>
            <span className={styles.identityName}>{data.display_name}</span>
            <span className={styles.identityUsername}>@{data.username}</span>
          </div>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{t('adminProfile.fieldEmail')}</span>
            <span className={styles.infoValue}>
              {getTokenPayload()?.email ?? '—'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{t('adminProfile.fieldUserId')}</span>
            <span className={styles.infoValue}>
              <code className={styles.infoCode}>{shortId}</code>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={handleCopyId}
                aria-label={t('adminProfile.copyId')}
                data-tooltip={copied ? t('adminProfile.copied') : t('adminProfile.copyId')}>
                <i className={copied ? 'bx bx-check' : 'bx bx-copy'} />
              </button>
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{t('adminProfile.fieldJoined')}</span>
            <span className={styles.infoValue}>{formatDate(data.created_at)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{t('adminProfile.fieldRole')}</span>
            <span className={styles.infoValue}>{roleLabel}</span>
          </div>
        </div>

        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="profile-display-name">
              {t('profile.editDisplayName')}
            </label>
            <input
              id="profile-display-name"
              className={styles.input}
              type="text"
              maxLength={50}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              aria-invalid={nameError ? true : undefined}
            />
            {nameError && (
              <span className={styles.fieldError} role="alert">
                {nameError}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="profile-bio">
              {t('profile.editBio')}
            </label>
            <span className={styles.hint} id="bio-hint">
              {t('adminProfile.bioHint')}
            </span>
            <textarea
              id="profile-bio"
              className={styles.textarea}
              rows={3}
              maxLength={160}
              value={bio}
              onChange={e => setBio(e.target.value)}
              aria-describedby="bio-hint"
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.btnSave}
            onClick={handleSave}
            disabled={saving || !dirty}>
            {saving ? t('common.loading') : t('profile.saveChanges')}
          </button>
          <button
            className={styles.btnCancel}
            onClick={handleCancel}
            disabled={saving || !dirty}>
            {t('common.cancel')}
          </button>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="security-heading">
        <h2 className={styles.cardTitle} id="security-heading">
          {t('adminProfile.sectionSecurity')}
        </h2>
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="old-password">
              {t('common.oldPassword')}
            </label>
            <input
              id="old-password"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="new-password">
              {t('common.newPassword')}
            </label>
            <input
              id="new-password"
              className={styles.input}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirm-password">
              {t('common.confirmPassword')}
            </label>
            <input
              id="confirm-password"
              className={styles.input}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.footer}>
          <button
            className={styles.btnSave}
            onClick={handleChangePassword}
            disabled={
              !oldPassword ||
              !newPassword ||
              !confirmPassword ||
              changingPassword
            }>
            {changingPassword ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </section>
    </div>
  )
}
