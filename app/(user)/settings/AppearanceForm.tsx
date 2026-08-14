'use client'

import React, { useState } from 'react'
import { useToast } from '../../../contexts/ToastContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { useTheme } from '../../../hooks/useTheme'
import { updateAppearance } from '../../../api/settings'
import type { LanguageCode, ThemeMode } from '../../../types'
import styles from './Settings.module.css'

export default function AppearanceForm() {
  const { t, language: ctxLang, setLanguage } = useTranslation()
  const { theme: ctxTheme, setTheme: applyTheme } = useTheme()
  const { toast } = useToast()

  const [theme, setTheme] = useState<ThemeMode>(ctxTheme)
  const [language, setLanguagePref] = useState<LanguageCode>(ctxLang)

  const handleThemeChange = async (mode: ThemeMode) => {
    setTheme(mode)
    applyTheme(mode)
    try {
      await updateAppearance({ theme: mode })
    } catch {
      toast({ type: 'error', title: t('userSettings.saveError') })
    }
  }

  const handleLanguageChange = async (lang: LanguageCode) => {
    setLanguagePref(lang)
    setLanguage(lang)
    try {
      await updateAppearance({ language: lang })
    } catch {
      toast({ type: 'error', title: t('userSettings.saveError') })
    }
  }

  return (
    <div className={styles.form}>
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
    </div>
  )
}
