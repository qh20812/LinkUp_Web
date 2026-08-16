'use client'

import { useState, useEffect } from 'react'
import styles from './ProfileEditModal.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import { updateProfile } from '../../api/profile'
import type { ViewProfileResponse } from '../../types'

interface ProfileEditModalProps {
  profile: ViewProfileResponse
  onClose: () => void
  onSaved: (updated: ViewProfileResponse) => void
}

export default function ProfileEditModal({ profile, onClose, onSaved }: ProfileEditModalProps) {
  const { t } = useTranslation()
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [bio, setBio] = useState(profile.bio)
  const [location, setLocation] = useState(profile.location)
  const [work, setWork] = useState(profile.work)
  const [education, setEducation] = useState(profile.education)
  const [website, setWebsite] = useState(profile.website)
  const [dateOfBirth, setDateOfBirth] = useState(profile.date_of_birth ? profile.date_of_birth.split('T')[0] : '')
  const [isPrivateProfile, setIsPrivateProfile] = useState(profile.is_private_profile)
  const [isPrivatePosts, setIsPrivatePosts] = useState(profile.is_private_posts)
  const [allowStrangerFriend, setAllowStrangerFriend] = useState(profile.allow_stranger_friend_request)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const input: Record<string, unknown> = {}
      if (displayName !== profile.display_name) input.display_name = displayName
      if (bio !== profile.bio) input.bio = bio
      if (location !== profile.location) input.location = location
      if (work !== profile.work) input.work = work
      if (education !== profile.education) input.education = education
      if (website !== profile.website) input.website = website
      if (dateOfBirth) {
        const dob = new Date(dateOfBirth)
        if (dob.toISOString() !== profile.date_of_birth) input.date_of_birth = dob.toISOString()
      }
      if (isPrivateProfile !== profile.is_private_profile) input.is_private_profile = isPrivateProfile
      if (isPrivatePosts !== profile.is_private_posts) input.is_private_posts = isPrivatePosts
      if (allowStrangerFriend !== profile.allow_stranger_friend_request) input.allow_stranger_friend_request = allowStrangerFriend

      if (Object.keys(input).length === 0) {
        onClose()
        return
      }

      const res = await updateProfile(input)
      onSaved(res.data)
    } catch {
      /* toast handled by parent */
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{t('profile.editProfile')}</h3>
          <button className={styles.modalClose} onClick={onClose}>
            <i className="bx bx-x" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t('profile.editDisplayName')}</label>
            <input
              className={styles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t('profile.editBio')}</label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>{t('profile.aboutLocation')}</label>
              <input
                className={styles.input}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={255}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>{t('profile.aboutWork')}</label>
              <input
                className={styles.input}
                value={work}
                onChange={(e) => setWork(e.target.value)}
                maxLength={255}
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>{t('profile.aboutEducation')}</label>
              <input
                className={styles.input}
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                maxLength={255}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>{t('profile.aboutWebsite')}</label>
              <input
                className={styles.input}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                maxLength={255}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t('profile.aboutBirthday')}</label>
            <input
              className={styles.input}
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

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
                  checked={isPrivateProfile}
                  onChange={(e) => setIsPrivateProfile(e.target.checked)}
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
                  checked={isPrivatePosts}
                  onChange={(e) => setIsPrivatePosts(e.target.checked)}
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
                  checked={allowStrangerFriend}
                  onChange={(e) => setAllowStrangerFriend(e.target.checked)}
                />
                <span className={styles.toggleTrack}>
                  <span className={styles.toggleThumb} />
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>{t('common.cancel')}</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? t('common.loading') : t('profile.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  )
}
