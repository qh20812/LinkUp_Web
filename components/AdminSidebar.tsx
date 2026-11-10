'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import useSWR from 'swr'
  import { useTranslation } from '../hooks/useTranslation'
  import { logout } from '../api/auth'
  import { clearSession } from '../api/api'
  import { clearSWRCache } from '../api/swr'
  import { adminListTopups } from '../api/wallet'
  import { useNotification } from '../contexts/NotificationContext'
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
  { key: 'violationRules', icon: 'bx bx-list-check', href: '/admin/violation-rules' },
  { key: 'media', icon: 'bx bx-image', href: '/admin/media' },
  { key: 'groups', icon: 'bx bx-chat', href: '/admin/groups' },
  { key: 'communities', icon: 'bx bx-world', href: '/admin/communities' },
  { key: 'ads', icon: 'bx bx-dollar', href: '/admin/ads' },
  { key: 'packages', icon: 'bx bx-package', href: '/admin/packages' },
  { key: 'payments', icon: 'bx bx-credit-card', href: '/admin/payments' },
  { key: 'walletTopups', icon: 'bx bx-wallet', href: '/admin/wallet-topups' },
]

export default function AdminSidebar({ collapsed, mobileOpen }: AdminSidebarProps) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const { closeWs } = useNotification()
  const [userRole, setUserRole] = useState<string | null>(null)

  // Badge hàng đợi nạp ví: số yêu cầu đang chờ duyệt (gồm cả đã báo chuyển).
  const { data: pendingTopups } = useSWR(
    '/admin/wallet/topups?status=pending&page=1&page_size=1',
    () => adminListTopups({ status: 'pending', page: 1, page_size: 1 }),
    { refreshInterval: 60000, shouldRetryOnError: false },
  )
  const pendingTopupCount = pendingTopups?.total ?? 0

  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUserRole(payload.role || null)
      }
    } catch { /* ignore */ }
  }, [])

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
              <span>{t(`nav.${item.key}`)}</span>
              {item.key === 'walletTopups' && pendingTopupCount > 0 && (
                <span className={styles.navBadge}>{pendingTopupCount > 99 ? '99+' : pendingTopupCount}</span>
              )}
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
        {userRole === 'SUPER_ADMIN' && (
          <li className={pathname === '/admin/settings' ? styles.active : ''}>
            <Link href="/admin/settings">
              <i className="bx bx-cog" />
              <span>{t('nav.settings')}</span>
            </Link>
          </li>
        )}
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
