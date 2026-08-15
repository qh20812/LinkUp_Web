'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import ExternalImage from '../ExternalImage'
import StoryAvatar from '../story/StoryAvatar'
import styles from './ProfileHeader.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import type { ViewProfileResponse } from '../../types'
import type { FollowStats } from '../../hooks/profile/useFollowStats'

function formatJoinDate(dateStr: string, t: (key: string) => string): string {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  return t('profile.joinedDate').replace('{month}', String(month)).replace('{year}', String(year))
}

interface ProfileHeaderProps {
  profile: ViewProfileResponse
  stats: FollowStats | null
  isSelf: boolean
  isPrivate: boolean
  isFollowing?: boolean
  followBusy?: boolean
  messageBusy?: boolean
  inviteSent?: boolean
  showActions?: boolean
  hasStory?: boolean
  hasStoryViewed?: boolean
  onFollow?: () => void
  onMessage?: () => void
  onOpenFollowers?: () => void
  onOpenFollowing?: () => void
  onAvatarChange?: (file: File) => void
  onCoverChange?: (file: File) => void
  onSaved?: (profile: ViewProfileResponse) => void
  onViewStory?: () => void
  onViewAvatar?: () => void
}

export default function ProfileHeader({
  profile,
  stats,
  isSelf,
  isPrivate,
  isFollowing,
  followBusy,
  messageBusy,
  inviteSent,
  showActions = true,
  hasStory = false,
  hasStoryViewed = false,
  onFollow,
  onMessage,
  onOpenFollowers,
  onOpenFollowing,
  onAvatarChange,
  onCoverChange,
  onSaved,
  onViewStory,
  onViewAvatar,
}: ProfileHeaderProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const avatarWrapRef = useRef<HTMLDivElement>(null)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState(profile.display_name)
  const [editBio, setEditBio] = useState(profile.bio)
  const [editPrivateProfile, setEditPrivateProfile] = useState(profile.is_private_profile)
  const [editPrivatePosts, setEditPrivatePosts] = useState(profile.is_private_posts)
  const [editAllowStrangerFriend, setEditAllowStrangerFriend] = useState(profile.allow_stranger_friend_request)
  const [saving, setSaving] = useState(false)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)

  useEffect(() => {
    if (!showAvatarMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarWrapRef.current && !avatarWrapRef.current.contains(e.target as Node)) {
        setShowAvatarMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAvatarMenu])

  const handleAvatarClick = () => {
    if (isSelf && !hasStory) {
      fileInputRef.current?.click()
    } else {
      setShowAvatarMenu(!showAvatarMenu)
    }
  }

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onAvatarChange) onAvatarChange(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCoverClick = () => {
    if (isSelf && onCoverChange) coverInputRef.current?.click()
  }

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onCoverChange) onCoverChange(file)
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  const handleEdit = () => {
    setEditName(profile.display_name)
    setEditBio(profile.bio)
    setEditPrivateProfile(profile.is_private_profile)
    setEditPrivatePosts(profile.is_private_posts)
    setEditAllowStrangerFriend(profile.allow_stranger_friend_request)
    setEditMode(true)
  }

  const handleCancel = () => setEditMode(false)

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const { updateProfile } = await import('../../api/profile')
      const res = await updateProfile({
        display_name: editName,
        bio: editBio,
        is_private_profile: editPrivateProfile,
        is_private_posts: editPrivatePosts,
        allow_stranger_friend_request: editAllowStrangerFriend,
      })
      if (onSaved) onSaved(res.data)
      setEditMode(false)
    } catch {
      /* toast handled by parent if needed */
    } finally {
      setSaving(false)
    }
  }

  if (isSelf && editMode) {
    return (
      <div className={styles.headerCard}>
        <div className={styles.coverWrap}>
          {profile.cover_uri ? (
            <ExternalImage src={profile.cover_uri} alt="" className={styles.coverImg} />
          ) : (
            <div className={styles.coverFallback} />
          )}
        </div>
        <div className={styles.headerBody}>
          <div className={styles.headerTop}>
            <div className={styles.avatarWrap} ref={avatarWrapRef} onClick={handleAvatarClick}>
              <StoryAvatar
                src={profile.avatar_uri || ''}
                name={profile.display_name}
                hasStory={hasStory}
                hasViewed={hasStoryViewed}
                size={96}
              />
              {isSelf && (
                <div className={styles.avatarOverlay}>
                  <span className={styles.avatarOverlayIcon}><i className="bx bx-camera" /></span>
                  <span className={styles.avatarOverlayText}>{t('profile.changeAvatar')}</span>
                </div>
              )}
              {showAvatarMenu && (
                <div className={styles.avatarMenu}>
                  {hasStory && (
                    <button className={styles.avatarMenuItem} onClick={(e) => { e.stopPropagation(); setShowAvatarMenu(false); onViewStory?.() }}>
                      <i className="bx bx-show" /> {t('story.viewStory')}
                    </button>
                  )}
                  <button className={styles.avatarMenuItem} onClick={(e) => { e.stopPropagation(); setShowAvatarMenu(false); onViewAvatar?.() }}>
                    <i className="bx bx-image" /> {t('story.viewAvatar')}
                  </button>
                  {isSelf && (
                    <button className={styles.avatarMenuItem} onClick={(e) => { e.stopPropagation(); setShowAvatarMenu(false); fileInputRef.current?.click() }}>
                      <i className="bx bx-camera" /> {t('story.changeAvatar')}
                    </button>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarFileChange}
              />
            </div>
            <div className={styles.userInfo}>
              <p className={styles.displayName}>{profile.display_name}</p>
              {profile.username && <p className={styles.username}>@{profile.username}</p>}
              {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
            </div>
          </div>

          <div className={styles.editForm}>
            <label className={styles.fieldLabel}>{t('profile.editDisplayName')}</label>
            <input
              className={styles.input}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={50}
            />
            <label className={styles.fieldLabel}>{t('profile.editBio')}</label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              maxLength={200}
            />

            <div className={styles.privacySection}>
              <span className={styles.privacyTitle}>{t('profile.privacySection')}</span>

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>{t('profile.privateProfile')}</span>
                  <span className={styles.settingHint}>{t('profile.privateProfileHint')}</span>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={editPrivateProfile}
                    onChange={(e) => setEditPrivateProfile(e.target.checked)}
                  />
                  <span className={styles.toggleTrack}>
                    <span className={styles.toggleThumb} />
                  </span>
                </label>
              </div>

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>{t('profile.privatePosts')}</span>
                  <span className={styles.settingHint}>{t('profile.privatePostsHint')}</span>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={editPrivatePosts}
                    onChange={(e) => setEditPrivatePosts(e.target.checked)}
                  />
                  <span className={styles.toggleTrack}>
                    <span className={styles.toggleThumb} />
                  </span>
                </label>
              </div>

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>{t('profile.allowStrangerFriend')}</span>
                  <span className={styles.settingHint}>{t('profile.allowStrangerFriendHint')}</span>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={editAllowStrangerFriend}
                    onChange={(e) => setEditAllowStrangerFriend(e.target.checked)}
                  />
                  <span className={styles.toggleTrack}>
                    <span className={styles.toggleThumb} />
                  </span>
                </label>
              </div>
            </div>

            <div className={styles.editActions}>
              <button className={styles.cancelBtn} onClick={handleCancel}>{t('common.cancel')}</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? t('common.loading') : t('profile.saveChanges')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.headerCard}>
      <div className={styles.coverWrap} onClick={handleCoverClick}>
        {profile.cover_uri ? (
          <ExternalImage src={profile.cover_uri} alt="" className={styles.coverImg} />
        ) : (
          <div className={styles.coverFallback} />
        )}
        {isSelf && (
          <>
            <div className={styles.coverOverlay}>
              <i className="bx bx-camera" /> <span>{t('profile.changeCover')}</span>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleCoverFileChange}
            />
          </>
        )}
      </div>

      <div className={styles.headerBody}>
        <div className={styles.headerTop}>
          <div className={styles.avatarWrap} ref={avatarWrapRef} onClick={handleAvatarClick}>
            <StoryAvatar
              src={profile.avatar_uri || ''}
              name={profile.display_name}
              hasStory={hasStory}
              hasViewed={hasStoryViewed}
              size={96}
            />
            {isSelf && (
              <div className={styles.avatarOverlay}>
                <span className={styles.avatarOverlayIcon}><i className="bx bx-camera" /></span>
                <span className={styles.avatarOverlayText}>{t('profile.changeAvatar')}</span>
              </div>
            )}
            {showAvatarMenu && (
              <div className={styles.avatarMenu}>
                {hasStory && (
                  <button className={styles.avatarMenuItem} onClick={(e) => { e.stopPropagation(); setShowAvatarMenu(false); onViewStory?.() }}>
                    <i className="bx bx-show" /> {t('story.viewStory')}
                  </button>
                )}
                <button className={styles.avatarMenuItem} onClick={(e) => { e.stopPropagation(); setShowAvatarMenu(false); onViewAvatar?.() }}>
                  <i className="bx bx-image" /> {t('story.viewAvatar')}
                </button>
                {isSelf && (
                  <button className={styles.avatarMenuItem} onClick={(e) => { e.stopPropagation(); setShowAvatarMenu(false); fileInputRef.current?.click() }}>
                    <i className="bx bx-camera" /> {t('story.changeAvatar')}
                  </button>
                )}
              </div>
            )}
            {isSelf && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarFileChange}
              />
            )}
          </div>
          <div className={styles.userInfo}>
            <p className={styles.displayName}>{profile.display_name}</p>
            {profile.username && <p className={styles.username}>@{profile.username}</p>}
            {isPrivate ? (
              <span className={styles.privateLabel}>
                <i className="bx bx-lock-alt" /> {t('profile.private')}
              </span>
            ) : profile.bio ? (
              <p className={styles.bio}>{profile.bio}</p>
            ) : null}
            <div className={styles.meta}>
              {profile.post_count > 0 && (
                <span className={styles.metaItem}>
                  <i className="bx bx-file" /> {profile.post_count} {t('profile.postsCount')}
                </span>
              )}
              {profile.created_at && (
                <span className={styles.metaItem}>
                  <i className="bx bx-calendar" /> {formatJoinDate(profile.created_at, t)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.stats}>
          <div
            className={styles.statItem}
            onClick={onOpenFollowers}
            role={onOpenFollowers ? 'button' : undefined}
            tabIndex={onOpenFollowers ? 0 : undefined}
          >
            <span className={styles.statValue}>{stats?.follower_count ?? 0}</span>
            <span className={styles.statLabel}>{t('profile.followers')}</span>
          </div>
          <div
            className={styles.statItem}
            onClick={onOpenFollowing}
            role={onOpenFollowing ? 'button' : undefined}
            tabIndex={onOpenFollowing ? 0 : undefined}
          >
            <span className={styles.statValue}>{stats?.following_count ?? 0}</span>
            <span className={styles.statLabel}>{t('profile.following')}</span>
          </div>
        </div>

        {isSelf ? (
          <div className={styles.actionRow}>
            <button className={styles.editBtn} onClick={handleEdit}>
              <i className="bx bx-edit" /> {t('profile.editProfile')}
            </button>
            <Link href="/settings" className={styles.settingsBtn}>
              <i className="bx bx-cog" /> {t('nav.settings')}
            </Link>
          </div>
        ) : showActions && !isPrivate ? (
          <div className={styles.actionRow}>
            <button
              type="button"
              className={`${styles.editBtn} ${
                inviteSent || messageBusy ? styles.actionBtnDisabled : ''
              }`}
              onClick={onMessage}
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
              className={`${styles.followBtn} ${isFollowing ? styles.followBtnActive : ''}`}
              onClick={onFollow}
              disabled={followBusy}
            >
              {isFollowing ? <i className="bx bx-user-check" /> : <i className="bx bx-user-plus" />}
              {isFollowing ? t('profile.unfollow') : t('profile.follow')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
