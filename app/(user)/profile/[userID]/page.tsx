'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getProfileByUserID } from '../../../../api/profile'
import { checkUserStory } from '../../../../api/stories'
import { startDirectChat, createChatInvite } from '../../../../api/chats'
import { getTokenPayload } from '../../../../api/auth'
import { useTranslation } from '../../../../hooks/useTranslation'
import { useFollowContext } from '../../../../contexts/FollowContext'
import { useFollowStats } from '../../../../hooks/profile/useFollowStats'
import ProfileHeader from '../../../../components/profile/ProfileHeader'
import ProfileTabs from '../../../../components/profile/ProfileTabs'
import ProfileFollowersModal from '../../../../components/profile/ProfileFollowersModal'
import ProfileSkeleton from '../../../../components/profile/ProfileSkeleton'
import ProfileMenu from '../../../../components/profile/ProfileMenu'
import MutualFriends from '../../../../components/profile/MutualFriends'
import type { ViewProfileResponse } from '../../../../types'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const params = useParams<{ userID: string }>()
  const userID = params?.userID
  if (!userID) return <div className={styles.center} />
  return <ProfileView key={userID} userID={userID} />
}

function ProfileView({ userID }: { userID: string }) {
  const { t } = useTranslation()
  const router = useRouter()
  const { followUser: ctxFollowUser } = useFollowContext()

  const [profile, setProfile] = useState<ViewProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'private' | 'not-found' | 'network' | null>(null)
  const [currentUserID, setCurrentUserID] = useState<string | null>(null)
  const [messageBusy, setMessageBusy] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null)
  const [hasStory, setHasStory] = useState(false)

  const { stats, following, followBusy, handleFollow } = useFollowStats(userID)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUserID(getTokenPayload()?.user_id ?? null)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [userID])

  useEffect(() => {
    let cancelled = false
    getProfileByUserID(userID)
      .then((p) => {
        if (!cancelled) setProfile(p)
      })
      .catch((err) => {
        if (cancelled) return
        const msg = err?.message ?? ''
        if (msg.includes('PRIVATE_PROFILE') || msg.includes('403')) {
          setError(t('profile.errorPrivate'))
          setErrorType('private')
        } else if (msg.includes('NOT_FOUND') || msg.includes('404')) {
          setError(t('profile.errorNotFound'))
          setErrorType('not-found')
        } else {
          setError(t('profile.errorNetwork'))
          setErrorType('network')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userID, t])

  useEffect(() => {
    checkUserStory(userID).then((res) => setHasStory(res.has_story)).catch(() => {})
  }, [userID])

  const isSelf = currentUserID != null && currentUserID === userID
  const isPrivate = !!profile?.is_private_profile && !isSelf

  const handleMessage = async () => {
    if (!userID || messageBusy || inviteSent) return
    setMessageBusy(true)
    try {
      const res = await startDirectChat(userID)
      if ('needInvite' in res) {
        await createChatInvite(userID)
        setInviteSent(true)
        return
      }
      router.push(`/messages?chat_id=${res.chatId}`)
    } catch {
      /* keep button state */
    } finally {
      setMessageBusy(false)
    }
  }

  const handlePostFollow = async (userId: string) => {
    try {
      await ctxFollowUser(userId)
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <ProfileSkeleton />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className={styles.center}>
        <i className={errorType === 'private' ? 'bx bx-lock-alt' : errorType === 'network' ? 'bx bx-wifi-off' : 'bx bx-user-x'} />
        <p>{error ?? t('profile.errorNotFound')}</p>
        <Link href="/" className={styles.backBtn}>
          {t('common.back')}
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <ProfileHeader
        profile={profile}
        stats={stats}
        isSelf={isSelf}
        isPrivate={isPrivate}
        isFollowing={following}
        followBusy={followBusy}
        messageBusy={messageBusy}
        inviteSent={inviteSent}
        showActions={!!currentUserID}
        hasStory={hasStory}
        targetUserID={userID}
        onFollow={handleFollow}
        onMessage={handleMessage}
        onOpenFollowers={() => setModalType('followers')}
        onOpenFollowing={() => setModalType('following')}
        onViewAvatar={() => {/* TODO: open lightbox */}}
        menuSlot={
          !isSelf && currentUserID ? (
            <div className={styles.menuPosition}>
              <ProfileMenu userID={userID} isSelf={isSelf} />
            </div>
          ) : undefined
        }
      />

      {!isSelf && currentUserID && !isPrivate && (
        <MutualFriends userID={userID} />
      )}

      {!isPrivate && (
        <ProfileTabs
          userID={userID}
          isSelf={isSelf}
          profile={profile}
          onFollow={isSelf ? undefined : handlePostFollow}
        />
      )}

      {modalType && (
        <ProfileFollowersModal
          type={modalType}
          userID={userID}
          onClose={() => setModalType(null)}
        />
      )}
    </div>
  )
}
