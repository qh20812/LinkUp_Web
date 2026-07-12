'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import styles from './AdminNavbar.module.css'

interface AdminNavbarProps {
  onMenuToggle: () => void
}

export default function AdminNavbar({ onMenuToggle }: AdminNavbarProps) {
  const { t, language, setLanguage } = useTranslation()
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
      if (saved === 'light' || saved === 'dark') return saved
    }
    return 'light'
  })
  const [searchOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
  }

  return (
    <nav className={styles.nav}>
      <i className={`bx bx-menu ${styles.menuBtn}`} onClick={onMenuToggle} />

      <form className={`${styles.searchForm}${searchOpen ? ` ${styles.show}` : ''}`} onSubmit={(e) => e.preventDefault()}>
        <div className={styles.formInput}>
          <input type="search" placeholder={t('common.search')} readOnly />
          <button className={styles.searchBtn} type="submit">
            <i className="bx bx-search" />
          </button>
        </div>
      </form>

      <div className={styles.toggleGroup} suppressHydrationWarning>
        <button
          className={`${styles.toggleBtn}${language === 'vi' ? ` ${styles.toggleActive}` : ''}`}
          onClick={() => setLanguage('vi')}
          suppressHydrationWarning
        >
          VI
        </button>
        <button
          className={`${styles.toggleBtn}${language === 'en' ? ` ${styles.toggleActive}` : ''}`}
          onClick={() => setLanguage('en')}
          suppressHydrationWarning
        >
          EN
        </button>
      </div>

      <button className={styles.iconBtn} onClick={toggleTheme} aria-label="Toggle theme">
        <i className={`bx ${theme === 'light' ? 'bx-moon' : 'bx-sun'}`} />
      </button>

      <button className={styles.notif} aria-label="Notifications">
        <i className="bx bx-bell" />
      </button>

      <button className={styles.profile} aria-label="Profile">
        <img src="/S-Logo.png" alt="Profile" />
      </button>
    </nav>
  )
}
