'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useToast } from '../../contexts/ToastContext'
import { useTranslation } from '../../hooks/useTranslation'
import { forgotPassword } from '../../api/auth'
import styles from './ForgotPasswordForm.module.css'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { toast } = useToast()
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = email.trim()

    if (!target) {
      setFieldError(t('forgotPassword.emailRequired'))
      return
    }
    if (!EMAIL_REGEX.test(target)) {
      setFieldError(t('forgotPassword.emailInvalid'))
      return
    }
    setFieldError('')
    setLoading(true)
    try {
      const res = await forgotPassword(target)
      toast({ type: 'success', title: res.message || t('forgotPassword.sentTitle') })
      setSent(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('forgotPassword.error')
      toast({ type: 'error', title: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <Image src="/S-Logo-Rmbg.png" alt="LinkUp" width={500} height={500} className={styles.logoImg} priority />
          <span className={styles.logoText}>LinkUp</span>
        </div>

        {sent ? (
          <>
            <div className={styles.iconWrap}>
              <i className={`bx bx-mail-send ${styles.iconSent}`} />
            </div>
            <h1 className={styles.title}>{t('forgotPassword.sentTitle')}</h1>
            <p className={styles.message}>{t('forgotPassword.sentMessage', { email })}</p>
            <Link href="/login" className={styles.link}>
              {t('forgotPassword.backToLogin')}
            </Link>
          </>
        ) : (
          <>
            <h1 className={styles.title}>{t('forgotPassword.title')}</h1>
            <p className={styles.subtitle}>{t('forgotPassword.subtitle')}</p>

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.field}>
                <label htmlFor="email">{t('forgotPassword.email')}</label>
                <input
                  id="email"
                  type="email"
                  placeholder={t('forgotPassword.emailPlaceholder')}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (fieldError) setFieldError('')
                  }}
                  required
                  autoComplete="email"
                />
                {fieldError && <span className={styles.fieldError}>{fieldError}</span>}
              </div>

              <button type="submit" className={styles.button} disabled={loading}>
                {loading ? '...' : t('forgotPassword.submit')}
              </button>
            </form>

            <Link href="/login" className={styles.link}>
              {t('forgotPassword.backToLogin')}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
