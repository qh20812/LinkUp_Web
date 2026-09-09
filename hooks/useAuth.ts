'use client'

import { useState, useEffect } from 'react'
import { getTokenPayload } from '../api/auth'
import type { TokenPayload, UserRole } from '../types'

export interface UseAuthResult {
  user: TokenPayload | null
  isAuthenticated: boolean
  role: UserRole | null
  isAdmin: boolean
  isSuperAdmin: boolean
  isPartner: boolean
  isUser: boolean
  initializing: boolean
}

export function useAuth(): UseAuthResult {
  const [payload, setPayload] = useState<TokenPayload | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    // localStorage is read after mount so server and client first renders match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPayload(getTokenPayload())
    queueMicrotask(() => setInitializing(false))

    const handleStorage = () => setPayload(getTokenPayload())
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const isAuthenticated = payload !== null
  const role = payload?.role ?? null

  return {
    user: payload,
    isAuthenticated,
    role,
    isAdmin: role === 'ADMIN',
    isSuperAdmin: role === 'SUPER_ADMIN',
    isPartner: role === 'PARTNER',
    isUser: role === 'USER',
    initializing,
  }
}
