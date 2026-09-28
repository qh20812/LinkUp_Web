'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useTranslation } from '../hooks/useTranslation'
import { useTheme } from '../hooks/useTheme'
import { logout } from '../api/auth'
import { getAdminProfile } from '../api/admin'
import { clearSession } from '../api/api'
import { clearSWRCache } from '../api/swr'
import styles from './PartnerNavbar.module.css'
import { useNotification } from '../contexts/NotificationContext'

interface PartnerNavbarProps {
  onMenuToggle: () => void
}

export default function PartnerNavbar({ onMenuToggle }: PartnerNavbarProps) {
  const { t, language, setLanguage } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  const [cachedProfile, setCachedProfile] = useState<Record<string, string>>({})

  const { data: profile } = useSWR('/profile', getAdminProfile, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  useEffect(() => {
    if (profile?.avatar_uri) {
      const data = {
        avatar_uri: profile.avatar_uri,
        display_name: profile.display_name,
      }
      localStorage.setItem('admin_profile', JSON.stringify(data))
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCachedProfile(data)
    }
  }, [profile?.avatar_uri, profile?.display_name])

  const [tokenEmail, setTokenEmail] = useState('')

  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTokenEmail(payload.email || '')
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setDropdownOpen(false)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pathname])

  useEffect(() => {
    if (!dropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [dropdownOpen])

  const router = useRouter()
  const { closeWs } = useNotification()

  const handleLogout = async () => {
    closeWs()
    await logout().catch(() => {})
    clearSession()
    clearSWRCache()
    router.push('/login')
  }

  return (
    <nav className={styles.nav}>
      <i className={`bx bx-menu ${styles.menuBtn}`} onClick={onMenuToggle} />

      <div className={styles.toggleGroup} suppressHydrationWarning>
        <button
          className={`${styles.toggleBtn}${
            language === 'vi' ? ` ${styles.toggleActive}` : ''
          }`}
          onClick={() => setLanguage('vi')}
          suppressHydrationWarning>
          VI
        </button>
        <button
          className={`${styles.toggleBtn}${
            language === 'en' ? ` ${styles.toggleActive}` : ''
          }`}
          onClick={() => setLanguage('en')}
          suppressHydrationWarning>
          EN
        </button>
      </div>

      <button
        className={styles.iconBtn}
        onClick={toggleTheme}
        aria-label="Toggle theme">
        <i className={`bx ${theme === 'light' ? 'bx-moon' : 'bx-sun'}`} />
      </button>

      <div className={styles.profileWrap} ref={dropdownRef}>
        <button
          className={styles.profile}
          aria-label="Profile"
          onClick={() => setDropdownOpen(!dropdownOpen)}>
          <Image
            src={profile?.avatar_uri || cachedProfile.avatar_uri || '/S-Logo.png'}
            alt="Profile"
            width={36}
            height={36}
            priority
            unoptimized
          />
          <div className={styles.userInfo}>
            <span className={styles.userName}>{profile?.display_name || cachedProfile.display_name || 'Partner'}</span>
            <span className={styles.userEmail}>{tokenEmail}</span>
          </div>
          <i className={`bx bx-chevron-down ${styles.profileChevron}`} />
        </button>

        {dropdownOpen && (
          <div className={styles.dropdown}>
            <Link href="/profile" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
              <i className="bx bx-user-circle" />
              <span>{t('nav.profile')}</span>
            </Link>
            <div className={styles.dropdownDivider} />
            <Link href="/" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
              <i className="bx bxs-home" />
              <span>{t('sidebar.home')}</span>
            </Link>
            <div className={styles.dropdownDivider} />
            <button className={`${styles.dropdownItem} ${styles.dropdownDanger}`} onClick={handleLogout}>
              <i className="bx bx-log-out-circle" />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
