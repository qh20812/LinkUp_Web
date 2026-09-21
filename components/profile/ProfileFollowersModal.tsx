'use client'

import { useState, useEffect } from 'react'
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
  currentUserID?: string
  onClose: () => void
}

export default function ProfileFollowersModal({ type, userID, currentUserID, onClose }: ProfileFollowersModalProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { followUser: ctxFollowUser, unfollowUser: ctxUnfollowUser } = useFollowContext()
  const [list, setList] = useState<FollowListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [followBusy, setFollowBusy] = useState<string | null>(null)
  const [followedSet, setFollowedSet] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    const fn = type === 'followers' ? getFollowers : getFollowing
    fn(userID, 1, 20)
      .then((res) => {
        if (cancelled) return
        setList(res.data)
        setFollowedSet(new Set(res.data.filter((u) => u.is_following).map((u) => u.user_id)))
        setHasMore(res.has_more)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [type, userID])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const fn = type === 'followers' ? getFollowers : getFollowing
      const res = await fn(userID, page + 1, 20)
      setList((prev) => [...prev, ...res.data])
      setFollowedSet((prev) => {
        const next = new Set(prev)
        res.data.filter((u) => u.is_following).forEach((u) => next.add(u.user_id))
        return next
      })
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
    const isFollowing = followedSet.has(userId)
    try {
      if (isFollowing) {
        await ctxUnfollowUser(userId)
      } else {
        await ctxFollowUser(userId)
      }
      setFollowedSet((prev) => {
        const next = new Set(prev)
        if (isFollowing) {
          next.delete(userId)
        } else {
          next.add(userId)
        }
        return next
      })
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
              {search
                ? t('profile.noResults')
                : type === 'followers'
                  ? t('profile.noFollowers')
                  : t('profile.noFollowing')}
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
              {currentUserID && currentUserID !== user.user_id && (
                <button
                  className={`${styles.followBtn} ${followedSet.has(user.user_id) ? styles.followBtnActive : ''} ${followBusy === user.user_id ? styles.followBtnBusy : ''}`}
                  onClick={() => handleFollow(user.user_id)}
                  disabled={followBusy === user.user_id}
                >
                  <i className={followedSet.has(user.user_id) ? 'bx bx-user-check' : 'bx bx-user-plus'} />
                  <span>{followedSet.has(user.user_id) ? t('profile.followingBtn') : t('profile.follow')}</span>
                </button>
              )}
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
