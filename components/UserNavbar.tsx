'use client'

import { Suspense, useState, type FormEvent } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from './UserNavbar.module.css'
import { useTranslation } from '../hooks/useTranslation'

function UserNavbarContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'explore'
  const showTabs = pathname === '/'
  const pageTitleKey: string | undefined = {
    '/friends': 'friends.title',
    '/saved': 'saved.title',
    '/settings': 'nav.settings',
    '/notifications': 'notifications.title',
  }[pathname]
  const isDetail = !showTabs && !pageTitleKey
  const [query, setQuery] = useState('')

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <nav className={styles.nav}>
      {isDetail && (
        <button
          type="button"
          className={styles.backButton}
          onClick={handleBack}
          aria-label={t('common.back')}
        >
          <i className="bx bx-arrow-back" />
        </button>
      )}

      <form className={styles.searchForm} onSubmit={handleSearch}>
        <i className="bx bx-search" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('common.search')}
          className={styles.searchInput}
        />
      </form>

      {showTabs && (
        <div className={styles.tabs}>
          <Link
            href="/?tab=explore"
            className={`${styles.tab}${tab === 'explore' ? ` ${styles.tabActive}` : ''}`}
          >
            {t('userNavbar.explore')}
          </Link>
          <Link
            href="/?tab=following"
            className={`${styles.tab}${tab === 'following' ? ` ${styles.tabActive}` : ''}`}
          >
            {t('userNavbar.following')}
          </Link>
        </div>
      )}

      {pageTitleKey && (
        <div className={styles.pageTitle}>{t(pageTitleKey)}</div>
      )}
    </nav>
  )
}

export default function UserNavbar() {
  return (
    <Suspense fallback={null}>
      <UserNavbarContent />
    </Suspense>
  )
}
