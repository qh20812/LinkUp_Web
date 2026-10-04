'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './ProfileRail.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import { getFriends } from '../../api/friends'
import { getUserMedia } from '../../api/posts'
import { resolveWorkLabel, resolveEducationLabel } from '../../data/profile-enums'
import { renderEmojiContent } from '../messages/EmojiImage'
import { emojiByCode, getEmotionEmojis } from '../../utils/emojis'
import ProfileCompletion from './ProfileCompletion'
import type { FriendUser, MediaItem, ViewProfileResponse } from '../../types'

const EMOJI_CODE_MAP = emojiByCode(getEmotionEmojis())

export function gotoProfileTab(tab: 'posts' | 'media' | 'friends' | 'about') {
  window.dispatchEvent(new CustomEvent('profile:goto-tab', { detail: tab }))
}

function formatJoinDate(dateStr: string, t: (key: string) => string): string {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  return t('profile.joinedDate').replace('{month}', String(month)).replace('{year}', String(year))
}

interface ProfileRailProps {
  userID: string
  profile: ViewProfileResponse
  isSelf?: boolean
  onEdit?: () => void
}

export default function ProfileRail({ userID, profile, isSelf = false, onEdit }: ProfileRailProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [friendsTotal, setFriendsTotal] = useState(0)
  const [photos, setPhotos] = useState<MediaItem[]>([])
  const [photosTotal, setPhotosTotal] = useState(0)

  useEffect(() => {
    let cancelled = false
    getFriends(userID, 1, 9)
      .then((res) => {
        if (cancelled) return
        setFriends(res.data ?? [])
        setFriendsTotal(res.total ?? 0)
      })
      .catch(() => {})
    getUserMedia(userID, 1, 9)
      .then((res) => {
        if (cancelled) return
        setPhotos(res.data ?? [])
        setPhotosTotal(res.total ?? 0)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [userID])

  const workValue = profile.work === 'other'
    ? profile.work_other
    : resolveWorkLabel(profile.work, t)

  const educationValue = resolveEducationLabel(profile.education, t)

  const websiteHref = profile.website
    ? (profile.website.startsWith('http') ? profile.website : `https://${profile.website}`)
    : ''

  const hasIntro = profile.bio || workValue || educationValue || profile.website || profile.created_at

  return (
    <aside className={styles.rail} aria-label={t('profile.railLabel')}>
      {isSelf && onEdit && <ProfileCompletion profile={profile} onEdit={onEdit} />}
      {hasIntro && (
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>{t('profile.tabAbout')}</h3>
          {profile.bio && (
            <p className={styles.bio}>{renderEmojiContent(profile.bio, EMOJI_CODE_MAP, 'bio-rail')}</p>
          )}
          <ul className={styles.factList}>
            {workValue && (
              <li className={styles.factItem}>
                <i className="bx bx-briefcase" aria-hidden />
                <span>{workValue}</span>
              </li>
            )}
            {educationValue && (
              <li className={styles.factItem}>
                <i className="bx bx-spreadsheet" aria-hidden />
                <span>{educationValue}</span>
              </li>
            )}
            {profile.website && (
              <li className={styles.factItem}>
                <i className="bx bx-link" aria-hidden />
                <a href={websiteHref} target="_blank" rel="noopener noreferrer" className={styles.factLink}>
                  {profile.website}
                </a>
              </li>
            )}
            {profile.created_at && (
              <li className={styles.factItem}>
                <i className="bx bx-calendar" aria-hidden />
                <span>{formatJoinDate(profile.created_at, t)}</span>
              </li>
            )}
          </ul>
          <button type="button" className={styles.viewAllBtn} onClick={() => gotoProfileTab('about')}>
            {t('profile.viewAll')}
          </button>
        </section>
      )}

      {friendsTotal > 0 && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('profile.tabFriends')}</h3>
            <span className={styles.countBadge}>{friendsTotal}</span>
          </div>
          <div className={styles.avatarGrid}>
            {friends.slice(0, 9).map((f) => (
              <button
                key={f.user_id}
                type="button"
                className={styles.avatarBtn}
                onClick={() => router.push(`/profile/${f.user_id}`)}
                title={f.display_name}
                aria-label={f.display_name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.avatar_uri || '/default-avatar.svg'}
                  alt=""
                  className={styles.avatarImg}
                  loading="lazy"
                />
              </button>
            ))}
          </div>
          <button type="button" className={styles.viewAllBtn} onClick={() => gotoProfileTab('friends')}>
            {t('profile.viewAll')}
          </button>
        </section>
      )}

      {photosTotal > 0 && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{t('profile.tabMedia')}</h3>
            <span className={styles.countBadge}>{photosTotal}</span>
          </div>
          <div className={styles.photoGrid}>
            {photos.slice(0, 9).map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.photoBtn}
                onClick={() => gotoProfileTab('media')}
                aria-label={t('profile.tabMedia')}
              >
                {item.file_type.startsWith('video') ? (
                  <span className={styles.videoThumb}>
                    <video src={item.file_uri} muted preload="metadata" />
                    <i className="bx bx-play" aria-hidden />
                  </span>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={item.file_uri} alt="" loading="lazy" />
                )}
              </button>
            ))}
          </div>
          <button type="button" className={styles.viewAllBtn} onClick={() => gotoProfileTab('media')}>
            {t('profile.viewAll')}
          </button>
        </section>
      )}
    </aside>
  )
}
