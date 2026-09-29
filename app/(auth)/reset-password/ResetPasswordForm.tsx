'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { verifyResetToken, resetPassword } from '../../../api/auth'
import {
  registerPasswordError,
  confirmPasswordError,
  focusFirstInvalid,
} from '../../../utils/authValidation'
import AuthCard from '../../../components/auth/AuthCard'
import AuthSplit from '../../../components/auth/AuthSplit'
import AuthField from '../../../components/auth/AuthField'
import PasswordInput from '../../../components/auth/PasswordInput'
import shared from '../../../components/auth/authShared.module.css'
import styles from './ResetPasswordForm.module.css'

type Status = 'verifying' | 'form' | 'invalid' | 'success' | 'error'

interface ResetPasswordFormProps {
  initialToken: string | null
}

export default function ResetPasswordForm({ initialToken }: ResetPasswordFormProps) {
  const [status, setStatus] = useState<Status>(initialToken ? 'verifying' : 'invalid')
  const [message, setMessage] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [touched, setTouched] = useState<{ password?: boolean; confirmPassword?: boolean }>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { t } = useTranslation()

  useEffect(() => {
    if (!initialToken) {
      return
    }

    let cancelled = false
    const run = async () => {
      try {
        const res = await verifyResetToken(initialToken)
        if (cancelled) return
        if (!res.valid) {
          setMessage(res.message)
          setStatus('invalid')
          return
        }
        setStatus('form')
      } catch (err) {
        if (cancelled) return
        setMessage(err instanceof Error ? err.message : t('resetPassword.invalidMessage'))
        setStatus('invalid')
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [initialToken, t])

  const errors = {
    password: registerPasswordError(password),
    confirmPassword: confirmPasswordError(confirmPassword, password),
  }

  const showError = (field: 'password' | 'confirmPassword') =>
    submitted || touched[field]
      ? errors[field] && t(`resetPassword.${errors[field]}`)
      : undefined

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)

    const invalid = (Object.keys(errors) as Array<keyof typeof errors>).filter((k) => errors[k])
    if (invalid.length > 0 || !initialToken) {
      focusFirstInvalid(invalid)
      return
    }

    setLoading(true)
    try {
      const res = await resetPassword(initialToken, password)
      toast({ type: 'success', title: res.message || t('resetPassword.successTitle') })
      setStatus('success')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('resetPassword.error')
      setMessage(errorMessage)
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplit>
      <AuthCard cardClassName={styles.centered}>
        {status === 'verifying' && (
          <>
            <div className={styles.iconWrap}>
              <i className={`bx bx-loader bx-spin ${styles.iconPending}`} />
            </div>
            <h1 className={shared.title}>{t('resetPassword.title')}</h1>
            <p className={styles.message}>{t('resetPassword.verifying')}</p>
          </>
        )}

        {status === 'form' && (
          <>
            <h1 className={shared.title}>{t('resetPassword.title')}</h1>
            <p className={shared.subtitle}>{t('resetPassword.subtitle')}</p>

            <form onSubmit={handleSubmit} className={shared.form} noValidate>
              <AuthField
                id="password"
                label={t('resetPassword.password')}
                error={showError('password')}
              >
                {(aria) => (
                  <PasswordInput
                    {...aria}
                    id="password"
                    placeholder={t('resetPassword.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((s) => ({ ...s, password: true }))}
                    required
                    autoComplete="new-password"
                  />
                )}
              </AuthField>

              <AuthField
                id="confirmPassword"
                label={t('resetPassword.confirmPassword')}
                error={showError('confirmPassword')}
              >
                {(aria) => (
                  <PasswordInput
                    {...aria}
                    id="confirmPassword"
                    placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => setTouched((s) => ({ ...s, confirmPassword: true }))}
                    required
                    autoComplete="new-password"
                  />
                )}
              </AuthField>

              <button
                type="submit"
                className={shared.button}
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? t('common.loading') : t('resetPassword.submit')}
              </button>
            </form>
          </>
        )}

        {status === 'invalid' && (
          <>
            <div className={styles.iconWrap}>
              <i className={`bx bx-x-circle ${styles.iconError}`} />
            </div>
            <h1 className={shared.title}>{t('resetPassword.invalidTitle')}</h1>
            <p className={styles.message}>{message || t('resetPassword.invalidMessage')}</p>
            <Link href="/forgot-password" className={styles.link}>
              {t('resetPassword.requestNewLink')}
            </Link>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={styles.iconWrap}>
              <i className={`bx bx-check-circle ${styles.iconSuccess}`} />
            </div>
            <h1 className={shared.title}>{t('resetPassword.successTitle')}</h1>
            <p className={styles.message}>{t('resetPassword.successMessage')}</p>
            <Link href="/login" className={styles.link}>
              {t('resetPassword.goToLogin')}
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={styles.iconWrap}>
              <i className={`bx bx-x-circle ${styles.iconError}`} />
            </div>
            <h1 className={shared.title}>{t('resetPassword.invalidTitle')}</h1>
            <p className={styles.message}>{message || t('resetPassword.error')}</p>
            <Link href="/forgot-password" className={styles.link}>
              {t('resetPassword.requestNewLink')}
            </Link>
          </>
        )}
      </AuthCard>
    </AuthSplit>
  )
}
