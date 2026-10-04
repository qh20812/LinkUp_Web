'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWRInfinite from 'swr/infinite'
import { swrFetcher } from '../../../api/swr'
import { listJoinedCommunities, listCreatedCommunities } from '../../../api/communities'
import { useTranslation } from '../../../hooks/useTranslation'
import { useAuth } from '../../../hooks/useAuth'
import CommunityCard from '../../../components/communities/CommunityCard'
import CreateCommunityModal from '../../../components/communities/CreateCommunityModal'
import type { CommunityListResponse } from '../../../types'
import styles from './Communities.module.css'

type Tab = 'discover' | 'joined' | 'created'
type PrivacyFilter = 'all' | 'public' | 'invitation_only'

const VALID_TABS: Tab[] = ['discover', 'joined', 'created']
const PAGE_SIZE = 20

export default function CommunitiesPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <CommunitiesContent />
    </Suspense>
  )
}

function CommunitiesContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, initializing } = useAuth()

  const rawTab = searchParams.get('tab') || 'discover'
  const activeTab: Tab = VALID_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : 'discover'

  const rawPrivacy = searchParams.get('privacy') || 'all'
  const privacyFilter: PrivacyFilter = ['all', 'public', 'invitation_only'].includes(rawPrivacy) ? (rawPrivacy as PrivacyFilter) : 'all'

  const rawKeyword = searchParams.get('q') || ''
  const [keyword, setKeyword] = useState(rawKeyword)
  const [debouncedKeyword, setDebouncedKeyword] = useState(rawKeyword)
  const [prevNav, setPrevNav] = useState(`${activeTab}:${rawKeyword}`)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Reset search when navigating back/forward or switching tabs via URL
  // (adjust-during-render pattern — no effect, no cascading renders).
  if (`${activeTab}:${rawKeyword}` !== prevNav) {
    setPrevNav(`${activeTab}:${rawKeyword}`)
    setKeyword(rawKeyword)
    setDebouncedKeyword(rawKeyword)
  }

  const handleKeywordChange = useCallback((value: string) => {
    setKeyword(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedKeyword(value), 300)
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const getKey = useCallback(
    (pageIndex: number, prev: CommunityListResponse | null) => {
      if (prev && prev.communities.length === 0) return null
      const params = new URLSearchParams({
        page: String(pageIndex + 1),
        page_size: String(PAGE_SIZE),
      })
      if (debouncedKeyword) params.set('keyword', debouncedKeyword)
      if (activeTab === 'discover') return `/communities?${params.toString()}`
      if (activeTab === 'joined') return `/communities/joined?${params.toString()}`
      return `/communities/created?${params.toString()}`
    },
    [activeTab, debouncedKeyword],
  )

  const fetcher = useCallback(async (url: string) => {
    if (url.startsWith('/communities/joined?')) {
      const u = new URL(url, 'http://localhost')
      return listJoinedCommunities(
        u.searchParams.get('keyword') || undefined,
        Number(u.searchParams.get('page') || 1),
        PAGE_SIZE,
      )
    }
    if (url.startsWith('/communities/created?')) {
      const u = new URL(url, 'http://localhost')
      return listCreatedCommunities(
        u.searchParams.get('keyword') || undefined,
        Number(u.searchParams.get('page') || 1),
        PAGE_SIZE,
      )
    }
    return swrFetcher<CommunityListResponse>(url)
  }, [])

  const { data, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite<CommunityListResponse>(
    getKey,
    fetcher,
    { revalidateFirstPage: false },
  )

  const pages = data ?? []
  const total = pages[0]?.total ?? 0
  const loaded = pages.flatMap((p) => p.communities)
  const communities =
    privacyFilter === 'all' ? loaded : loaded.filter((c) => c.privacy === privacyFilter)
  const hasMore = pages.length === 0 || (pages[pages.length - 1]?.communities.length ?? 0) === PAGE_SIZE
  const loadingMore = isValidating && !isLoading

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || isLoading) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setSize((s) => s + 1)
      },
      { rootMargin: '320px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoading, setSize, size, pages.length])

  if (initializing) return <div className={styles.page} />
  if (!isAuthenticated) {
    router.push('/login')
    return <div className={styles.page} />
  }

  const pushParams = (tab: Tab, privacy: PrivacyFilter, q: string) => {
    const params = new URLSearchParams()
    if (tab !== 'discover') params.set('tab', tab)
    if (privacy !== 'all') params.set('privacy', privacy)
    if (q) params.set('q', q)
    router.push(`/communities${params.toString() ? '?' + params.toString() : ''}`)
  }

  const handleTabChange = (tab: Tab) => {
    pushParams(tab, privacyFilter, debouncedKeyword)
  }

  const handlePrivacyFilter = (filter: PrivacyFilter) => {
    pushParams(activeTab, filter, debouncedKeyword)
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'discover', label: t('communities.discover') },
    { key: 'joined', label: t('communities.joined') },
    { key: 'created', label: t('communities.created') },
  ]

  return (
    <div className={styles.page}>
      <h1 className={styles.srOnly}>{t('communities.title')}</h1>

      <div className={styles.toolbar}>
        <div className={styles.segmented} role="tablist" aria-label={t('communities.title')}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`${styles.segment} ${activeTab === tab.key ? styles.segmentActive : ''}`}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label}
              {activeTab === tab.key && total > 0 && (
                <span className={styles.segmentCount}>{total}</span>
              )}
            </button>
          ))}
        </div>

        <div className={styles.toolbarRight}>
          <div className={styles.searchWrap}>
            <i className={`bx bx-search ${styles.searchIcon}`} aria-hidden />
            <input
              className={styles.searchInput}
              type="text"
              placeholder={t('communities.searchPlaceholder')}
              value={keyword}
              onChange={(e) => handleKeywordChange(e.target.value)}
              aria-label={t('communities.searchPlaceholder')}
            />
            {keyword && (
              <button
                className={styles.searchClear}
                onClick={() => handleKeywordChange('')}
                aria-label={t('common.clear')}
              >
                <i className="bx bx-x" />
              </button>
            )}
          </div>
          <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
            <i className="bx bx-plus" aria-hidden />
            {t('communities.createBtn')}
          </button>
        </div>
      </div>

      <div className={styles.filters} role="group" aria-label={t('communities.privacy')}>
        {(['all', 'public', 'invitation_only'] as PrivacyFilter[]).map((filter) => (
          <button
            key={filter}
            className={`${styles.filterChip} ${privacyFilter === filter ? styles.filterChipActive : ''}`}
            aria-pressed={privacyFilter === filter}
            onClick={() => handlePrivacyFilter(filter)}
          >
            {t(`communities.filter${filter === 'all' ? 'All' : filter === 'public' ? 'Public' : 'Invitation'}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} aria-hidden>
              <div className={styles.skeletonCover} />
              <div className={styles.skeletonBody}>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonLines}>
                  <div className={styles.skeletonLine} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : communities.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIconWrap} aria-hidden>
            <i className="bx bx-group" />
          </div>
          <p className={styles.emptyTitle}>{t('communities.emptyDiscover')}</p>
          <p className={styles.emptyHint}>{t('communities.emptyDiscoverHint')}</p>
          <div className={styles.emptyCtas}>
            <button className={styles.emptyPrimary} onClick={() => setShowCreateModal(true)}>
              {t('communities.createBtn')}
            </button>
            {(debouncedKeyword || privacyFilter !== 'all') && (
              <button
                className={styles.emptyGhost}
                onClick={() => {
                  handleKeywordChange('')
                  pushParams(activeTab, 'all', '')
                }}
              >
                {t('communities.clearFilters')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {communities.map((community, i) => (
              <CommunityCard key={community.id} community={community} index={i % 8} />
            ))}
          </div>

          {hasMore && <div ref={sentinelRef} style={{ height: 1 }} aria-hidden />}

          {loadingMore && (
            <div className={styles.loadMoreRow} aria-hidden>
              <div className={styles.loadMoreDots}>
                <span /><span /><span />
              </div>
            </div>
          )}

          {hasMore && !loadingMore && (
            <div className={styles.loadMoreRow}>
              <button className={styles.loadMoreBtn} onClick={() => setSize(size + 1)}>
                {t('communities.loadMore')}
              </button>
            </div>
          )}

          {!hasMore && communities.length > 0 && (
            <p className={styles.endLine}>{t('feed.end')}</p>
          )}
        </>
      )}

      <CreateCommunityModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          mutate()
        }}
      />
    </div>
  )
}
