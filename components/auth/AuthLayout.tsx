'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from '../../hooks/useTranslation'
import { useTheme } from '../../hooks/useTheme'
import styles from './AuthLayout.module.css'

export default function AuthLayout({
  children,
  showFooter = true,
}: {
  children: React.ReactNode
  showFooter?: boolean
}) {
  const { language, setLanguage } = useTranslation()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <Image
            src="/S-Logo-Rmbg.png"
            alt="LinkUp"
            width={32}
            height={32}
            className={styles.brandImg}
          />
          <span className={styles.brandText}>LinkUp</span>
        </Link>

        <div className={styles.controls}>
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
      </header>

      <main className={styles.main}>{children}</main>

      {showFooter && <footer className={styles.footer}>© 2026 LinkUp</footer>}
    </div>
  )
}