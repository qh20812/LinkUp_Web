'use client'

import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from './UserNavbar.module.css'
import { useTranslation } from '../hooks/useTranslation'

export default function UserNavbar() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'explore'
  const [query, setQuery] = useState('')

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <nav className={styles.nav}>
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
    </nav>
  )
}
