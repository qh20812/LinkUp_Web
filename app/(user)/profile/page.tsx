'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './Profile.module.css'
import { getMyProfile, uploadAvatar, uploadCover } from '../../../api/profile'
import { checkUserStory, getUserStories } from '../../../api/stories'
import { getTokenPayload } from '../../../api/auth'
import { useAuth } from '../../../hooks/useAuth'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { useFollowContext } from '../../../contexts/FollowContext'
import { useFollowStats } from '../../../hooks/profile/useFollowStats'
import ProfileHeader from '../../../components/profile/ProfileHeader'
import ProfileTabs from '../../../components/profile/ProfileTabs'
import ProfileFollowersModal from '../../../components/profile/ProfileFollowersModal'
import ProfileEditModal from '../../../components/profile/ProfileEditModal'
import ProfileSkeleton from '../../../components/profile/ProfileSkeleton'
import StoryViewer from '../../../components/story/StoryViewer'
import type { ViewProfileResponse, StoryItem } from '../../../types'

export default function MyProfilePage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const { isAuthenticated, initializing } = useAuth()
  const { followUser: ctxFollowUser } = useFollowContext()

  const [userID, setUserID] = useState<string | null>(null)
  const [profile, setProfile] = useState<ViewProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'network' | null>(null)
  const [hasStory, setHasStory] = useState(false)
  const [myStories, setMyStories] = useState<StoryItem[] | null>(null)

  const { stats } = useFollowStats(userID)

  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    const payload = getTokenPayload()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (payload?.user_id) setUserID(payload.user_id)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [userID])

  useEffect(() => {
    if (!userID) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    Promise.all([
      getMyProfile().then((res) => {
        if (!cancelled) setProfile(res)
      }),
    ])
      .catch(() => {
        if (!cancelled) {
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
    if (!userID) return
    checkUserStory(userID).then((res) => setHasStory(res.has_story)).catch(() => {})
  }, [userID])

  const handleAvatarChange = async (file: File) => {
    try {
      const uploadRes = await uploadAvatar(file)
      const avatarUri = uploadRes.data?.file_uri
      if (!avatarUri) throw new Error('Upload failed')
      const { updateProfile } = await import('../../../api/profile')
      const res = await updateProfile({ avatar_uri: avatarUri })
      setProfile(res.data)
      toast({ type: 'success', title: t('profile.changeAvatar') })
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : t('common.error') })
    }
  }

  const handleCoverChange = async (file: File) => {
    try {
      const uploadRes = await uploadCover(file)
      const coverUri = uploadRes.data?.file_uri
      if (!coverUri) throw new Error('Upload failed')
      const { updateProfile } = await import('../../../api/profile')
      const res = await updateProfile({ cover_uri: coverUri })
      setProfile(res.data)
      toast({ type: 'success', title: t('profile.changeCover') })
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : t('common.error') })
    }
  }

  const handleProfileSaved = (updated: ViewProfileResponse) => {
    setProfile(updated)
    setShowEditModal(false)
    toast({ type: 'success', title: t('common.save') })
  }

  const handleViewStory = async () => {
    if (!userID || !hasStory) return
    try {
      const res = await getUserStories(userID)
      setMyStories(res.stories)
    } catch { /* ignore */ }
  }

  if (initializing) return <div className={styles.page} />
  if (!isAuthenticated) {
    router.push('/login')
    return <div className={styles.page} />
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <ProfileSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}>
          <i className={`bx ${errorType === 'network' ? 'bx-wifi-off' : 'bx-error'}`} style={{ fontSize: 40, marginBottom: 'var(--space-sm)' }} />
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {profile && (
        <ProfileHeader
          profile={profile}
          stats={stats}
          isSelf
          isPrivate={false}
          hasStory={hasStory}
          onOpenFollowers={() => setModalType('followers')}
          onOpenFollowing={() => setModalType('following')}
          onAvatarChange={handleAvatarChange}
          onCoverChange={handleCoverChange}
          onSaved={handleProfileSaved}
          onEdit={() => setShowEditModal(true)}
          onViewStory={handleViewStory}
          onViewAvatar={() => {/* TODO: open lightbox */}}
        />
      )}

      {myStories && (
        <StoryViewer stories={myStories} onClose={() => setMyStories(null)} />
      )}

      {showEditModal && profile && (
        <ProfileEditModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSaved={handleProfileSaved}
        />
      )}

      {userID && (
        <ProfileTabs
          userID={userID}
          isSelf
          profile={profile ?? undefined}
          onFollow={async (userId) => {
            try { await ctxFollowUser(userId) } catch { /* ignore */ }
          }}
        />
      )}

      {modalType && userID && (
        <ProfileFollowersModal
          type={modalType}
          userID={userID}
          onClose={() => setModalType(null)}
        />
      )}
    </div>
  )
}
