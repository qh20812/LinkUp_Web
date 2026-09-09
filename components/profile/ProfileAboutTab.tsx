'use client'

import styles from './ProfileAboutTab.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import type { ViewProfileResponse } from '../../types'

interface ProfileAboutTabProps {
  profile: ViewProfileResponse
}

function formatJoinDate(dateStr: string, t: (key: string) => string): string {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  return t('profile.joinedDate').replace('{month}', String(month)).replace('{year}', String(year))
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ProfileAboutTab({ profile }: ProfileAboutTabProps) {
  const { t } = useTranslation()

  const infoItems = [
    {
      icon: 'bx-briefcase',
      label: t('profile.aboutWork'),
      value: profile.work,
    },
    {
      icon: 'bx-map',
      label: t('profile.aboutLocation'),
      value: profile.location,
    },
    {
      icon: 'bx-spreadsheet',
      label: t('profile.aboutEducation'),
      value: profile.education,
    },
    {
      icon: 'bx-link',
      label: t('profile.aboutWebsite'),
      value: profile.website,
      isLink: true,
    },
    {
      icon: 'bx-calendar',
      label: t('profile.aboutBirthday'),
      value: profile.date_of_birth ? formatDate(profile.date_of_birth) : undefined,
    },
    {
      icon: 'bx-calendar-check',
      label: t('profile.aboutJoined'),
      value: profile.created_at ? formatJoinDate(profile.created_at, t) : undefined,
    },
  ]

  const hasInfo = infoItems.some((item) => item.value)

  if (!hasInfo && !profile.bio) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}><i className="bx bx-info-circle" /></span>
        <p className={styles.emptyText}>{t('profile.aboutNoInfo')}</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {profile.bio && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('profile.aboutBio')}</h4>
          <p className={styles.bioText}>{profile.bio}</p>
        </div>
      )}

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>{t('profile.aboutDetails')}</h4>
        <div className={styles.infoList}>
          {infoItems.map((item) => {
            if (!item.value) return null
            return (
              <div key={item.label} className={styles.infoItem}>
                <i className={`bx ${item.icon}`} />
                <div className={styles.infoContent}>
                  <span className={styles.infoLabel}>{item.label}</span>
                  {item.isLink ? (
                    <a
                      href={item.value!.startsWith('http') ? item.value! : `https://${item.value}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.infoLink}
                    >
                      {item.value}
                    </a>
                  ) : (
                    <span className={styles.infoValue}>{item.value}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
