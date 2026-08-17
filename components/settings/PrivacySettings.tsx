'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import { getPresenceSettings, updatePresenceSettings } from '../../api/presence'
import { getPrivacy, updatePrivacy } from '../../api/settings'
import type { PresenceSettingsResponse, LastSeenVisibility, PrivacySettingsResponse } from '../../types'
import styles from './PrivacySettings.module.css'

interface AllSettings {
  presence: PresenceSettingsResponse | null
  privacy: PrivacySettingsResponse | null
}

export default function PrivacySettings() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [settings, setSettings] = useState<AllSettings>({ presence: null, privacy: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([getPresenceSettings(), getPrivacy()])
      .then(([presence, privacy]) => {
        if (!cancelled) setSettings({ presence, privacy })
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const updatePresence = async (patch: Partial<PresenceSettingsResponse>) => {
    if (!settings.presence || saving) return
    const old = settings.presence
    const next = { ...old, ...patch }
    setSettings({ ...settings, presence: next })
    setSaving(true)
    try {
      const res = await updatePresenceSettings(patch)
      setSettings({ ...settings, presence: res })
      toast({ type: 'success', title: t('userSettings.savedSuccess') })
    } catch {
      setSettings({ ...settings, presence: old })
      toast({ type: 'error', title: t('userSettings.saveError') })
    } finally {
      setSaving(false)
    }
  }

  const updatePrivacySetting = async (patch: Partial<PrivacySettingsResponse>) => {
    if (!settings.privacy || saving) return
    const old = settings.privacy
    const next = { ...old, ...patch }
    setSettings({ ...settings, privacy: next })
    setSaving(true)
    try {
      const res = await updatePrivacy(patch as Record<string, boolean>)
      setSettings({ ...settings, privacy: res })
      toast({ type: 'success', title: t('userSettings.savedSuccess') })
    } catch {
      setSettings({ ...settings, privacy: old })
      toast({ type: 'error', title: t('userSettings.saveError') })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.section}>
        <div className={styles.loading}>{t('common.loading')}</div>
      </div>
    )
  }

  const { presence, privacy } = settings
  if (!presence || !privacy) return null

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{t('presence.activityStatus')}</h3>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <span className={styles.settingLabel}>{t('presence.activityStatusEnabled')}</span>
          <span className={styles.settingHint}>{t('presence.activityStatusHint')}</span>
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={presence.activity_status_enabled}
            onChange={() => updatePresence({ activity_status_enabled: !presence.activity_status_enabled })}
            disabled={saving}
          />
          <span className={styles.toggleTrack}>
            <span className={styles.toggleThumb} />
          </span>
        </label>
      </div>

      {presence.activity_status_enabled && (
        <>
          <h3 className={styles.sectionTitle}>{t('presence.lastSeenVisibility')}</h3>

          <div className={styles.visibilityOptions}>
            {(['all_friends', 'dm_only', 'nobody'] as LastSeenVisibility[]).map((value) => (
              <label key={value} className={styles.radioOption}>
                <input
                  type="radio"
                  name="lastSeenVisibility"
                  value={value}
                  checked={presence.last_seen_visibility === value}
                  onChange={() => updatePresence({ last_seen_visibility: value })}
                  disabled={saving}
                />
                <span className={styles.radioLabel}>
                  {t(`presence.lastSeenVisibility${value.charAt(0).toUpperCase() + value.slice(1).replace('_', '')}`)}
                </span>
              </label>
            ))}
          </div>
        </>
      )}

      <div className={styles.divider} />

      <h3 className={styles.sectionTitle}>{t('userSettings.tabPrivacy')}</h3>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <span className={styles.settingLabel}>{t('userSettings.discoverableLabel')}</span>
          <span className={styles.settingHint}>{t('userSettings.discoverableHint')}</span>
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={privacy.discoverable_in_search}
            onChange={() => updatePrivacySetting({ discoverable_in_search: !privacy.discoverable_in_search })}
            disabled={saving}
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
            checked={privacy.allow_stranger_messages}
            onChange={() => updatePrivacySetting({ allow_stranger_messages: !privacy.allow_stranger_messages })}
            disabled={saving}
          />
          <span className={styles.toggleTrack}>
            <span className={styles.toggleThumb} />
          </span>
        </label>
      </div>
    </div>
  )
}
