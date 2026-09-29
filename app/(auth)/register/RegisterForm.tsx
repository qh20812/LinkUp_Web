'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { register } from '../../../api/auth'
import { ApiError } from '../../../api/api'
import { clearSWRCache } from '../../../api/swr'
import {
  emailError,
  displayNameError,
  registerPasswordError,
  confirmPasswordError,
  focusFirstInvalid,
} from '../../../utils/authValidation'
import { checkPassword, passwordStrength } from '../../../utils/passwordStrength'
import AuthCard from '../../../components/auth/AuthCard'
import AuthSplit from '../../../components/auth/AuthSplit'
import AuthField from '../../../components/auth/AuthField'
import PasswordInput from '../../../components/auth/PasswordInput'
import FormAlert from '../../../components/auth/FormAlert'
import GoogleAuthButton from '../../../components/auth/GoogleAuthButton'
import shared from '../../../components/auth/authShared.module.css'

type FieldName = 'displayName' | 'email' | 'password' | 'confirmPassword' | 'terms'
type Touched = Partial<Record<FieldName, boolean>>

const REQUIREMENTS: Array<{ key: keyof ReturnType<typeof checkPassword>; label: string }> = [
  { key: 'length', label: 'register.req.length' },
  { key: 'upper', label: 'register.req.upper' },
  { key: 'lower', label: 'register.req.lower' },
  { key: 'digit', label: 'register.req.digit' },
  { key: 'special', label: 'register.req.special' },
]

const STRENGTH_LABEL = ['0', '1', '2', '3', '4'] as const

export default function RegisterForm() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [touched, setTouched] = useState<Touched>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { t } = useTranslation()
  const router = useRouter()

  const errors = useMemo(
    () => ({
      displayName: displayNameError(displayName),
      email: emailError(email),
      password: registerPasswordError(password),
      confirmPassword: confirmPasswordError(confirmPassword, password),
      terms: agreed ? undefined : ('termsRequired' as const),
    }),
    [displayName, email, password, confirmPassword, agreed],
  )

  const showError = (field: FieldName) =>
    submitted || touched[field] ? errors[field] && t(`register.${errors[field]}`) : undefined

  const checks = checkPassword(password)
  const score = passwordStrength(password)
  // Non-empty password always lights at least one segment — an empty meter
  // would read as "no rating".
  const filled = password ? Math.max(1, score) : 0
  const toneClass =
    score <= 1 ? shared.toneWeak : score === 2 ? shared.toneFair : shared.toneStrong

  const confirmMatches = confirmPassword.length > 0 && confirmPassword === password

  // Desktop-only autofocus (mobile keyboard would cover the form).
  useEffect(() => {
    if (window.innerWidth >= 768) nameRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)

    const invalid = (Object.keys(errors) as FieldName[]).filter((k) => errors[k])
    if (invalid.length > 0) {
      focusFirstInvalid(invalid)
      return
    }

    setLoading(true)
    setServerError(null)
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
        clearSWRCache()
      }

      router.push('/onboarding')
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message)
      } else {
        toast({ type: 'error', title: err instanceof Error ? err.message : t('register.error') })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplit>
      <AuthCard>
        <h1 className={shared.title}>{t('register.title')}</h1>
        <p className={shared.subtitle}>{t('register.subtitle')}</p>

        <GoogleAuthButton textKey="register.google.button" />

        <div className={shared.divider}>
          <span>{t('register.or')}</span>
        </div>

        <form onSubmit={handleSubmit} className={shared.form} noValidate>
          {serverError && <FormAlert message={serverError} />}

          <AuthField
            id="displayName"
            label={t('register.displayName')}
            error={showError('displayName')}
          >
            {(aria) => (
              <input
                {...aria}
                ref={nameRef}
                id="displayName"
                type="text"
                className={shared.input}
                placeholder={t('register.displayNamePlaceholder')}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={() => setTouched((s) => ({ ...s, displayName: true }))}
                required
                autoComplete="name"
              />
            )}
          </AuthField>

          <AuthField id="email" label={t('register.email')} error={showError('email')}>
            {(aria) => (
              <input
                {...aria}
                id="email"
                type="email"
                className={shared.input}
                placeholder={t('register.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((s) => ({ ...s, email: true }))}
                required
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            )}
          </AuthField>

          <AuthField id="password" label={t('register.password')} error={showError('password')}>
            {(aria) => (
              <>
                <PasswordInput
                  {...aria}
                  id="password"
                  placeholder={t('register.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, password: true }))}
                  required
                  autoComplete="new-password"
                />
                {password && (
                  <div className={`${shared.meter} ${toneClass}`}>
                    <div className={shared.meterBars} aria-hidden="true">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={`${shared.seg}${i < filled ? ` ${shared.on}` : ''}`}
                        />
                      ))}
                    </div>
                    <span className={shared.meterLabel} aria-live="polite">
                      {t(`register.strength.${STRENGTH_LABEL[score]}`)}
                    </span>
                  </div>
                )}
                <ul className={shared.checks}>
                  {REQUIREMENTS.map((req) => {
                    const met = checks[req.key]
                    return (
                      <li key={req.key} className={`${shared.check}${met ? ` ${shared.checkMet}` : ''}`}>
                        <i className={`bx ${met ? 'bx-check-circle' : 'bx-x-circle'}`} aria-hidden="true" />
                        {t(req.label)}
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </AuthField>

          <AuthField
            id="confirmPassword"
            label={t('register.confirmPassword')}
            error={showError('confirmPassword')}
            hint={
              confirmMatches && !errors.confirmPassword ? (
                <span className={shared.hint}>{t('register.confirmMatchOk')}</span>
              ) : undefined
            }
          >
            {(aria) => (
              <PasswordInput
                {...aria}
                id="confirmPassword"
                placeholder={t('register.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setTouched((s) => ({ ...s, confirmPassword: true }))}
                required
                autoComplete="new-password"
              />
            )}
          </AuthField>

          <div>
            <div className={shared.checkboxRow}>
              <input
                id="terms"
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked)
                  if (e.target.checked) setTouched((s) => ({ ...s, terms: true }))
                }}
                aria-invalid={Boolean(showError('terms'))}
                aria-describedby={showError('terms') ? 'terms-error' : undefined}
              />
              <label htmlFor="terms">{t('register.terms')}</label>
            </div>
            <div id="terms-error" className={shared.checkboxError} role="alert">
              {showError('terms')}
            </div>
          </div>

          <button
            type="submit"
            className={shared.button}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? t('register.submitting') : t('register.submit')}
          </button>
        </form>

        <p className={shared.footer}>
          {t('register.haveAccount')}{' '}
          <Link href="/login" className={shared.footerLink}>
            {t('register.loginLink')}
          </Link>
        </p>
      </AuthCard>
    </AuthSplit>
  )
}
