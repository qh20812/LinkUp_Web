'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { deactivateAccount } from '../../../api/settings'
import styles from './Settings.module.css'

export default function DeactivateAccount() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const openConfirm = () => {
    if (!password) {
      setFieldError(t('userSettings.passwordRequired'))
      return
    }
    setFieldError(null)
    setConfirming(true)
  }

  const handleDeactivate = async () => {
    setLoading(true)
    try {
      const res = await deactivateAccount(password)
      toast({ type: 'success', title: res.message || t('userSettings.deactivateSuccess') })
      localStorage.removeItem('token')
      localStorage.removeItem('admin_profile')
      router.push('/login')
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : t('userSettings.saveError') })
      setConfirming(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className={styles.dangerZone}>
        <h3 className={styles.dangerTitle}>{t('userSettings.tabDeactivate')}</h3>
        <p className={styles.dangerDesc}>{t('userSettings.deactivateDesc')}</p>

        <div className={styles.field}>
          <label htmlFor="deactivatePassword">{t('userSettings.passwordLabel')}</label>
          <div className={styles.passwordWrapper}>
            <input
              id="deactivatePassword"
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
          {fieldError && <span className={styles.fieldError}>{fieldError}</span>}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnDanger} onClick={openConfirm}>
            {t('userSettings.deactivateBtn')}
          </button>
        </div>
      </div>

      {confirming && (
        <div className={styles.overlay} onClick={() => !loading && setConfirming(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{t('userSettings.confirmTitle')}</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setConfirming(false)}
                disabled={loading}
                aria-label="Close"
              >
                <i className="bx bx-x" />
              </button>
            </div>
            <p className={styles.confirmText}>{t('userSettings.confirmText')}</p>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnCancel} onClick={() => setConfirming(false)} disabled={loading}>
                {t('userSettings.cancelBtn')}
              </button>
              <button type="button" className={styles.btnDanger} onClick={handleDeactivate} disabled={loading}>
                {loading ? t('common.loading') : t('userSettings.confirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
