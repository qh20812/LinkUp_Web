'use client'

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from './UserNavbar.module.css'
import { useTranslation } from '../hooks/useTranslation'

type UserNavbarProps = {
  leftOpen: boolean
  onToggleLeft: () => void
  rightOpen: boolean
  onToggleRight: () => void
  showRightToggle: boolean
}

function UserNavbarContent({ leftOpen, onToggleLeft, rightOpen, onToggleRight, showRightToggle }: UserNavbarProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'explore'
  const showTabs = pathname === '/'
  const pageTitleKey: string | undefined = (() => {
    if (pathname === '/profile' || pathname.startsWith('/profile/')) return 'sidebar.profile'
    if (pathname === '/communities' || pathname.startsWith('/communities/')) return 'sidebar.communities'
    return {
      '/friends': 'friends.title',
      '/saved': 'saved.title',
      '/settings': 'nav.settings',
      '/notifications': 'notifications.title',
      '/messages': 'sidebar.messages',
    }[pathname]
  })()
  const isProfilePage = pathname === '/profile' || pathname.startsWith('/profile/')
  const isDetail = !showTabs && !pageTitleKey
  const showBack = isDetail || isProfilePage
  const [query, setQuery] = useState('')
  // Mobile (≤768px): search collapses to an icon toggle so the
  // Explore/Following tabs stay visible. Tapping expands the form full-width.
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchToggleRef = useRef<HTMLButtonElement>(null)
  const prevPathname = useRef(pathname)

  // Collapse the expanded search on navigation (e.g. after submit).
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      setSearchOpen(false)
    }
  }, [pathname])

  // Autofocus the input when expanded.
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  // Escape closes the expanded search and returns focus to the toggle.
  useEffect(() => {
    if (!searchOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false)
        searchToggleRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen])

  const handleBack = () => {
    if (pathname === '/search') {
      router.push('/')
      return
    }
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q) {
      setSearchOpen(false)
      router.push(`/search?q=${encodeURIComponent(q)}`)
    }
  }

  const handleCloseSearch = () => {
    setSearchOpen(false)
    searchToggleRef.current?.focus()
  }

  return (
    <nav className={`${styles.nav}${searchOpen ? ` ${styles.navSearchOpen}` : ''}`}>
      <button
        type="button"
        className={styles.menuBtn}
        onClick={onToggleLeft}
        aria-label={leftOpen ? t('userNavbar.closeLeft') : t('userNavbar.openLeft')}
        title={leftOpen ? t('userNavbar.closeLeft') : t('userNavbar.openLeft')}
      >
        <i className={`bx ${leftOpen ? 'bx-x' : 'bx-menu'}`} />
      </button>

      {showBack && (
        <button
          type="button"
          className={styles.backButton}
          onClick={handleBack}
          aria-label={t('common.back')}
        >
          <i className="bx bx-arrow-back" />
        </button>
      )}

      <form className={styles.searchForm} onSubmit={handleSearch} role="search">
        <i className="bx bx-search" aria-hidden="true" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('common.search')}
          aria-label={t('common.search')}
          className={styles.searchInput}
        />
      </form>

      {!searchOpen && (
        <button
          ref={searchToggleRef}
          type="button"
          className={styles.searchToggle}
          onClick={() => setSearchOpen(true)}
          aria-expanded={searchOpen}
          aria-label={t('userNavbar.openSearch')}
          title={t('userNavbar.openSearch')}
        >
          <i className="bx bx-search" aria-hidden="true" />
        </button>
      )}

      {searchOpen && (
        <button
          type="button"
          className={styles.searchClose}
          onClick={handleCloseSearch}
          aria-label={t('userNavbar.closeSearch')}
          title={t('userNavbar.closeSearch')}
        >
          <i className="bx bx-x" aria-hidden="true" />
        </button>
      )}

      {!searchOpen && showTabs && (
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

      {!searchOpen && pageTitleKey && (
        <div className={styles.pageTitle}>{t(pageTitleKey)}</div>
      )}

      {!searchOpen && showRightToggle && (
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={onToggleRight}
          aria-label={rightOpen ? t('userNavbar.closeRight') : t('userNavbar.openRight')}
          title={rightOpen ? t('userNavbar.closeRight') : t('userNavbar.openRight')}
        >
          <i className={`bx ${rightOpen ? 'bx-x' : 'bx-menu'}`} />
        </button>
      )}
    </nav>
  )
}

export default function UserNavbar(props: UserNavbarProps) {
  return (
    <Suspense fallback={null}>
      <UserNavbarContent {...props} />
    </Suspense>
  )
}
