'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { register } from '../../../api/auth'
import AuthCard from '../../../components/auth/AuthCard'
import AuthSplit from '../../../components/auth/AuthSplit'
import styles from './RegisterForm.module.css'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

interface FieldErrors {
  displayName?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export default function RegisterForm() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { t } = useTranslation()
  const router = useRouter()

  const validate = (): boolean => {
    const errors: FieldErrors = {}

    if (!displayName.trim()) {
      errors.displayName = t('register.displayNameRequired')
    } else if (Array.from(displayName.trim()).length < 3) {
      errors.displayName = t('register.displayNameTooShort')
    } else if (Array.from(displayName.trim()).length > 55) {
      errors.displayName = t('register.displayNameTooLong')
    }

    if (!email.trim()) {
      errors.email = t('register.emailRequired')
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = t('register.emailInvalid')
    }

    if (!password) {
      errors.password = t('register.passwordRequired')
    } else if (password.length < 8) {
      errors.password = t('register.passwordTooShort')
    } else if (password.length > 50) {
      errors.password = t('register.passwordTooLong')
    } else if (
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      errors.password = t('register.passwordComplexity')
    }

    if (!confirmPassword) {
      errors.confirmPassword = t('register.confirmRequired')
    } else if (confirmPassword !== password) {
      errors.confirmPassword = t('register.confirmMismatch')
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await register(displayName.trim(), email.trim(), password)

      if (res.verify_email) {
        toast({ type: 'success', title: t('register.verifyEmailMessage') })
        router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`)
        return
      }

      if (res.tokens) {
        localStorage.setItem('token', res.tokens.access_token)
        localStorage.setItem('refresh_token', res.tokens.refresh_token)
      }

      router.push('/onboarding')
    } catch (err) {
      const message = err instanceof Error ? err.message : t('register.error')
      toast({ type: 'error', title: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplit>
      <AuthCard>
        <div className={styles.logo}>
        <Image src="/S-Logo-Rmbg.png" alt="LinkUp" width={500} height={500} className={styles.logoImg} priority />
        <span className={styles.logoText}>LinkUp</span>
      </div>

        <h1 className={styles.title}>{t('register.title')}</h1>
        <p className={styles.subtitle}>{t('register.subtitle')}</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="displayName">{t('register.displayName')}</label>
            <input
              id="displayName"
              type="text"
              placeholder={t('register.displayNamePlaceholder')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoComplete="name"
            />
            {fieldErrors.displayName && <span className={styles.fieldError}>{fieldErrors.displayName}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="email">{t('register.email')}</label>
            <input
              id="email"
              type="email"
              placeholder={t('register.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {fieldErrors.email && <span className={styles.fieldError}>{fieldErrors.email}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="password">{t('register.password')}</label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('register.passwordPlaceholder')}
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
            <label htmlFor="confirmPassword">{t('register.confirmPassword')}</label>
            <div className={styles.passwordWrapper}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t('register.confirmPasswordPlaceholder')}
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
            {loading ? '...' : t('register.submit')}
          </button>
        </form>

        <p className={styles.footer}>
          {t('register.haveAccount')}{' '}
          <Link href="/login" className={styles.footerLink}>
            {t('register.loginLink')}
          </Link>
        </p>
      </AuthCard>
    </AuthSplit>
  )
}
