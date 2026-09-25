'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './ProfileEditModal.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import { updateProfile } from '../../api/profile'
import { reverseGeocode } from '../../api/locations'
import { WORK_OPTIONS, EDUCATION_OPTIONS } from '../../data/profile-enums'
import { useToast } from '../../contexts/ToastContext'
import SearchSelect from '../SearchSelect'
import DatePicker from '../DatePicker'
import GiphyEmojiPicker from '../GiphyEmojiPicker'
import type { GiphyEmoji } from '../../utils/giphy'
import type { ViewProfileResponse } from '../../types'
import LocationPicker from './location/LocationPicker'
import WebsitePreview from './WebsitePreview'

const DISPLAY_NAME_REGEX = /^[\p{L}\p{M}\d ]+$/u

interface ProfileEditModalProps {
  profile: ViewProfileResponse
  onClose: () => void
  onSaved: (updated: ViewProfileResponse) => void
}

export default function ProfileEditModal({ profile, onClose, onSaved }: ProfileEditModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [bio, setBio] = useState(profile.bio)
  const [hometownProvince, setHometownProvince] = useState(profile.hometown_province)
  const [currentProvince, setCurrentProvince] = useState(profile.current_province)
  const [currentWard, setCurrentWard] = useState(profile.current_ward)
  const [work, setWork] = useState(profile.work)
  const [workOther, setWorkOther] = useState(profile.work_other)
  const [education, setEducation] = useState(profile.education)
  const [website, setWebsite] = useState(profile.website)
  const [dateOfBirth, setDateOfBirth] = useState(profile.date_of_birth ? profile.date_of_birth.split('T')[0] : '')
  const [isPrivateProfile, setIsPrivateProfile] = useState(profile.is_private_profile)
  const [isPrivatePosts, setIsPrivatePosts] = useState(profile.is_private_posts)
  const [allowStrangerFriend, setAllowStrangerFriend] = useState(profile.allow_stranger_friend_request)
  const [saving, setSaving] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [displayNameError, setDisplayNameError] = useState('')
  const [workError, setWorkError] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const bioRef = useRef<HTMLTextAreaElement>(null)
  const emojiBtnRef = useRef<HTMLButtonElement>(null)
  const bioSelRef = useRef<[number, number] | null>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const handleDetectLocation = () => {
    if (detecting) return
    if (!('geolocation' in navigator)) {
      toast({ type: 'error', title: t('profile.location.geoUnsupported') })
      return
    }
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const result = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
          if (!result.matched || !result.province) {
            toast({ type: 'warning', title: t('profile.location.detectNoMatch') })
            return
          }
          setCurrentProvince(result.province.id)
          setCurrentWard(result.ward?.id ?? '')
          toast({ type: 'success', title: t('profile.location.detectSuccess') })
        } catch {
          toast({ type: 'error', title: t('profile.location.detectError') })
        } finally {
          setDetecting(false)
        }
      },
      (err) => {
        setDetecting(false)
        toast({
          type: 'error',
          title: err.code === err.PERMISSION_DENIED
            ? t('profile.location.detectDenied')
            : t('profile.location.detectError'),
        })
      },
      { timeout: 10000, maximumAge: 60000 },
    )
  }

  const insertEmoji = (emoji: GiphyEmoji) => {
    const ch = emoji.url
    const sel = bioSelRef.current ?? [bio.length, bio.length]
    const start = Math.min(sel[0], sel[1])
    const end = Math.max(sel[0], sel[1])
    const next = bio.slice(0, start) + ch + bio.slice(end)
    if (next.length > 200) return
    setBio(next)
    requestAnimationFrame(() => {
      const ta = bioRef.current
      if (!ta) return
      const pos = Math.min(start + ch.length, ta.value.length)
      ta.focus()
      ta.setSelectionRange(pos, pos)
    })
  }

  const handleSave = async () => {
    if (saving) return

    const trimmed = displayName.trim()
    const runeCount = Array.from(trimmed).length
    if (!trimmed) {
      setDisplayNameError(t('register.displayNameRequired'))
      return
    }
    if (runeCount < 3) {
      setDisplayNameError(t('register.displayNameTooShort'))
      return
    }
    if (runeCount > 55) {
      setDisplayNameError(t('register.displayNameTooLong'))
      return
    }
    if (!DISPLAY_NAME_REGEX.test(trimmed)) {
      setDisplayNameError(t('register.displayNameInvalid'))
      return
    }
    setDisplayNameError('')

    if (work === 'other' && !workOther.trim()) {
      setWorkError(t('profile.workOtherRequired'))
      return
    }
    setWorkError('')

    setSaving(true)
    try {
      const input: Record<string, unknown> = {}
      if (displayName !== profile.display_name) input.display_name = displayName
      if (bio !== profile.bio) input.bio = bio
      if (hometownProvince !== profile.hometown_province) input.hometown_province = hometownProvince
      if (currentProvince !== profile.current_province) input.current_province = currentProvince
      if (currentWard !== profile.current_ward) input.current_ward = currentWard
      if (work !== profile.work) input.work = work
      if (workOther !== profile.work_other) input.work_other = workOther
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
              onChange={(e) => {
                setDisplayName(e.target.value)
                if (displayNameError) setDisplayNameError('')
              }}
              maxLength={50}
            />
            {displayNameError && <span className={styles.fieldError}>{displayNameError}</span>}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t('profile.editBio')}</label>
            <div className={styles.bioField}>
              <textarea
                ref={bioRef}
                className={`${styles.input} ${styles.textarea}`}
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value)
                  bioSelRef.current = [e.target.selectionStart, e.target.selectionEnd]
                }}
                maxLength={200}
              />
              <button
                ref={emojiBtnRef}
                type="button"
                className={`${styles.emojiBtn}${emojiOpen ? ` ${styles.emojiBtnActive}` : ''}`}
                onClick={() => setEmojiOpen((v) => !v)}
                aria-label={t('composer.emoji')}
              >
                <i className="bx bx-smile" />
              </button>
              {emojiOpen && (
                <GiphyEmojiPicker
                  placement="bottom"
                  onSelect={insertEmoji}
                  onClose={() => setEmojiOpen(false)}
                  ignoreRef={emojiBtnRef}
                />
              )}
            </div>
            <span className={styles.charCount}>
              {t('composer.charCount').replace('{count}', String(bio.length)).replace('{max}', '200')}
            </span>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t('profile.editHometown')}</label>
            <LocationPicker
              provinceOnly
              provinceId={hometownProvince}
              onProvinceChange={setHometownProvince}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t('profile.editCurrentLocation')}</label>
            <LocationPicker
              provinceId={currentProvince}
              wardId={currentWard}
              onProvinceChange={setCurrentProvince}
              onWardChange={setCurrentWard}
            />
            <button
              className={styles.detectBtn}
              onClick={handleDetectLocation}
              disabled={detecting}
              type="button"
            >
              <i className="bx bx-current-location" />
              <span>{detecting ? t('common.loading') : t('profile.location.detect')}</span>
            </button>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t('profile.aboutWork')}</label>
            <SearchSelect
              options={WORK_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) }))}
              value={work}
              onChange={(v) => {
                setWork(v)
                if (workError) setWorkError('')
              }}
              placeholder={t('profile.workPlaceholder')}
              searchPlaceholder={t('profile.workSearchPlaceholder')}
              emptyText={t('profile.noResults')}
            />
            {work === 'other' && (
              <input
                className={styles.input}
                value={workOther}
                onChange={(e) => {
                  setWorkOther(e.target.value)
                  if (workError) setWorkError('')
                }}
                maxLength={255}
                placeholder={t('profile.workOtherPlaceholder')}
              />
            )}
            {workError && <span className={styles.fieldError}>{workError}</span>}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t('profile.aboutEducation')}</label>
            <SearchSelect
              options={EDUCATION_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) }))}
              value={education}
              onChange={setEducation}
              placeholder={t('profile.educationPlaceholder')}
              searchPlaceholder={t('profile.educationSearchPlaceholder')}
              emptyText={t('profile.noResults')}
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
            <WebsitePreview
              url={website}
              labels={{
                checking: t('profile.website.checking'),
                online: t('profile.website.online'),
                offline: t('profile.website.offline'),
                openLink: t('profile.website.openLink'),
              }}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t('profile.aboutBirthday')}</label>
            <DatePicker
              value={dateOfBirth}
              onChange={setDateOfBirth}
              placeholder={t('profile.birthday.placeholder')}
              todayLabel={t('profile.birthday.today')}
              monthPlaceholder={t('profile.birthday.month')}
              yearPlaceholder={t('profile.birthday.year')}
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