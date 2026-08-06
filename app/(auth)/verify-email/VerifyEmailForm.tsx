'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { verifyEmail, resendVerification } from '../../../api/auth'
import { verifyEmailChange } from '../../../api/settings'
import { getPostAuthPath } from '../../../utils/auth'
import type { UserRole } from '../../../types'
import AuthCard from '../../../components/auth/AuthCard'
import styles from './VerifyEmail.module.css'

type Status = 'verifying' | 'pending' | 'success' | 'error'

interface VerifyEmailFormProps {
  initialToken: string | null
  initialEmail: string | null
  initialType: string | null
}

export default function VerifyEmailForm({ initialToken, initialEmail, initialType }: VerifyEmailFormProps) {
  const [status, setStatus] = useState<Status>(initialToken ? 'verifying' : 'pending')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState(initialEmail ?? '')
  const [resendLoading, setResendLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { toast } = useToast()
  const { t } = useTranslation()
  const router = useRouter()

  const isChangeEmail = initialType === 'change_email'

  const redirectByRole = (role?: string) => {
    router.push(getPostAuthPath((role as UserRole | undefined) ?? null))
  }

  useEffect(() => {
    if (cooldown > 0) {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
      cooldownRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [cooldown])

  useEffect(() => {
    if (!initialToken) return

    let cancelled = false
    const run = async () => {
      try {
        if (isChangeEmail) {
          const res = await verifyEmailChange(initialToken)
          if (cancelled) return
          setStatus('success')
          setMessage(res.message || t('userSettings.reloadNote'))
          setTimeout(() => {
            localStorage.removeItem('token')
            localStorage.removeItem('admin_profile')
            router.push('/login')
          }, 3000)
          return
        }

        const res = await verifyEmail(initialToken)
        if (cancelled) return
        if (!res.verified) {
          setMessage(res.message)
          setStatus('error')
          return
        }
        if (res.access_token) {
          localStorage.setItem('token', res.access_token)
        }
        if (res.refresh_token) {
          localStorage.setItem('refresh_token', res.refresh_token)
        }
        setStatus('success')
        const role = res.role
        setTimeout(() => {
          router.push(getPostAuthPath((role as UserRole | undefined) ?? null))
        }, 3000)
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : ''
        setMessage(msg)
        setStatus('error')
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [initialToken, router, isChangeEmail, t])

  const handleResend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const target = email.trim()
    if (!target) {
      toast({ type: 'error', title: t('verifyEmail.emailPlaceholder') })
      return
    }
    setResendLoading(true)
    try {
      const res = await resendVerification(target)
      toast({ type: 'success', title: res.message || t('verifyEmail.resendSuccess') })
      setCooldown(60)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('verifyEmail.resendSuccess')
      toast({ type: 'error', title: msg })
    } finally {
      setResendLoading(false)
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
            <h1 className={styles.title}>{t('verifyEmail.title')}</h1>
            <p className={styles.message}>{t('verifyEmail.verifying')}</p>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className={styles.iconWrap}>
              <i className={`bx bx-mail-send ${styles.iconPending}`} />
            </div>
            <h1 className={styles.title}>{t('verifyEmail.pendingTitle')}</h1>
            <p className={styles.message}>{t('verifyEmail.pendingMessage', { email: email || '—' })}</p>

            <p className={styles.resendHint}>{t('verifyEmail.resendHint')}</p>

            <form onSubmit={handleResend} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="verifyEmail">{t('verifyEmail.emailLabel')}</label>
                <input
                  id="verifyEmail"
                  type="email"
                  placeholder={t('verifyEmail.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className={styles.button}
                disabled={resendLoading || cooldown > 0}
              >
                {cooldown > 0
                  ? t('verifyEmail.resendCooldown', { seconds: cooldown })
                  : resendLoading
                    ? '...'
                    : t('verifyEmail.resend')}
              </button>
            </form>

            <Link href="/login" className={styles.link}>
              {t('verifyEmail.goToLogin')}
            </Link>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={styles.iconWrap}>
              <i className={`bx bx-check-circle ${styles.iconSuccess}`} />
            </div>
            <h1 className={styles.title}>
              {isChangeEmail ? t('userSettings.emailChangedTitle') : t('verifyEmail.successTitle')}
            </h1>
            <p className={styles.message}>{message || t('verifyEmail.successMessage')}</p>
            <button type="button" className={styles.button} onClick={() => (isChangeEmail ? router.push('/login') : redirectByRole())}>
              {t('verifyEmail.continue')}
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={styles.iconWrap}>
              <i className={`bx bx-x-circle ${styles.iconError}`} />
            </div>
            <h1 className={styles.title}>{t('verifyEmail.errorTitle')}</h1>
            <p className={styles.message}>{message || t('verifyEmail.errorTitle')}</p>

            <p className={styles.resendHint}>{t('verifyEmail.resendHint')}</p>

            <form onSubmit={handleResend} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="verifyEmailError">{t('verifyEmail.emailLabel')}</label>
                <input
                  id="verifyEmailError"
                  type="email"
                  placeholder={t('verifyEmail.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className={styles.button}
                disabled={resendLoading || cooldown > 0}
              >
                {cooldown > 0
                  ? t('verifyEmail.resendCooldown', { seconds: cooldown })
                  : resendLoading
                    ? '...'
                    : t('verifyEmail.resend')}
              </button>
            </form>

            <Link href="/login" className={styles.link}>
              {t('verifyEmail.goToLogin')}
            </Link>
          </>
        )}
    </AuthCard>
  )
}
