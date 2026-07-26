'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from '../hooks/useTranslation'
import { logout } from '../api/auth'
import styles from './AdminSidebar.module.css'

interface AdminSidebarProps {
  collapsed: boolean
  mobileOpen: boolean
}

const menuItems = [
  { key: 'dashboard', icon: 'bx bx-bar-chart-alt-2', href: '/admin/dashboard' },
  { key: 'users', icon: 'bx bx-group', href: '/admin/users' },
  { key: 'posts', icon: 'bx bx-file', href: '/admin/posts' },
  { key: 'reports', icon: 'bx bx-flag', href: '/admin/reports' },
  { key: 'media', icon: 'bx bx-image', href: '/admin/media' },
  { key: 'groups', icon: 'bx bx-chat', href: '/admin/groups' },
  { key: 'communities', icon: 'bx bx-world', href: '/admin/communities' },
  { key: 'ads', icon: 'bx bx-dollar', href: '/admin/ads' },
]

export default function AdminSidebar({ collapsed, mobileOpen }: AdminSidebarProps) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await logout().catch(() => {})
    localStorage.removeItem('token')
    localStorage.removeItem('admin_profile')
    router.push('/login')
  }

  return (
    <aside className={`${styles.sidebar}${collapsed ? ` ${styles.close}` : ''}${mobileOpen ? ` ${styles.mobileOpen}` : ''}`}>
      <Link href="/admin/dashboard" className={styles.logo}>
        <Image src="/S-Logo-Rmbg.png" alt="LinkUp" width={500} height={500} className={styles.logoImg} priority />
        <span className={styles.logoName}>LinkUp</span>
      </Link>

      <ul className={styles.sideMenu}>
        {menuItems.map((item) => (
          <li
            key={item.key}
            className={pathname === item.href ? styles.active : ''}
          >
            <Link href={item.href}>
              <i className={item.icon} />
              <span>{t(`nav.${item.key}`)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.separator} />

      <ul className={styles.footerMenu}>
        <li className={pathname === '/admin/profile' ? styles.active : ''}>
          <Link href="/admin/profile">
            <i className="bx bx-user-circle" />
            <span>{t('nav.profile')}</span>
          </Link>
        </li>
        <li className={pathname === '/admin/settings' ? styles.active : ''}>
          <Link href="/admin/settings">
            <i className="bx bx-cog" />
            <span>{t('nav.settings')}</span>
          </Link>
        </li>
      </ul>

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
