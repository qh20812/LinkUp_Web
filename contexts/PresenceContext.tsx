'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { batchGetPresence } from '../api/presence'
import type { PresenceStatus } from '../types'

interface PresenceContextType {
  isOnline: (userID: string) => boolean
  prefetchPresence: (userIDs: string[]) => void
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined)

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceStatus>>(() => new Map())
  const fetchedRef = useRef<Set<string>>(new Set())

  const isOnline = useCallback(
    (userID: string) => presenceMap.get(userID) === 'online',
    [presenceMap],
  )

  const prefetchPresence = useCallback(
    (userIDs: string[]) => {
      const unfetched = userIDs.filter((id) => !fetchedRef.current.has(id))
      if (unfetched.length === 0) return

      unfetched.forEach((id) => fetchedRef.current.add(id))

      batchGetPresence(unfetched)
        .then((res) => {
          setPresenceMap((prev) => {
            const next = new Map(prev)
            for (const [uid, p] of Object.entries(res.data)) {
              next.set(uid, p.status)
            }
            return next
          })
        })
        .catch(() => {})
    },
    [],
  )

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { user_id: string; status: string } | undefined
      if (!detail?.user_id) return
      setPresenceMap((prev) => {
        const next = new Map(prev)
        next.set(detail.user_id, detail.status as PresenceStatus)
        return next
      })
    }

    window.addEventListener('presence:update', handler)
    return () => window.removeEventListener('presence:update', handler)
  }, [])

  return (
    <PresenceContext.Provider value={{ isOnline, prefetchPresence }}>
      {children}
    </PresenceContext.Provider>
  )
}

export function usePresence() {
  const context = useContext(PresenceContext)
  if (context === undefined) {
    throw new Error('usePresence must be used within a PresenceProvider')
  }
  return context
}
