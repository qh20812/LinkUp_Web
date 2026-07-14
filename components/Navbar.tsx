'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from '../hooks/useTranslation'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { t, language, setLanguage } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
      if (saved === 'light' || saved === 'dark') return saved
    }
    return 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <Link href="/" className={styles.brand}>
            <Image src="/S-Logo-Rmbg.png" alt="LinkUp" width={500} height={500} className={styles.brandImg} priority />
            <span className={styles.brandText}>LinkUp</span>
          </Link>

          <div className={`${styles.links}${menuOpen ? ` ${styles.linksOpen}` : ''}`}>
            <Link href="/about" className={styles.link}>
              {t('nav.about')}
            </Link>
            <Link href="/policies" className={styles.link}>
              {t('nav.policies')}
            </Link>

            <div className={styles.mobileControls}>
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
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.desktopControls}>
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
          </div>

          <Link href="/login" className={styles.adminBtn}>
            <i className="bx bx-user" />
            {t('nav.adminLogin')}
          </Link>

          <button
            className={styles.menuToggle}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <i className={`bx ${menuOpen ? 'bx-x' : 'bx-menu'}`} />
          </button>
        </div>
      </div>
    </nav>
  )
}
