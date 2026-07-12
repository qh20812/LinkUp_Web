'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from '../hooks/useTranslation'
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
]

export default function AdminSidebar({ collapsed, mobileOpen }: AdminSidebarProps) {
  const { t } = useTranslation()
  const pathname = usePathname()

  return (
    <aside className={`${styles.sidebar}${collapsed ? ` ${styles.close}` : ''}${mobileOpen ? ` ${styles.mobileOpen}` : ''}`}>
      <Link href="/admin/dashboard" className={styles.logo}>
        <img src="/S-Logo-Rmbg.png" alt="LinkUp" className={styles.logoImg} />
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

      <ul className={styles.sideMenu}>
        <li>
          <Link href="/login" className={styles.logout}>
            <i className="bx bx-log-out-circle" />
            <span>{t('nav.logout')}</span>
          </Link>
        </li>
      </ul>
    </aside>
  )
}
