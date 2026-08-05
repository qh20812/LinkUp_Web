'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import { useTranslation } from '../../../hooks/useTranslation'
import ChangePasswordForm from './ChangePasswordForm'
import styles from './Settings.module.css'

type TabKey = 'password'

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'password', labelKey: 'settings.tabChangePassword' },
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
      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {activeTab === 'password' && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>{t('nav.changePassword')}</h2>
          <ChangePasswordForm />
        </div>
      )}
    </div>
  )
}
