'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from '../hooks/useTranslation'
import NavControls from './NavControls'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <Link href="/" className={styles.brand}>
            <Image src="/S-Logo-Rmbg.png" alt="LinkUp" width={500} height={500} className={styles.brandImg} priority />
            <span className={styles.brandText}>LinkUp</span>
          </Link>

          <div className={`${styles.links}${menuOpen ? ` ${styles.linksOpen}` : ''}`}>
            <div className={styles.mobileControls}>
              <NavControls />
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.desktopControls}>
            <NavControls />
          </div>

          <Link href="/login" className={styles.loginBtn}>
            <i className="bx bx-user" />
            {t('nav.login')}
          </Link>

          <button
            className={styles.menuToggle}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={t('nav.toggleMenu')}
            data-tooltip={t('nav.toggleMenu')}
          >
            <i className={`bx ${menuOpen ? 'bx-x' : 'bx-menu'}`} />
          </button>
        </div>
      </div>
    </nav>
  )
}
