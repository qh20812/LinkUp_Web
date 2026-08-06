'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { requestEmailChange, verifyEmailChange } from '../../../api/settings'
import styles from './Settings.module.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FieldErrors {
  newEmail?: string
  password?: string
  token?: string
}

export default function EmailChangeForm() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  const [step, setStep] = useState<'request' | 'verify' | 'done'>('request')
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  const validateRequest = (): boolean => {
    const errors: FieldErrors = {}

    if (!newEmail) {
      errors.newEmail = t('userSettings.invalidEmail')
    } else if (!EMAIL_RE.test(newEmail)) {
      errors.newEmail = t('userSettings.invalidEmail')
    }

    if (!password) {
      errors.password = t('userSettings.passwordRequired')
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateRequest()) return

    setLoading(true)
    try {
      const res = await requestEmailChange(newEmail.trim(), password)
      toast({ type: 'success', title: res.message || t('userSettings.requestSuccess') })
      setPassword('')
      setFieldErrors({})
      setStep('verify')
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : t('userSettings.saveError') })
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setFieldErrors({ token: t('userSettings.tokenRequired') })
      return
    }

    setLoading(true)
    try {
      const res = await verifyEmailChange(token.trim())
      toast({ type: 'success', title: res.message || t('userSettings.verifySuccess') })
      setStep('done')
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : t('userSettings.saveError') })
    } finally {
      setLoading(false)
    }
  }

  const goToLogin = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('admin_profile')
    router.push('/login')
  }

  if (step === 'done') {
    return (
      <div className={styles.successBox}>
        <i className="bx bx-check-circle" />
        <h2 className={styles.successTitle}>{t('userSettings.emailChangedTitle')}</h2>
        <p className={styles.successDesc}>{t('userSettings.reloadNote')}</p>
        <button type="button" className={styles.btnSave} onClick={goToLogin}>
          {t('verifyEmail.goToLogin')}
        </button>
      </div>
    )
  }

  if (step === 'verify') {
    return (
      <div>
        <p className={styles.stepHint}>{t('userSettings.verifyNote')}</p>
        <form onSubmit={handleVerify} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="changeToken">{t('userSettings.tokenLabel')}</label>
            <input
              id="changeToken"
              className={styles.input}
              placeholder={t('userSettings.tokenPlaceholder')}
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            {fieldErrors.token && <span className={styles.fieldError}>{fieldErrors.token}</span>}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.btnCancel} onClick={() => setStep('request')}>
              {t('userSettings.cancelBtn')}
            </button>
            <button type="submit" className={styles.btnSave} disabled={loading}>
              {loading ? t('common.loading') : t('userSettings.verifyBtn')}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <form onSubmit={handleRequest} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="newEmail">{t('userSettings.newEmailLabel')}</label>
        <input
          id="newEmail"
          type="email"
          className={styles.input}
          placeholder={t('userSettings.newEmailPlaceholder')}
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          autoComplete="email"
        />
        {fieldErrors.newEmail && <span className={styles.fieldError}>{fieldErrors.newEmail}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor="currentPassword">{t('userSettings.passwordLabel')}</label>
        <div className={styles.passwordWrapper}>
          <input
            id="currentPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder={t('userSettings.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            className={styles.eyeBtn}
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <i className={`bx ${showPassword ? 'bx-hide' : 'bx-show'}`} />
          </button>
        </div>
        {fieldErrors.password && <span className={styles.fieldError}>{fieldErrors.password}</span>}
      </div>

      <button type="submit" className={styles.button} disabled={loading}>
        {loading ? t('common.loading') : t('userSettings.requestBtn')}
      </button>
    </form>
  )
}
