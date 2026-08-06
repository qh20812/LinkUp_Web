'use client'

import React, { useEffect, useState } from 'react'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { useTheme } from '../../../hooks/useTheme'
import { getAppearance, updateAppearance } from '../../../api/settings'
import type { AppearanceSettingsResponse, LanguageCode, ThemeMode } from '../../../types'
import styles from './Settings.module.css'

export default function AppearanceForm() {
  const { t, setLanguage } = useTranslation()
  const { setTheme: applyTheme } = useTheme()
  const { toast } = useToast()

  const [initial, setInitial] = useState<AppearanceSettingsResponse | null>(null)
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [language, setLanguagePref] = useState<LanguageCode>('vi')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await getAppearance()
        if (cancelled) return
        setInitial(res)
        setTheme(res.theme)
        setLanguagePref(res.language)
        applyTheme(res.theme)
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
  }, [t, applyTheme])

  const dirty = initial !== null && (theme !== initial.theme || language !== initial.language)

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode)
    applyTheme(mode)
  }

  const handleLanguageChange = (lang: LanguageCode) => {
    setLanguagePref(lang)
    setLanguage(lang)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!initial || !dirty) return

    setSaving(true)
    try {
      const input: Record<string, string> = {}
      if (theme !== initial.theme) input.theme = theme
      if (language !== initial.language) input.language = language
      const res = await updateAppearance(input)
      setInitial(res)
      setTheme(res.theme)
      setLanguagePref(res.language)
      toast({ type: 'success', title: t('userSettings.appearanceSaved') })
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
          <span className={styles.settingLabel}>{t('userSettings.themeLabel')}</span>
          <span className={styles.settingHint}>{t('userSettings.themeHint')}</span>
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={(e) => handleThemeChange(e.target.checked ? 'dark' : 'light')}
          />
          <span className={styles.toggleTrack}>
            <span className={styles.toggleThumb} />
          </span>
        </label>
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <span className={styles.settingLabel}>{t('userSettings.languageLabel')}</span>
          <span className={styles.settingHint}>{t('userSettings.languageHint')}</span>
        </div>
        <div className={styles.langGroup} suppressHydrationWarning>
          <button
            type="button"
            className={`${styles.langBtn}${language === 'vi' ? ` ${styles.langBtnActive}` : ''}`}
            onClick={() => handleLanguageChange('vi')}
            suppressHydrationWarning
          >
            VI
          </button>
          <button
            type="button"
            className={`${styles.langBtn}${language === 'en' ? ` ${styles.langBtnActive}` : ''}`}
            onClick={() => handleLanguageChange('en')}
            suppressHydrationWarning
          >
            EN
          </button>
        </div>
      </div>

      <div className={styles.footer}>
        <button type="submit" className={styles.btnSave} disabled={saving || !dirty}>
          {saving ? t('common.loading') : t('userSettings.saveBtn')}
        </button>
      </div>
    </form>
  )
}
