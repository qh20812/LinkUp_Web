'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import styles from './ProfileFriendsTab.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import { getFriends } from '../../api/friends'
import type { FriendUser } from '../../types'

interface ProfileFriendsTabProps {
  userID: string
}

export default function ProfileFriendsTab({ userID }: ProfileFriendsTabProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchFriends = useCallback(async (p: number) => {
    if (p === 1) setLoading(true)
    else setLoadingMore(true)
    try {
      const res = await getFriends(userID, p, 12)
      setFriends((prev) => (p === 1 ? res.data : [...prev, ...res.data]))
      setHasMore(res.has_more)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [userID])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFriends(1)
  }, [fetchFriends])

  const loadMore = () => {
    if (!hasMore || loadingMore) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchFriends(nextPage)
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonName} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (friends.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}><i className="bx bx-group" /></span>
        <p className={styles.emptyText}>{t('friends.emptyList')}</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {friends.map((friend) => (
          <div
            key={friend.user_id}
            className={styles.friendCard}
            onClick={() => router.push(`/profile/${friend.user_id}`)}
          >
            <Image
              className={styles.friendAvatar}
              src={friend.avatar_uri || '/default-avatar.svg'}
              alt={friend.display_name}
              width={80}
              height={80}
              unoptimized
            />
            <span className={styles.friendName}>{friend.display_name}</span>
          </div>
        ))}
      </div>
      {hasMore && (
        <button className={styles.loadMoreBtn} onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? t('common.loading') : t('common.nextPage')}
        </button>
      )}
    </div>
  )
}
