'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import ExternalImage from './ExternalImage'
import styles from './LeftSidebar.module.css'
  import { request, clearSession } from '../api/api'
  import { logout } from '../api/auth'
  import { clearSWRCache } from '../api/swr'
import { useTranslation } from '../hooks/useTranslation'
import { useAuth } from '../hooks/useAuth'
import { useNotification } from '../contexts/NotificationContext'
import { usePresence } from '../contexts/PresenceContext'
import type { ViewProfileResponse } from '../types'

const NAV_ITEMS = [
  { key: 'home', href: '/', icon: 'bxs-home' },
  { key: 'notifications', href: '/notifications', icon: 'bxs-bell' },
  { key: 'messages', href: '/messages', icon: 'bxs-message-dots' },
  { key: 'friends', href: '/friends', icon: 'bxs-group' },
  { key: 'communities', href: '/communities', icon: 'bxs-chat' },
  { key: 'saved', href: '/saved', icon: 'bxs-bookmark' },
  { key: 'profile', href: '/profile', icon: 'bxs-user' },
]

function useProfile() {
  const { data, error } = useSWR<ViewProfileResponse>(
    '/profile',
    (key: string) => request<ViewProfileResponse>(key),
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  )
  return { profile: data, loading: !data && !error }
}

export default function LeftSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()
  const { user } = useAuth()
  const { profile } = useProfile()
  const { unreadCount, closeWs } = useNotification()
  const { resetPresence } = usePresence()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [dropdownOpen])

  const handleLogout = async () => {
    closeWs()
    resetPresence()
    await logout().catch(() => {})
    clearSession()
    clearSWRCache()
    router.push('/login')
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    if (href === '/profile') return pathname === '/profile'
    return pathname.startsWith(href)
  }

  return (
    <aside className={`${styles.sidebar}${collapsed ? ` ${styles.collapsed}` : ''}`}>
      <div className={styles.logo}>
        <Image src="/S-Logo-Rmbg.png" alt="LinkUp" width={500} height={500} className={styles.logoImg} priority />
        <span>LinkUp</span>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
          >
            <i className={`bx ${item.icon}`} />
            <span>{t(`sidebar.${item.key}`)}</span>
            {item.key === 'notifications' && unreadCount > 0 && (
              <span className={styles.navBadge}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <button
        className={styles.createPost}
        onClick={() => router.push('/create')}
      >
        <i className="bx bx-plus" />
        <span>{t('sidebar.createPost')}</span>
      </button>

      <div className={styles.userSection} ref={dropdownRef}>
        <button className={styles.userInfo} onClick={() => setDropdownOpen((prev) => !prev)}>
          <div className={styles.avatar}>
            {profile?.avatar_uri ? (
              <ExternalImage src={profile.avatar_uri} alt="" />
            ) : (
              <i className="bx bxs-user" />
            )}
          </div>
          <div className={styles.userMeta}>
            <span className={styles.displayName}>
              {profile?.display_name || user?.email || 'User'}
            </span>
            <span className={styles.email}>{user?.email}</span>
          </div>
          <i className={`bx bx-chevron-down ${styles.chevron} ${dropdownOpen ? styles.chevronUp : ''}`} />
        </button>

        {dropdownOpen && (
          <div className={styles.dropdown}>
            <Link href="/profile" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
              <i className="bx bx-user-circle" />
              <span>{t('sidebar.profile')}</span>
            </Link>
            <Link href="/settings" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
              <i className="bx bx-cog" />
              <span>{t('nav.settings')}</span>
            </Link>
            <div className={styles.dropdownDivider} />
            <button className={`${styles.dropdownItem} ${styles.danger}`} onClick={handleLogout}>
              <i className="bx bx-log-out-circle" />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
