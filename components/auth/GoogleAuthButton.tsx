'use client'

import React, { useState } from 'react'
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

export default function GoogleAuthButton() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { t } = useTranslation()
  const router = useRouter()

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
      <button type="button" className={styles.loading} disabled>
        {'...'}
      </button>
    )
  }

  return (
    <div className={styles.wrap}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        text={t('login.google.text') as 'continue_with' | 'signin_with' | 'signup_with' | 'signin'}
      />
    </div>
  )
}