'use client'

import { Suspense, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import useSWR from 'swr'
import { swrFetcher } from '../../../../api/swr'
import { useTranslation } from '../../../../hooks/useTranslation'
import { useAuth } from '../../../../hooks/useAuth'
import CommunityHeader from '../../../../components/communities/CommunityHeader'
import CommunityFeed from '../../../../components/communities/CommunityFeed'
import CommunityMemberList from '../../../../components/communities/CommunityMemberList'
import CommunityRules from '../../../../components/communities/CommunityRules'
import type { CommunityDetailResponse } from '../../../../types'
import styles from './CommunityDetail.module.css'

type Tab = 'posts' | 'members' | 'rules'

export default function CommunityDetailPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <CommunityDetailContent />
    </Suspense>
  )
}

function CommunityDetailContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const { isAuthenticated, initializing } = useAuth()
  const communityID = params.communityID as string

  const [activeTab, setActiveTab] = useState<Tab>('posts')
  const [membershipStatus, setMembershipStatus] = useState<
    CommunityDetailResponse['membership_status']
  >('none')

  const swrKey = communityID ? `/communities/${communityID}` : null
  const { data: community, error, isLoading } = useSWR<CommunityDetailResponse>(
    swrKey,
    (url: string) => swrFetcher<CommunityDetailResponse>(url),
  )

  const handleStatusChange = useCallback((newStatus: CommunityDetailResponse['membership_status']) => {
    setMembershipStatus(newStatus)
  }, [])

  if (initializing) return <div className={styles.page} />
  if (!isAuthenticated) {
    router.push('/login')
    return <div className={styles.page} />
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonHeader}>
          <div className={styles.skeletonCover} />
          <div className={styles.skeletonInfo}>
            <div className={styles.skeletonAvatar} />
            <div className={styles.skeletonLine} style={{ width: '200px' }} />
            <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
          </div>
        </div>
      </div>
    )
  }

  if (error || !community) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <i className={`bx bx-error ${styles.emptyIcon}`} />
          <p>Không tìm thấy cộng đồng</p>
        </div>
      </div>
    )
  }

  const effectiveStatus = membershipStatus === 'none'
    ? community.membership_status
    : membershipStatus

  const tabs: { key: Tab; label: string }[] = [
    { key: 'posts', label: t('communities.posts') },
    { key: 'members', label: t('communities.memberList') },
    { key: 'rules', label: t('communities.rules') },
  ]

  return (
    <div className={styles.page}>
      <CommunityHeader community={community} onStatusChange={handleStatusChange} />

      <div className={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {activeTab === 'posts' && (
          <CommunityFeed
            communityID={communityID}
            membershipStatus={effectiveStatus}
          />
        )}
        {activeTab === 'members' && (
          <CommunityMemberList communityID={communityID} />
        )}
        {activeTab === 'rules' && (
          <CommunityRules
            communityID={communityID}
            isAdmin={effectiveStatus === 'admin' || effectiveStatus === 'creator'}
          />
        )}
      </div>
    </div>
  )
}
