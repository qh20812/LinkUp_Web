'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from '../hooks/useTranslation'
import styles from './PartnerTabs.module.css'

const TABS = [
  { key: 'dashboard', href: '/partner/dashboard', icon: 'bx-bar-chart-alt-2' },
  { key: 'ads', href: '/partner/ads', icon: 'bx-dollar' },
  { key: 'packages', href: '/partner/packages', icon: 'bx-package' },
]

/**
 * Điều hướng nội bộ khu partner. Sidebar chỉ có MỘT mục "Kênh đối tác"; ba
 * trang con được chuyển bằng dải tab này để nav chính không phình lên 10 mục.
 */
export default function PartnerTabs() {
  const pathname = usePathname()
  const { t } = useTranslation()

  return (
    <nav className={styles.tabs} aria-label={t('sidebar.partnerHub')}>
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`${styles.tab}${active ? ` ${styles.active}` : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <i className={`bx ${tab.icon}`} />
            <span>{t(`partner.nav.${tab.key}`)}</span>
          </Link>
        )
      })}
    </nav>
  )
}
