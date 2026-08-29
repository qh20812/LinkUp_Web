'use client'

import React, { useEffect, useState } from 'react'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { useNotification } from '../../../contexts/NotificationContext'
import { getPreferences } from '../../../api/notifications'
import type { NotificationPreferences } from '../../../types'
import styles from './Settings.module.css'

type PrefKey = keyof NotificationPreferences

const PREF_ROWS: { key: PrefKey; labelKey: string }[] = [
  { key: 'like_enabled', labelKey: 'notifications.prefLike' },
  { key: 'comment_enabled', labelKey: 'notifications.prefComment' },
  { key: 'follow_enabled', labelKey: 'notifications.prefFollow' },
  { key: 'message_enabled', labelKey: 'notifications.prefMessage' },
  { key: 'friend_request_enabled', labelKey: 'notifications.prefFriendRequest' },
  { key: 'community_enabled', labelKey: 'notifications.prefCommunity' },
  { key: 'voice_call_enabled', labelKey: 'notifications.prefVoiceCall' },
]

const DEFAULT_PREFS: NotificationPreferences = {
  like_enabled: true,
  comment_enabled: true,
  follow_enabled: true,
  message_enabled: true,
  friend_request_enabled: true,
  community_enabled: true,
  voice_call_enabled: true,
}

export default function NotificationsForm() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { updatePreferences } = useNotification()

  const [values, setValues] = useState<NotificationPreferences>(DEFAULT_PREFS)
  const [initial, setInitial] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await getPreferences()
        if (cancelled) return
        const data = res.data ?? DEFAULT_PREFS
        setValues(data)
        setInitial(data)
      } catch {
        if (cancelled) return
        /* keep defaults */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const dirty =
    initial !== null &&
    PREF_ROWS.some((row) => values[row.key] !== initial[row.key])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!initial || !dirty) return

    setSaving(true)
    try {
      const input: Partial<NotificationPreferences> = {}
      for (const row of PREF_ROWS) {
        if (values[row.key] !== initial[row.key]) {
          input[row.key] = values[row.key]
        }
      }
      await updatePreferences(input)
      setInitial({ ...values })
      toast({ type: 'success', title: t('notifications.prefSaved') })
    } catch (err) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('notifications.prefSaveError'),
      })
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

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {PREF_ROWS.map((row) => (
        <div key={row.key} className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>{t(row.labelKey)}</span>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={values[row.key]}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [row.key]: e.target.checked }))
              }
            />
            <span className={styles.toggleTrack}>
              <span className={styles.toggleThumb} />
            </span>
          </label>
        </div>
      ))}

      <div className={styles.footer}>
        <button type="submit" className={styles.btnSave} disabled={saving || !dirty}>
          {saving ? t('common.loading') : t('userSettings.saveBtn')}
        </button>
      </div>
    </form>
  )
}