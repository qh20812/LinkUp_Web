'use client'

import styles from './ProfileCompletion.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import type { ViewProfileResponse } from '../../types'

interface ProfileCompletionProps {
  profile: ViewProfileResponse
  onEdit: () => void
}

export default function ProfileCompletion({ profile, onEdit }: ProfileCompletionProps) {
  const { t } = useTranslation()

  const checks: Array<{ done: boolean; label: string }> = [
    { done: !!profile.avatar_uri, label: t('profile.changeAvatar') },
    { done: !!profile.cover_uri, label: t('profile.changeCover') },
    { done: !!profile.bio, label: t('profile.aboutBio') },
    { done: !!profile.work, label: t('profile.aboutWork') },
    { done: !!profile.education, label: t('profile.aboutEducation') },
    { done: !!profile.current_province, label: t('profile.aboutCurrentLocation') },
    { done: !!profile.website, label: t('profile.aboutWebsite') },
    { done: !!profile.date_of_birth, label: t('profile.aboutBirthday') },
  ]

  const done = checks.filter((c) => c.done).length
  const percent = Math.round((done / checks.length) * 100)
  const firstMissing = checks.find((c) => !c.done)

  if (percent >= 100) {
    return (
      <section className={styles.card} aria-label={t('profile.profileStrength')}>
        <div className={styles.completeRow}>
          <span className={styles.completeIcon}><i className="bx bx-check-circle" aria-hidden /></span>
          <p className={styles.completeText}>{t('profile.profileComplete')}</p>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.card} aria-label={t('profile.profileStrength')}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('profile.profileStrength')}</h3>
        <span className={styles.percent}>{percent}%</span>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
      {firstMissing && (
        <button type="button" className={styles.ctaBtn} onClick={onEdit}>
          {t('profile.completeNow')}: {firstMissing.label.toLowerCase()}
        </button>
      )}
    </section>
  )
}
