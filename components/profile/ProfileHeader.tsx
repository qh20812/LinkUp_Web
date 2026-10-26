'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import ExternalImage from '../ExternalImage'
import OnlineIndicator from '../OnlineIndicator'
import StoryAvatar from '../story/StoryAvatar'
import FriendButton from './FriendButton'
import { renderEmojiContent } from '../messages/EmojiImage'
import { emojiByCode, getEmotionEmojis } from '../../utils/emojis'
import styles from './ProfileHeader.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import { usePresence } from '../../contexts/PresenceContext'
import type { ViewProfileResponse } from '../../types'
import type { FollowStats } from '../../hooks/profile/useFollowStats'

const EMOJI_CODE_MAP = emojiByCode(getEmotionEmojis())

function formatJoinDate(dateStr: string, t: (key: string) => string): string {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  return t('profile.joinedDate').replace('{month}', String(month)).replace('{year}', String(year))
}

function formatCompact(n: number): string {
  if (n < 1000) return new Intl.NumberFormat('vi-VN').format(n)
  return new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(n)
}

function useCountUp(value: number, duration = 800): number {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  useEffect(() => {
    const from = fromRef.current
    if (from === value) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot sync for reduced-motion, no animation loop
      setDisplay(value)
      fromRef.current = value
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- rAF animation frame, not a cascading render
      setDisplay(Math.round(from + (value - from) * eased))
      if (p < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        fromRef.current = value
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return display
}

// Remount theo key={src} nên state loaded tự reset khi cover đổi — không cần effect
function CoverPhoto({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <ExternalImage
      src={src}
      alt=""
      className={`${styles.coverImg} ${styles.coverFade} ${loaded ? styles.coverFadeLoaded : ''}`}
      onLoad={() => setLoaded(true)}
    />
  )
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
  targetUserID?: string
  onFollow?: () => void
  onMessage?: () => void
  onOpenFollowers?: () => void
  onOpenFollowing?: () => void
  onAvatarChange?: (file: File) => void
  onCoverChange?: (file: File) => void
  onSaved?: (profile: ViewProfileResponse) => void
  onEdit?: () => void
  onShare?: () => void
  onViewStory?: () => void
  onViewAvatar?: () => void
  menuSlot?: React.ReactNode
  mutualSlot?: React.ReactNode
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
  targetUserID,
  onFollow,
  onMessage,
  onOpenFollowers,
  onOpenFollowing,
  onAvatarChange,
  onCoverChange,
  onEdit,
  onShare,
  onViewStory,
  onViewAvatar,
  menuSlot,
  mutualSlot,
}: ProfileHeaderProps) {
  const { t } = useTranslation()
  const { isOnline, prefetchPresence } = usePresence()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const avatarWrapRef = useRef<HTMLDivElement>(null)
  const coverParallaxRef = useRef<HTMLDivElement>(null)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)

  const followerCount = useCountUp(stats?.follower_count ?? 0)
  const followingCount = useCountUp(stats?.following_count ?? 0)
  const friendCount = useCountUp(profile.friend_count ?? 0)
  const online = isOnline(targetUserID || '')

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = coverParallaxRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        if (rect.bottom < 0 || rect.top > window.innerHeight) return
        const shift = Math.min(24, Math.max(0, -rect.top) * 0.15)
        el.style.transform = `translateY(${shift}px)`
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    if (!showAvatarMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarWrapRef.current && !avatarWrapRef.current.contains(e.target as Node)) {
        setShowAvatarMenu(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAvatarMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showAvatarMenu])

  useEffect(() => {
    if (targetUserID) prefetchPresence([targetUserID])
  }, [targetUserID, prefetchPresence])

  // Avatar gom các hành động liên quan tới ảnh đại diện, nhưng chỉ mở menu khi
  // có từ 2 lựa chọn trở lên — chỉ một thì chạy thẳng, đỡ một cú click vô nghĩa:
  //   • người khác, không có story  → mở ảnh ngay
  //   • mình, chưa có ảnh đại diện  → mở hộp chọn tệp ngay
  //   • còn lại (≥ 2 hành động)     → menu
  const canViewAvatar = !!profile.avatar_uri && !!onViewAvatar
  const canChangeAvatar = isSelf && !!onAvatarChange
  const avatarActionCount =
    (hasStory && onViewStory ? 1 : 0) + (canViewAvatar ? 1 : 0) + (canChangeAvatar ? 1 : 0)
  const hasAvatarMenu = avatarActionCount >= 2
  const avatarActionLabel = hasAvatarMenu
    ? t('profile.avatarOptions')
    : canViewAvatar
      ? t('story.viewAvatar')
      : t('story.changeAvatar')

  const handleAvatarClick = () => {
    if (hasAvatarMenu) {
      setShowAvatarMenu((open) => !open)
      return
    }
    if (canViewAvatar) onViewAvatar?.()
    else if (canChangeAvatar) fileInputRef.current?.click()
  }

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onAvatarChange) onAvatarChange(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const renderAvatarMenu = () => hasAvatarMenu && showAvatarMenu && (
    <div className={styles.avatarMenu} role="menu">
      {hasStory && onViewStory && (
        <button type="button" className={styles.avatarMenuItem} role="menuitem" onClick={(e) => { e.stopPropagation(); setShowAvatarMenu(false); onViewStory() }}>
          <i className="bx bx-show" /> <span>{t('story.viewStory')}</span>
        </button>
      )}
      {canViewAvatar && (
        <button type="button" className={styles.avatarMenuItem} role="menuitem" onClick={(e) => { e.stopPropagation(); setShowAvatarMenu(false); onViewAvatar?.() }}>
          <i className="bx bx-image" /> <span>{t('story.viewAvatar')}</span>
        </button>
      )}
      {canChangeAvatar && (
        <button type="button" className={styles.avatarMenuItem} role="menuitem" onClick={(e) => { e.stopPropagation(); setShowAvatarMenu(false); fileInputRef.current?.click() }}>
          <i className="bx bx-camera" /> <span>{t('story.changeAvatar')}</span>
        </button>
      )}
    </div>
  )

  const avatarImage = (
    <StoryAvatar
      src={profile.avatar_uri || ''}
      name={profile.display_name}
      hasStory={hasStory}
      hasViewed={hasStoryViewed}
      size={120}
    />
  )

  const handleCoverClick = () => {
    if (isSelf && onCoverChange) coverInputRef.current?.click()
  }

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onCoverChange) onCoverChange(file)
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  const handleEdit = () => {
    onEdit?.()
  }

  return (
    <div className={styles.headerCard}>
      <div className={styles.coverWrap} onClick={handleCoverClick}>
        <div className={styles.coverParallax} ref={coverParallaxRef} aria-hidden={!!profile.cover_uri}>
          {profile.cover_uri ? (
            <CoverPhoto key={profile.cover_uri} src={profile.cover_uri} />
          ) : (
            <div className={styles.coverFallback} />
          )}
        </div>
        <div className={styles.coverScrim} aria-hidden />
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

      {menuSlot}

      <div className={styles.headerBody}>
        <div className={styles.glassCard}>
        <div className={styles.headerTop}>
          <div className={styles.avatarWrap} ref={avatarWrapRef}>
            {avatarActionCount > 0 ? (
              <button
                type="button"
                className={styles.avatarButton}
                onClick={handleAvatarClick}
                aria-haspopup={hasAvatarMenu ? 'menu' : undefined}
                aria-expanded={hasAvatarMenu ? showAvatarMenu : undefined}
                aria-label={avatarActionLabel}
                data-testid="profile-avatar"
              >
                {avatarImage}
              </button>
            ) : (
              <div className={styles.avatarStatic}>{avatarImage}</div>
            )}
            {online && <span className={styles.onlinePulse} aria-hidden />}
            <OnlineIndicator isOnline={online} />
            {renderAvatarMenu()}
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
            {profile.username && (
              <div className={styles.usernameRow}>
                <button
                  type="button"
                  className={styles.username}
                  onClick={onShare}
                  title={t('profile.shareProfile')}
                  aria-label={t('profile.shareProfile')}
                >
                  @{profile.username} <i className="bx bx-copy" aria-hidden />
                </button>
                {onShare && (
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.shareBtn}`}
                    onClick={onShare}
                    aria-label={t('profile.shareProfile')}
                    title={t('profile.shareProfile')}
                  >
                    <i className="bx bx-share-alt" aria-hidden />
                  </button>
                )}
              </div>
            )}
            {isPrivate ? (
              <span className={styles.privateLabel}>
                <i className="bx bx-lock-alt" /> {t('profile.private')}
              </span>
            ) : profile.bio ? (
              <p className={styles.bio}>{renderEmojiContent(profile.bio, EMOJI_CODE_MAP, 'bio')}</p>
            ) : null}
            <div className={styles.meta}>
              {profile.post_count > 0 && (
                <span className={styles.metaItem}>
                  <i className="bx bx-file" /> {formatCompact(profile.post_count)} {t('profile.postsCount')}
                </span>
              )}
              {profile.created_at && (
                <span className={styles.metaItem}>
                  <i className="bx bx-calendar" /> {formatJoinDate(profile.created_at, t)}
                </span>
              )}
            </div>
            {mutualSlot && <div className={styles.mutualSlot}>{mutualSlot}</div>}
          </div>
        </div>

        <div className={styles.stats}>
          <div
            className={styles.statItem}
            onClick={onOpenFollowers}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenFollowers?.() } }}
            role={onOpenFollowers ? 'button' : undefined}
            tabIndex={onOpenFollowers ? 0 : undefined}
            aria-label={t('profile.followers')}
          >
            <span className={styles.statValue}>{formatCompact(followerCount)}</span>
            <span className={styles.statLabel}>{t('profile.followers')}</span>
          </div>
          <div
            className={styles.statItem}
            onClick={onOpenFollowing}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenFollowing?.() } }}
            role={onOpenFollowing ? 'button' : undefined}
            tabIndex={onOpenFollowing ? 0 : undefined}
            aria-label={t('profile.following')}
          >
            <span className={styles.statValue}>{formatCompact(followingCount)}</span>
            <span className={styles.statLabel}>{t('profile.following')}</span>
          </div>
          {profile.friend_count > 0 && (
            <div className={styles.statItem}>
              <span className={styles.statValue}>{formatCompact(friendCount)}</span>
              <span className={styles.statLabel}>{t('profile.friends')}</span>
            </div>
          )}
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
            {targetUserID && <FriendButton userID={targetUserID} />}
            <button
              type="button"
              className={`${styles.ctaBtn} ${
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
              className={styles.primaryBtn}
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
    </div>
  )
}
