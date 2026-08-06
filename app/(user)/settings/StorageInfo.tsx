'use client'

import React, { useEffect, useState } from 'react'
import { useTranslation } from '../../../hooks/useTranslation'
import { getStorage } from '../../../api/settings'
import type { UserStorageInfo } from '../../../types'
import styles from './Settings.module.css'

function formatBytes(bytes: number): { value: string; unit: string } {
  const abs = Math.abs(bytes)
  if (abs >= 1024 * 1024 * 1024) {
    return { value: (bytes / (1024 * 1024 * 1024)).toFixed(1), unit: 'GB' }
  }
  if (abs >= 1024 * 1024) {
    return { value: (bytes / (1024 * 1024)).toFixed(1), unit: 'MB' }
  }
  return { value: (bytes / 1024).toFixed(1), unit: 'KB' }
}

export default function StorageInfo() {
  const { t } = useTranslation()

  const [storage, setStorage] = useState<UserStorageInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await getStorage()
        if (!cancelled) setStorage(res)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('userSettings.loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [t])

  if (loading) {
    return (
      <div>
        <div className={styles.skeleton} style={{ width: '40%' }} />
        <div className={styles.skeleton} style={{ width: '100%' }} />
      </div>
    )
  }

  if (error || !storage) {
    return (
      <div className={styles.empty}>
        <i className="bx bx-error-circle" />
        <p>{error ?? t('userSettings.loadError')}</p>
      </div>
    )
  }

  const quota = formatBytes(storage.quota_bytes)
  const used = formatBytes(storage.used_bytes)
  const avail = formatBytes(storage.avail_bytes)
  const percent = storage.quota_bytes > 0 ? Math.min(100, (storage.used_bytes / storage.quota_bytes) * 100) : 0

  return (
    <div>
      <div className={styles.storageHeader}>
        <span className={styles.storageValue}>
          {used.value}
          <span className={styles.storageUnit}>{used.unit}</span>
        </span>
        <span className={styles.storageUnit}>
          {t('userSettings.quotaLabel')}: {quota.value} {quota.unit}
        </span>
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${percent}%` }} />
      </div>

      <div className={styles.statGrid}>
        <div className={styles.stat}>
          <div className={styles.statValue}>
            {used.value} {used.unit}
          </div>
          <div className={styles.statLabel}>{t('userSettings.usedLabel')}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>
            {avail.value} {avail.unit}
          </div>
          <div className={styles.statLabel}>{t('userSettings.availLabel')}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{Math.round(percent)}%</div>
          <div className={styles.statLabel}>{t('userSettings.quotaLabel')}</div>
        </div>
      </div>
    </div>
  )
}
