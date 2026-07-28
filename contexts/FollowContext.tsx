'use client'

import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { followUser as apiFollowUser } from '../api/follow'

interface FollowContextType {
  followedUserIds: Set<string>
  followUser: (userId: string) => Promise<void>
  unfollowUser: (userId: string) => Promise<void>
  isFollowed: (userId: string) => boolean
}

const FollowContext = createContext<FollowContextType | undefined>(undefined)

export function FollowedUserIdsProvider({ children }: { children: React.ReactNode }) {
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
  const followedRef = useRef<Set<string>>(new Set())

  const followUser = useCallback(async (userId: string) => {
    if (followedRef.current.has(userId)) return
    followedRef.current = new Set(followedRef.current).add(userId)
    setFollowedIds(followedRef.current)
    try {
      await apiFollowUser(userId)
    } catch {
      followedRef.current = new Set(followedRef.current)
      followedRef.current.delete(userId)
      setFollowedIds(new Set(followedRef.current))
      throw new Error('Follow failed')
    }
  }, [])

  const unfollowUser = useCallback(async (userId: string) => {
    if (!followedRef.current.has(userId)) return
    followedRef.current = new Set(followedRef.current)
    followedRef.current.delete(userId)
    setFollowedIds(new Set(followedRef.current))
    try {
      await apiFollowUser(userId)
    } catch {
      followedRef.current = new Set(followedRef.current).add(userId)
      setFollowedIds(new Set(followedRef.current))
      throw new Error('Unfollow failed')
    }
  }, [])

  const isFollowed = useCallback((userId: string) => followedRef.current.has(userId), [])

  return (
    <FollowContext.Provider value={{ followedUserIds: followedIds, followUser, unfollowUser, isFollowed }}>
      {children}
    </FollowContext.Provider>
  )
}

export function useFollowContext() {
  const context = useContext(FollowContext)
  if (!context) throw new Error('useFollowContext must be used within FollowedUserIdsProvider')
  return context
}
