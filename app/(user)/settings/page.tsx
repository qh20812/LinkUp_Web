'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import { useTranslation } from '../../../hooks/useTranslation'
import ChangePasswordForm from './ChangePasswordForm'
import PrivacyForm from './PrivacyForm'
import StorageInfo from './StorageInfo'
import AppearanceForm from './AppearanceForm'
import SessionsManager from './SessionsManager'
import DeactivateAccount from './DeactivateAccount'
import NotificationsForm from './NotificationsForm'
import styles from './Settings.module.css'

type TabKey = 'password' | 'privacy' | 'storage' | 'appearance' | 'sessions' | 'deactivate' | 'notifications'

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'password', labelKey: 'settings.tabChangePassword' },
  { key: 'privacy', labelKey: 'userSettings.tabPrivacy' },
  { key: 'storage', labelKey: 'userSettings.tabStorage' },
  { key: 'appearance', labelKey: 'userSettings.tabAppearance' },
  { key: 'sessions', labelKey: 'userSettings.tabSessions' },
  { key: 'notifications', labelKey: 'userSettings.tabNotifications' },
  { key: 'deactivate', labelKey: 'userSettings.tabDeactivate' },
]

const ALLOWED_TABS: TabKey[] = ['password', 'privacy', 'storage', 'appearance', 'sessions', 'notifications', 'deactivate']

export default function SettingsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, initializing } = useAuth()
  const activeTab = (ALLOWED_TABS.includes(searchParams.get('tab') as TabKey) ? searchParams.get('tab') : 'password') as TabKey

  if (initializing) {
    return <div className={styles.page} />
  }

  if (!isAuthenticated) {
    router.push('/login')
    return <div className={styles.page} />
  }

  return (
    <div className={styles.page}>
      <div className={styles.settings}>
        <nav className={styles.tabs}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
              onClick={() => router.replace(`/settings?tab=${tab.key}`)}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </nav>

        <div className={styles.panel}>
          {activeTab === 'password' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>{t('nav.changePassword')}</h2>
              <ChangePasswordForm />
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>{t('userSettings.tabPrivacy')}</h2>
              <PrivacyForm />
            </div>
          )}

          {activeTab === 'storage' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>{t('userSettings.tabStorage')}</h2>
              <StorageInfo />
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>{t('userSettings.tabAppearance')}</h2>
              <AppearanceForm />
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>{t('userSettings.tabSessions')}</h2>
              <SessionsManager />
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>{t('userSettings.tabNotifications')}</h2>
              <NotificationsForm />
            </div>
          )}

          {activeTab === 'deactivate' && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>{t('userSettings.tabDeactivate')}</h2>
              <DeactivateAccount />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
