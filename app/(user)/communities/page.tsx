'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handleKeywordChange = useCallback((value: string) => {
    setKeyword(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedKeyword(value), 300)
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const discoverKey = activeTab === 'discover'
    ? `/communities?keyword=${encodeURIComponent(debouncedKeyword)}&page=1&page_size=20`
    : null

  const joinedKey = activeTab === 'joined'
    ? `/communities/joined?keyword=${encodeURIComponent(debouncedKeyword)}&page=1&page_size=20`
    : null

  const createdKey = activeTab === 'created'
    ? `/communities/created?keyword=${encodeURIComponent(debouncedKeyword)}&page=1&page_size=20`
    : null

  const { data: discoverRes, isLoading: discoverLoading } = useSWR<CommunityListResponse>(
    discoverKey,
    (url: string) => swrFetcher<CommunityListResponse>(url),
  )

  const { data: joinedRes, isLoading: joinedLoading } = useSWR<CommunityListResponse>(
    joinedKey,
    () => listJoinedCommunities(debouncedKeyword || undefined),
  )

  const { data: createdRes, isLoading: createdLoading } = useSWR<CommunityListResponse>(
    createdKey,
    () => listCreatedCommunities(debouncedKeyword || undefined),
  )

  const res = activeTab === 'discover' ? discoverRes : activeTab === 'joined' ? joinedRes : createdRes
  const isLoading = activeTab === 'discover' ? discoverLoading : activeTab === 'joined' ? joinedLoading : createdLoading

  if (initializing) return <div className={styles.page} />
  if (!isAuthenticated) {
    router.push('/login')
    return <div className={styles.page} />
  }

  const handleTabChange = (tab: Tab) => {
    const params = new URLSearchParams()
    if (tab !== 'discover') params.set('tab', tab)
    if (privacyFilter !== 'all') params.set('privacy', privacyFilter)
    if (debouncedKeyword) params.set('q', debouncedKeyword)
    router.push(`/communities${params.toString() ? '?' + params.toString() : ''}`)
  }

  const handlePrivacyFilter = (filter: PrivacyFilter) => {
    const params = new URLSearchParams()
    if (activeTab !== 'discover') params.set('tab', activeTab)
    if (filter !== 'all') params.set('privacy', filter)
    if (debouncedKeyword) params.set('q', debouncedKeyword)
    router.push(`/communities?${params.toString()}`)
  }

  let communities = res?.communities ?? []
  if (privacyFilter !== 'all') {
    communities = communities.filter(c => c.privacy === privacyFilter)
  }
  const showFilters = true

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('communities.title')}</h1>
        <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
          <i className="bx bx-plus" />
          {t('communities.createBtn')}
        </button>
      </div>

      <div className={styles.searchWrap}>
        <i className={`bx bx-search ${styles.searchIcon}`} />
        <input
          className={styles.searchInput}
          type="text"
          placeholder={t('communities.searchPlaceholder')}
          value={keyword}
          onChange={e => handleKeywordChange(e.target.value)}
        />
      </div>

      <div className={styles.tabs}>
        {(['discover', 'joined', 'created'] as Tab[]).map(tab => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => handleTabChange(tab)}
          >
            {t(`communities.${tab}`)}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className={styles.filters}>
          {(['all', 'public', 'invitation_only'] as PrivacyFilter[]).map(filter => (
            <button
              key={filter}
              className={`${styles.filterChip} ${privacyFilter === filter ? styles.filterChipActive : ''}`}
              onClick={() => handlePrivacyFilter(filter)}
            >
              {t(`communities.filter${filter === 'all' ? 'All' : filter === 'public' ? 'Public' : 'Invitation'}`)}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonHeader}>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonLines}>
                  <div className={styles.skeletonLine} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                </div>
              </div>
              <div className={`${styles.skeletonLine} ${styles.skeletonLineMedium}`} />
            </div>
          ))}
        </div>
      ) : communities.length === 0 ? (
        <div className={styles.empty}>
          <i className={`bx bx-chat ${styles.emptyIcon}`} />
          <p>{t('communities.emptyDiscover')}</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {communities.map(community => (
            <CommunityCard key={community.id} community={community} />
          ))}
        </div>
      )}

      <CreateCommunityModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  )
}
