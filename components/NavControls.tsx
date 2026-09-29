'use client'

import React from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { useTheme } from '../hooks/useTheme'
import styles from './NavControls.module.css'

export default function NavControls() {
  const { language, setLanguage } = useTranslation()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className={styles.group} suppressHydrationWarning>
      <div className={styles.track} role="group" aria-label="Language">
        <button
          type="button"
          className={`${styles.seg}${language === 'vi' ? ` ${styles.segActive}` : ''}`}
          aria-pressed={language === 'vi'}
          onClick={() => setLanguage('vi')}
          suppressHydrationWarning
        >
          VI
        </button>
        <button
          type="button"
          className={`${styles.seg}${language === 'en' ? ` ${styles.segActive}` : ''}`}
          aria-pressed={language === 'en'}
          onClick={() => setLanguage('en')}
          suppressHydrationWarning
        >
          EN
        </button>
      </div>

      <button
        type="button"
        className={styles.iconBtn}
        onClick={toggleTheme}
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        <i className={`bx ${theme === 'light' ? 'bx-moon' : 'bx-sun'}`} />
      </button>
    </div>
  )
}
