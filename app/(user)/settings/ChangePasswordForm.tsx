'use client'

import React, { useState } from 'react'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { changePassword } from '../../../api/auth'
import styles from './Settings.module.css'

interface FieldErrors {
  oldPassword?: string
  newPassword?: string
  confirmPassword?: string
}

export default function ChangePasswordForm() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  const validate = (): boolean => {
    const errors: FieldErrors = {}

    if (!oldPassword) {
      errors.oldPassword = t('changePassword.oldPasswordRequired')
    }

    if (!newPassword) {
      errors.newPassword = t('resetPassword.passwordRequired')
    } else if (newPassword.length < 8) {
      errors.newPassword = t('resetPassword.passwordTooShort')
    } else if (newPassword.length > 50) {
      errors.newPassword = t('resetPassword.passwordTooLong')
    } else if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      errors.newPassword = t('resetPassword.passwordComplexity')
    }

    if (newPassword && newPassword === oldPassword) {
      errors.newPassword = t('changePassword.sameAsOld')
    }

    if (!confirmPassword) {
      errors.confirmPassword = t('resetPassword.confirmRequired')
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = t('resetPassword.confirmMismatch')
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const res = await changePassword(oldPassword, newPassword)
      toast({ type: 'success', title: res.message || t('common.passwordChanged') })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setFieldErrors({})
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : t('changePassword.error') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="oldPassword">{t('common.oldPassword')}</label>
        <div className={styles.passwordWrapper}>
          <input
            id="oldPassword"
            type={showOldPassword ? 'text' : 'password'}
            placeholder={t('changePassword.oldPasswordPlaceholder')}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            className={styles.eyeBtn}
            onClick={() => setShowOldPassword(!showOldPassword)}
            tabIndex={-1}
            aria-label={showOldPassword ? 'Hide password' : 'Show password'}
          >
            <i className={`bx ${showOldPassword ? 'bx-hide' : 'bx-show'}`} />
          </button>
        </div>
        {fieldErrors.oldPassword && <span className={styles.fieldError}>{fieldErrors.oldPassword}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor="newPassword">{t('common.newPassword')}</label>
        <div className={styles.passwordWrapper}>
          <input
            id="newPassword"
            type={showNewPassword ? 'text' : 'password'}
            placeholder={t('changePassword.newPasswordPlaceholder')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            className={styles.eyeBtn}
            onClick={() => setShowNewPassword(!showNewPassword)}
            tabIndex={-1}
            aria-label={showNewPassword ? 'Hide password' : 'Show password'}
          >
            <i className={`bx ${showNewPassword ? 'bx-hide' : 'bx-show'}`} />
          </button>
        </div>
        {fieldErrors.newPassword && <span className={styles.fieldError}>{fieldErrors.newPassword}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor="confirmPassword">{t('common.confirmPassword')}</label>
        <div className={styles.passwordWrapper}>
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder={t('changePassword.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            className={styles.eyeBtn}
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            tabIndex={-1}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            <i className={`bx ${showConfirmPassword ? 'bx-hide' : 'bx-show'}`} />
          </button>
        </div>
        {fieldErrors.confirmPassword && <span className={styles.fieldError}>{fieldErrors.confirmPassword}</span>}
      </div>

      <button type="submit" className={styles.button} disabled={loading}>
        {loading ? t('common.loading') : t('changePassword.submit')}
      </button>
    </form>
  )
}
