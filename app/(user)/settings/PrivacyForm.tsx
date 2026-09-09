'use client'

import React, { useEffect, useState } from 'react'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { getPrivacy, updatePrivacy } from '../../../api/settings'
import type { PrivacySettingsResponse } from '../../../types'
import styles from './Settings.module.css'

export default function PrivacyForm() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [initial, setInitial] = useState<PrivacySettingsResponse | null>(null)
  const [discoverableInSearch, setDiscoverableInSearch] = useState(false)
  const [allowStrangerMessages, setAllowStrangerMessages] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await getPrivacy()
        if (cancelled) return
        setInitial(res)
        setDiscoverableInSearch(res.discoverable_in_search)
        setAllowStrangerMessages(res.allow_stranger_messages)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : t('userSettings.loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [t])

  const dirty =
    initial !== null &&
    (discoverableInSearch !== initial.discoverable_in_search ||
      allowStrangerMessages !== initial.allow_stranger_messages)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!initial || !dirty) return

    setSaving(true)
    try {
      const input: Record<string, boolean> = {}
      if (discoverableInSearch !== initial.discoverable_in_search) {
        input.discoverable_in_search = discoverableInSearch
      }
      if (allowStrangerMessages !== initial.allow_stranger_messages) {
        input.allow_stranger_messages = allowStrangerMessages
      }
      const res = await updatePrivacy(input)
      setInitial(res)
      setDiscoverableInSearch(res.discoverable_in_search)
      setAllowStrangerMessages(res.allow_stranger_messages)
      toast({ type: 'success', title: t('userSettings.savedSuccess') })
    } catch (err) {
      toast({ type: 'error', title: err instanceof Error ? err.message : t('userSettings.saveError') })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div className={styles.skeleton} style={{ width: '70%' }} />
        <div className={styles.skeleton} style={{ width: '85%' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.empty}>
        <i className="bx bx-error-circle" />
        <p>{error}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <span className={styles.settingLabel}>{t('userSettings.discoverableLabel')}</span>
          <span className={styles.settingHint}>{t('userSettings.discoverableHint')}</span>
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={discoverableInSearch}
            onChange={(e) => setDiscoverableInSearch(e.target.checked)}
          />
          <span className={styles.toggleTrack}>
            <span className={styles.toggleThumb} />
          </span>
        </label>
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <span className={styles.settingLabel}>{t('userSettings.allowStrangerLabel')}</span>
          <span className={styles.settingHint}>{t('userSettings.allowStrangerHint')}</span>
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={allowStrangerMessages}
            onChange={(e) => setAllowStrangerMessages(e.target.checked)}
          />
          <span className={styles.toggleTrack}>
            <span className={styles.toggleThumb} />
          </span>
        </label>
      </div>

      <div className={styles.footer}>
        <button type="submit" className={styles.btnSave} disabled={saving || !dirty}>
          {saving ? t('common.loading') : t('userSettings.saveBtn')}
        </button>
      </div>
    </form>
  )
}
