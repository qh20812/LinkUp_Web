'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getProfileByUserID } from '../../../../api/profile'
import { getFollowStats, followUser } from '../../../../api/follow'
import { startDirectChat, createChatInvite } from '../../../../api/chats'
import { getTokenPayload } from '../../../../api/auth'
import { useTranslation } from '../../../../hooks/useTranslation'
import type { ViewProfileResponse } from '../../../../types'
import ExternalImage from '../../../../components/ExternalImage'
import styles from './ProfilePage.module.css'

interface FollowStats {
  follower_count: number
  following_count: number
  is_following?: boolean
}

export default function ProfilePage() {
  const params = useParams<{ userID: string }>()
  const userID = params?.userID
  if (!userID) return <div className={styles.center} />
  return <ProfileView key={userID} userID={userID} />
}

function ProfileView({ userID }: { userID: string }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [profile, setProfile] = useState<ViewProfileResponse | null>(null)
  const [stats, setStats] = useState<FollowStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [following, setFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [messageBusy, setMessageBusy] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [currentUserID, setCurrentUserID] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUserID(getTokenPayload()?.user_id ?? null)
  }, [])

  useEffect(() => {
    let cancelled = false
    getProfileByUserID(userID)
      .then((p) => {
        if (!cancelled) setProfile(p)
      })
      .catch(() => {
        if (!cancelled) setError('Không thể tải hồ sơ người dùng.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userID])

  useEffect(() => {
    let cancelled = false
    getFollowStats(userID)
      .then((s) => {
        if (cancelled) return
        setStats(s)
        setFollowing(!!s.is_following)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [userID])

  const isSelf = currentUserID != null && currentUserID === userID

  const handleFollow = async () => {
    if (!userID || followBusy) return
    setFollowBusy(true)
    try {
      await followUser(userID)
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
  }

  const handleMessage = async () => {
    if (!userID || messageBusy || inviteSent) return
    setMessageBusy(true)
    try {
      const res = await startDirectChat(userID)
      if ('needInvite' in res) {
        // Người lạ chưa cho phép nhắn tin → gửi lời mời chat, chờ chấp nhận.
        await createChatInvite(userID)
        setInviteSent(true)
        return
      }
      router.push(`/messages?chat_id=${res.chatId}`)
    } catch {
      /* giữ nguyên trạng thái nút */
    } finally {
      setMessageBusy(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.center}>
        <i className="bx bx-loader-circle bx-spin" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className={styles.center}>
        <i className="bx bx-user-x" />
        <p>{error ?? 'Không tìm thấy người dùng.'}</p>
        <Link href="/" className={styles.backBtn}>
          {t('common.back') || 'Quay lại'}
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.avatarWrap}>
          {profile.avatar_uri ? (
            <ExternalImage src={profile.avatar_uri} alt="" className={styles.avatar} />
          ) : (
            <i className="bx bxs-user" />
          )}
        </div>
        <div className={styles.info}>
          <h2 className={styles.name}>{profile.display_name}</h2>
          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

          <div className={styles.stats}>
            <span>
              <strong>{stats?.follower_count ?? 0}</strong> {t('profile.followers')}
            </span>
            <span>
              <strong>{stats?.following_count ?? 0}</strong> {t('profile.following')}
            </span>
          </div>
        </div>

        {isSelf ? (
          <Link href="/settings" className={styles.actionBtn}>
            <i className="bx bx-cog" />
            {t('nav.settings')}
          </Link>
        ) : currentUserID ? (
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.actionBtn} ${
                inviteSent || messageBusy ? styles.actionBtnDisabled : ''
              }`}
              onClick={handleMessage}
              disabled={messageBusy || inviteSent}
            >
              {inviteSent ? (
                <i className="bx bx-time-five" />
              ) : (
                <i className="bx bx-message-rounded" />
              )}
              {inviteSent ? t('profile.inviteSent') : t('profile.message')}
            </button>
            <button
              type="button"
className={`${styles.actionBtn} ${styles.actionBtnSecondary} ${
                following ? styles.actionBtnActive : ''
              }`}
              onClick={handleFollow}
              disabled={followBusy}
            >
              {following ? <i className="bx bx-user-check" /> : <i className="bx bx-user-plus" />}
              {following ? t('profile.unfollow') : t('profile.follow')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
