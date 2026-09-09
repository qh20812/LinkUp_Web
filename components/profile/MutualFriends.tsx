'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import styles from './MutualFriends.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import { getMutualFriends } from '../../api/follow'
import type { FollowListItem } from '../../types'

interface MutualFriendsProps {
  userID: string
}

export default function MutualFriends({ userID }: MutualFriendsProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [mutuals, setMutuals] = useState<FollowListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getMutualFriends(userID)
      .then((res) => {
        if (!cancelled) {
          setMutuals(res.data)
          setTotal(res.total)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userID])

  if (loading || total === 0) return null

  return (
    <div className={styles.container}>
      <div className={styles.avatars}>
        {mutuals.slice(0, 4).map((user) => (
          <div
            key={user.user_id}
            className={styles.avatarWrap}
            onClick={() => router.push(`/profile/${user.user_id}`)}
          >
            <Image
              src={user.avatar_uri || '/default-avatar.svg'}
              alt={user.display_name}
              width={28}
              height={28}
              className={styles.avatar}
              unoptimized
            />
          </div>
        ))}
      </div>
      <span className={styles.label}>
        {t('profile.mutualFriends').replace('{count}', String(total))}
      </span>
    </div>
  )
}
