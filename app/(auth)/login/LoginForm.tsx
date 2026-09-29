'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { login, decodeToken } from '../../../api/auth'
import { ApiError } from '../../../api/api'
import { clearSWRCache } from '../../../api/swr'
import { getPostAuthPath } from '../../../utils/auth'
import { emailError, loginPasswordError, focusFirstInvalid } from '../../../utils/authValidation'
import AuthCard from '../../../components/auth/AuthCard'
import AuthSplit from '../../../components/auth/AuthSplit'
import AuthField from '../../../components/auth/AuthField'
import PasswordInput from '../../../components/auth/PasswordInput'
import FormAlert from '../../../components/auth/FormAlert'
import GoogleAuthButton from '../../../components/auth/GoogleAuthButton'
import shared from '../../../components/auth/authShared.module.css'

type Touched = { email?: boolean; password?: boolean }

interface ServerError {
  message: string
  variant: 'danger' | 'warning'
  action?: { label: string; onClick: () => void }
}

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState<Touched>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<ServerError | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { t } = useTranslation()
  const router = useRouter()

  const errors = useMemo(
    () => ({
      email: emailError(email),
      password: loginPasswordError(password),
    }),
    [email, password],
  )

  const showError = (field: keyof Touched) =>
    submitted || touched[field] ? errors[field] && t(`login.${errors[field]}`) : undefined

  // Focus the email field on desktop only — autofocus on mobile would pop
  // the software keyboard over the form.
  useEffect(() => {
    if (window.innerWidth >= 768) emailRef.current?.focus()
  }, [])

  const clearServerError = () => setServerError(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)

    if (errors.email || errors.password) {
      focusFirstInvalid([
        ...(errors.email ? ['email'] : []),
        ...(errors.password ? ['password'] : []),
      ])
      return
    }

    setLoading(true)
    setServerError(null)
    try {
      const res = await login(email.trim(), password)
      localStorage.setItem('token', res.tokens.access_token)
      localStorage.setItem('refresh_token', res.tokens.refresh_token)
      clearSWRCache()

      const redirect = new URLSearchParams(window.location.search).get('redirect')
      if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
        router.push(redirect)
      } else {
        router.push(getPostAuthPath(decodeToken(res.tokens.access_token)?.role))
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const normalized: ServerError = { message: err.message, variant: 'danger' }
        if (err.code === 'auth.EMAIL_NOT_VERIFIED') {
          normalized.action = {
            label: t('login.verifyEmailAction'),
            onClick: () =>
              router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`),
          }
        } else if (
          err.code === 'auth.ACCOUNT_LOCKED' ||
          err.code === 'auth.LOGIN_ATTEMPTS_REMAINING'
        ) {
          normalized.variant = 'warning'
        }
        setServerError(normalized)
      } else {
        toast({
          type: 'error',
          title: err instanceof Error ? err.message : t('login.error'),
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplit>
      <AuthCard>
        <h1 className={shared.title}>{t('login.title')}</h1>
        <p className={shared.subtitle}>{t('login.subtitle')}</p>

        <GoogleAuthButton textKey="login.google.button" />

        <div className={shared.divider}>
          <span>{t('login.or')}</span>
        </div>

        <form onSubmit={handleSubmit} className={shared.form} noValidate>
          {serverError && (
            <FormAlert
              variant={serverError.variant}
              message={serverError.message}
              action={serverError.action}
            />
          )}

          <AuthField id="email" label={t('login.email')} error={showError('email')}>
            {(aria) => (
              <input
                {...aria}
                ref={emailRef}
                id="email"
                type="email"
                className={shared.input}
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  clearServerError()
                }}
                onBlur={() => setTouched((s) => ({ ...s, email: true }))}
                required
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            )}
          </AuthField>

          <AuthField
            id="password"
            label={t('login.password')}
            error={showError('password')}
            labelAction={
              <Link href="/forgot-password">{t('login.forgotPassword')}</Link>
            }
          >
            {(aria) => (
              <PasswordInput
                {...aria}
                id="password"
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  clearServerError()
                }}
                onBlur={() => setTouched((s) => ({ ...s, password: true }))}
                required
                autoComplete="current-password"
              />
            )}
          </AuthField>

          <button
            type="submit"
            className={shared.button}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>

        <p className={shared.footer}>
          {t('login.noAccount')}{' '}
          <Link href="/register" className={shared.footerLink}>
            {t('login.registerLink')}
          </Link>
        </p>
      </AuthCard>
    </AuthSplit>
  )
}
