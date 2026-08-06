'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { login, decodeToken } from '../../../api/auth'
import { getPostAuthPath } from '../../../utils/auth'
import AuthCard from '../../../components/auth/AuthCard'
import AuthSplit from '../../../components/auth/AuthSplit'
import styles from './LoginForm.module.css'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { t } = useTranslation()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await login(email, password)
      localStorage.setItem('token', res.tokens.access_token)
      localStorage.setItem('refresh_token', res.tokens.refresh_token)

      router.push(getPostAuthPath(decodeToken(res.tokens.access_token)?.role))
    } catch (err) {
      const message = err instanceof Error ? err.message : t('login.error')
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

          <h1 className={styles.title}>{t('login.title')}</h1>
          <p className={styles.subtitle}>{t('login.subtitle')}</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="email">{t('login.email')}</label>
              <input
                id="email"
                type="email"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">{t('login.password')}</label>
              <div className={styles.passwordWrapper}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
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
            </div>

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? '...' : t('login.submit')}
            </button>
          </form>

          <Link href="/forgot-password" className={styles.forgotLink}>
            {t('login.forgotPassword')}
          </Link>

          <p className={styles.footer}>
            {t('login.noAccount')}{' '}
            <Link href="/register" className={styles.footerLink}>
              {t('login.registerLink')}
            </Link>
          </p>
      </AuthCard>
    </AuthSplit>
  )
}
