'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from '../hooks/useTranslation'
import { logout } from '../api/auth'
import { clearSession } from '../api/api'
import { clearSWRCache } from '../api/swr'
import { useNotification } from '../contexts/NotificationContext'
import styles from './PartnerSidebar.module.css'

interface PartnerSidebarProps {
  collapsed: boolean
  mobileOpen: boolean
}

const menuItems = [
  { key: 'dashboard', icon: 'bx bx-bar-chart-alt-2', href: '/partner/dashboard' },
  { key: 'ads', icon: 'bx bx-dollar', href: '/partner/ads' },
  { key: 'packages', icon: 'bx bx-package', href: '/partner/packages' },
]

export default function PartnerSidebar({ collapsed, mobileOpen }: PartnerSidebarProps) {
  const { t } = useTranslation()
  const pathname = usePathname()
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
    <aside className={`${styles.sidebar}${collapsed ? ` ${styles.close}` : ''}${mobileOpen ? ` ${styles.mobileOpen}` : ''}`}>
      <ul className={styles.sideMenu}>
        {menuItems.map((item) => (
          <li
            key={item.key}
            className={pathname === item.href ? styles.active : ''}
          >
            <Link href={item.href}>
              <i className={item.icon} />
              <span>{t(`partner.nav.${item.key}`)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.separator} />

      <ul className={styles.logoutMenu}>
        <li>
          <button className={styles.logout} onClick={handleLogout}>
            <i className="bx bx-log-out-circle" />
            <span>{t('nav.logout')}</span>
          </button>
        </li>
      </ul>
    </aside>
  )
}
