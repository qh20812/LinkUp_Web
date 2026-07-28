'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import styles from './LeftSidebar.module.css'
import { request } from '../api/api'
import { useTranslation } from '../hooks/useTranslation'
import { useAuth } from '../hooks/useAuth'
import type { ViewProfileResponse } from '../types'

const NAV_ITEMS = [
  { key: 'home', href: '/', icon: 'bxs-home' },
  { key: 'explore', href: '/explore', icon: 'bx-compass' },
  { key: 'notifications', href: '/notifications', icon: 'bxs-bell' },
  { key: 'messages', href: '/messages', icon: 'bxs-message-dots' },
  { key: 'friends', href: '/friends', icon: 'bxs-group' },
  { key: 'groups', href: '/groups', icon: 'bxs-chat' },
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

export default function LeftSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()
  const { user } = useAuth()
  const { profile } = useProfile()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside className={styles.sidebar}>
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

      <div className={styles.userSection}>
        <Link href="/profile" className={styles.userInfo}>
          <div className={styles.avatar}>
            {profile?.avatar_uri ? (
              <img src={profile.avatar_uri} alt="" />
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
        </Link>
      </div>
    </aside>
  )
}
