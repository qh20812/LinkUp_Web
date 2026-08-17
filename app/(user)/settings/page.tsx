'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import { useTranslation } from '../../../hooks/useTranslation'
import ChangePasswordForm from './ChangePasswordForm'
import PrivacySettings from '../../../components/settings/PrivacySettings'
import StorageInfo from './StorageInfo'
import AppearanceForm from './AppearanceForm'
import SessionsManager from './SessionsManager'
import DeactivateAccount from './DeactivateAccount'
import styles from './Settings.module.css'

type TabKey = 'password' | 'privacy' | 'storage' | 'appearance' | 'sessions' | 'deactivate'

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'password', labelKey: 'settings.tabChangePassword' },
  { key: 'privacy', labelKey: 'userSettings.tabPrivacy' },
  { key: 'storage', labelKey: 'userSettings.tabStorage' },
  { key: 'appearance', labelKey: 'userSettings.tabAppearance' },
  { key: 'sessions', labelKey: 'userSettings.tabSessions' },
  { key: 'deactivate', labelKey: 'userSettings.tabDeactivate' },
]

export default function SettingsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isAuthenticated, initializing } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('password')

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
              onClick={() => setActiveTab(tab.key)}
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
              <PrivacySettings />
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
