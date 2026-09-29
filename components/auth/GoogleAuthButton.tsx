'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useToast } from '../../contexts/ToastContext'
import { useTranslation } from '../../hooks/useTranslation'
import { googleLogin, decodeToken } from '../../api/auth'
import { request } from '../../api/api'
import { clearSWRCache, seedProfileCache } from '../../api/swr'
import { getPostAuthPath } from '../../utils/auth'
import type { ViewProfileResponse } from '../../types'
import styles from './GoogleAuthButton.module.css'

/**
 * Official 4-color Google "G" mark (branding-guidelines geometry).
 * Rendered inside the visual button — the real control is the transparent
 * GSI iframe in .overlay, which owns focus, clicks, and the a11y tree.
 */
function GoogleGlyph() {
  return (
    <svg className={styles.gIcon} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

interface GoogleAuthButtonProps {
  /** i18n key for the visible label, e.g. `login.google.button`. */
  textKey?: string
}

export default function GoogleAuthButton({ textKey = 'login.google.button' }: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false)
  const [width, setWidth] = useState<number>()
  const wrapRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { t } = useTranslation()
  const router = useRouter()

  // Feed GSI the exact pixel width so its invisible iframe covers the whole
  // custom button — no dead click zones around the inner Google button.
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width)
      if (w > 0) setWidth((prev) => (prev === w ? prev : w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    const credential = credentialResponse.credential
    if (!credential) return

    setLoading(true)
    try {
      const res = await googleLogin(credential)
      localStorage.setItem('token', res.tokens.access_token)
      localStorage.setItem('refresh_token', res.tokens.refresh_token)
      clearSWRCache()

      try {
        const profile = await request<ViewProfileResponse>('/profile')
        seedProfileCache(profile)
      } catch {
        // SWR will fetch on mount if this fails
      }

      router.push(getPostAuthPath(decodeToken(res.tokens.access_token)?.role))
    } catch (err) {
      const message = err instanceof Error ? err.message : t('login.error')
      toast({ type: 'error', title: message })
    } finally {
      setLoading(false)
    }
  }

  const handleError = () => {
    toast({ type: 'error', title: t('login.google.error') })
  }

  if (loading) {
    return (
      <button type="button" className={styles.loading} disabled aria-busy>
        {t('common.loading')}
      </button>
    )
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {/* Visual only — not focusable, hidden from AT; the GSI iframe below is
          the real, accessible control. */}
      <span className={styles.googleBtn}>
        <GoogleGlyph />
        <span>{t(textKey)}</span>
      </span>

      <div className={styles.overlay}>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          type="standard"
          theme="outline"
          size="large"
          shape="rectangular"
          text={textKey.includes('register') ? 'signup_with' : 'signin_with'}
          width={width}
          containerProps={{ className: styles.gsi, style: { height: '100%' } }}
        />
      </div>
    </div>
  )
}
