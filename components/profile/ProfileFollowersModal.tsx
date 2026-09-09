'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import styles from './ProfileFollowersModal.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import { getFollowers, getFollowing } from '../../api/follow'
import { useFollowContext } from '../../contexts/FollowContext'
import type { FollowListItem } from '../../types'

interface ProfileFollowersModalProps {
  type: 'followers' | 'following'
  userID: string
  onClose: () => void
}

export default function ProfileFollowersModal({ type, userID, onClose }: ProfileFollowersModalProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { followUser: ctxFollowUser } = useFollowContext()
  const [list, setList] = useState<FollowListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [followBusy, setFollowBusy] = useState<string | null>(null)

  useState(() => {
    const fn = type === 'followers' ? getFollowers : getFollowing
    fn(userID, 1, 20)
      .then((res) => {
        setList(res.data)
        setHasMore(res.has_more)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  })

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const fn = type === 'followers' ? getFollowers : getFollowing
      const res = await fn(userID, page + 1, 20)
      setList((prev) => [...prev, ...res.data])
      setPage((prev) => prev + 1)
      setHasMore(res.has_more)
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false)
    }
  }

  const handleFollow = async (userId: string) => {
    if (followBusy) return
    setFollowBusy(userId)
    try {
      await ctxFollowUser(userId)
    } catch {
      /* ignore */
    } finally {
      setFollowBusy(null)
    }
  }

  const q = search.toLowerCase()
  const filteredList = q
    ? list.filter((u) => u.display_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
    : list

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {type === 'followers' ? t('profile.followersList') : t('profile.followingList')}
          </h3>
          <button className={styles.modalClose} onClick={onClose}>
            <i className="bx bx-x" />
          </button>
        </div>
        <div className={styles.modalSearchWrap}>
          <i className="bx bx-search" />
          <input
            className={styles.modalSearch}
            type="text"
            placeholder={t('profile.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.modalBody}>
          {loading && list.length === 0 && (
            <div className={styles.followEmpty}>
              <div className={styles.loadingSpinner} />
            </div>
          )}
          {!loading && filteredList.length === 0 && (
            <div className={styles.followEmpty}>
              {search ? t('profile.noResults') : (type === 'followers' ? t('profile.followers') : t('profile.following'))}
            </div>
          )}
          {filteredList.map((user) => (
            <div key={user.user_id} className={styles.followItem}>
              <div
                className={styles.followItemMain}
                onClick={() => {
                  onClose()
                  router.push(`/profile/${user.user_id}`)
                }}
              >
                <Image
                  className={styles.followAvatar}
                  src={user.avatar_uri || '/default-avatar.svg'}
                  alt={user.display_name}
                  width={40}
                  height={40}
                  unoptimized
                />
                <div className={styles.followInfo}>
                  <span className={styles.followName}>{user.display_name}</span>
                  <span className={styles.followUsername}>@{user.username}</span>
                </div>
              </div>
              <button
                className={`${styles.followBtn} ${followBusy === user.user_id ? styles.followBtnBusy : ''}`}
                onClick={() => handleFollow(user.user_id)}
                disabled={followBusy === user.user_id}
              >
                <i className="bx bx-user-plus" />
              </button>
            </div>
          ))}
          {hasMore && filteredList.length > 0 && (
            <div className={styles.loadingWrap} onClick={loadMore} style={{ cursor: 'pointer' }}>
              {loadingMore ? <div className={styles.loadingSpinner} /> : <span>{t('common.nextPage')}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
