'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { forgotPassword } from '../../../api/auth'
import { emailError } from '../../../utils/authValidation'
import AuthCard from '../../../components/auth/AuthCard'
import AuthSplit from '../../../components/auth/AuthSplit'
import AuthField from '../../../components/auth/AuthField'
import shared from '../../../components/auth/authShared.module.css'
import styles from './ForgotPasswordForm.module.css'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [touched, setTouched] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { toast } = useToast()
  const { t } = useTranslation()

  const validationError = emailError(email)
  const showError = submitted || touched ? validationError && t(`forgotPassword.${validationError}`) : undefined

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (validationError) return

    setLoading(true)
    setError(undefined)
    try {
      const res = await forgotPassword(email.trim())
      toast({ type: 'success', title: res.message || t('forgotPassword.sentTitle') })
      setSent(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('forgotPassword.error')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplit>
      <AuthCard cardClassName={styles.centered}>
        {sent ? (
          <>
            <div className={styles.iconWrap}>
              <i className={`bx bx-mail-send ${styles.iconSent}`} />
            </div>
            <h1 className={shared.title}>{t('forgotPassword.sentTitle')}</h1>
            <p className={styles.message}>{t('forgotPassword.sentMessage', { email })}</p>
            <Link href="/login" className={styles.link}>
              {t('forgotPassword.backToLogin')}
            </Link>
          </>
        ) : (
          <>
            <h1 className={shared.title}>{t('forgotPassword.title')}</h1>
            <p className={shared.subtitle}>{t('forgotPassword.subtitle')}</p>

            <form onSubmit={handleSubmit} className={shared.form} noValidate>
              {error && (
                <div className={shared.alert} role="alert">
                  <i className={`bx bx-error ${shared.alertIcon}`} />
                  <span className={shared.alertMessage}>{error}</span>
                </div>
              )}

              <AuthField id="email" label={t('forgotPassword.email')} error={showError}>
                {(aria) => (
                  <input
                    {...aria}
                    id="email"
                    type="email"
                    className={shared.input}
                    placeholder={t('forgotPassword.emailPlaceholder')}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError(undefined)
                    }}
                    onBlur={() => setTouched(true)}
                    required
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                )}
              </AuthField>

              <button
                type="submit"
                className={shared.button}
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? t('common.loading') : t('forgotPassword.submit')}
              </button>
            </form>

            <p className={shared.footer}>
              <Link href="/login" className={shared.footerLink}>
                {t('forgotPassword.backToLogin')}
              </Link>
            </p>
          </>
        )}
      </AuthCard>
    </AuthSplit>
  )
}
