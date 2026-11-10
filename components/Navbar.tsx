'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from '../hooks/useTranslation'
import NavControls from './NavControls'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  // The navbar is the header of the hero window at rest (no shadow) and
  // gains one only once it sticks, so the composed block stays seamless.
  const [stuck, setStuck] = useState(false)
  const rafRef = useRef(0)

  useEffect(() => {
    const update = () => {
      rafRef.current = 0
      setStuck(window.scrollY > 8)
    }
    const onScroll = () => {
      if (rafRef.current) return
      rafRef.current = window.requestAnimationFrame(update)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current)
        // Strict Mode re-runs this effect: leaving the id set would make the
        // guard below swallow every later scroll event.
        rafRef.current = 0
      }
    }
  }, [])

  return (
    <nav className={`${styles.nav}${stuck ? ` ${styles.navStuck}` : ''}`}>
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
