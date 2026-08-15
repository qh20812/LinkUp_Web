'use client'

import { useState, useEffect, useCallback } from 'react'
import { getFollowStats as apiGetFollowStats, followUser as apiFollowUser } from '../../api/follow'

export interface FollowStats {
  follower_count: number
  following_count: number
  is_following?: boolean
}

export interface UseFollowStatsResult {
  stats: FollowStats | null
  following: boolean
  followBusy: boolean
  handleFollow: () => Promise<void>
}

export function useFollowStats(userID: string | null): UseFollowStatsResult {
  const [stats, setStats] = useState<FollowStats | null>(null)
  const [following, setFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)

  useEffect(() => {
    if (!userID) return
    let cancelled = false
    apiGetFollowStats(userID)
      .then((s) => {
        if (cancelled) return
        setStats(s)
        setFollowing(!!s.is_following)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [userID])

  const handleFollow = useCallback(async () => {
    if (!userID || followBusy) return
    setFollowBusy(true)
    try {
      await apiFollowUser(userID)
      setFollowing((v) => !v)
      setStats((s) =>
        s
          ? {
              ...s,
              follower_count: Math.max(0, s.follower_count + (following ? -1 : 1)),
            }
          : s,
      )
    } catch {
      /* ignore */
    } finally {
      setFollowBusy(false)
    }
  }, [userID, followBusy, following])

  return { stats, following, followBusy, handleFollow }
}
