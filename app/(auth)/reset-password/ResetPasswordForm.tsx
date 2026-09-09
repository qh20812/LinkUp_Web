'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { verifyResetToken, resetPassword } from '../../../api/auth'
import AuthCard from '../../../components/auth/AuthCard'
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({})
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: { password?: string; confirmPassword?: string } = {}

    if (!password) {
      errors.password = t('resetPassword.passwordRequired')
    } else if (password.length < 8) {
      errors.password = t('resetPassword.passwordTooShort')
    } else if (password.length > 50) {
      errors.password = t('resetPassword.passwordTooLong')
    } else if (
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      errors.password = t('resetPassword.passwordComplexity')
    }

    if (!confirmPassword) {
      errors.confirmPassword = t('resetPassword.confirmRequired')
    } else if (confirmPassword !== password) {
      errors.confirmPassword = t('resetPassword.confirmMismatch')
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0 || !initialToken) return

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
    <AuthCard cardClassName={styles.centered}>
      <div className={styles.logo}>
        <Image src="/S-Logo-Rmbg.png" alt="LinkUp" width={500} height={500} className={styles.logoImg} priority />
        <span className={styles.logoText}>LinkUp</span>
      </div>

        {status === 'verifying' && (
          <>
            <div className={styles.iconWrap}>
              <i className={`bx bx-loader bx-spin ${styles.iconPending}`} />
            </div>
            <h1 className={styles.title}>{t('resetPassword.title')}</h1>
            <p className={styles.message}>{t('resetPassword.verifying')}</p>
          </>
        )}

        {status === 'form' && (
          <>
            <h1 className={styles.title}>{t('resetPassword.title')}</h1>
            <p className={styles.subtitle}>{t('resetPassword.subtitle')}</p>

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.field}>
                <label htmlFor="password">{t('resetPassword.password')}</label>
                <div className={styles.passwordWrapper}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('resetPassword.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
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

              <div className={styles.field}>
                <label htmlFor="confirmPassword">{t('resetPassword.confirmPassword')}</label>
                <div className={styles.passwordWrapper}>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
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
                {loading ? '...' : t('resetPassword.submit')}
              </button>
            </form>
          </>
        )}

        {status === 'invalid' && (
          <>
            <div className={styles.iconWrap}>
              <i className={`bx bx-x-circle ${styles.iconError}`} />
            </div>
            <h1 className={styles.title}>{t('resetPassword.invalidTitle')}</h1>
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
            <h1 className={styles.title}>{t('resetPassword.successTitle')}</h1>
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
            <h1 className={styles.title}>{t('resetPassword.invalidTitle')}</h1>
            <p className={styles.message}>{message || t('resetPassword.error')}</p>
            <Link href="/forgot-password" className={styles.link}>
              {t('resetPassword.requestNewLink')}
            </Link>
          </>
        )}
    </AuthCard>
  )
}
