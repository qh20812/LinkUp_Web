'use client'

import { Suspense, useState, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { swrFetcher } from '../../../../api/swr'
import { useTranslation } from '../../../../hooks/useTranslation'
import { useAuth } from '../../../../hooks/useAuth'
import CommunityHeader from '../../../../components/communities/CommunityHeader'
import CommunityFeed from '../../../../components/communities/CommunityFeed'
import CommunityMemberList from '../../../../components/communities/CommunityMemberList'
import CommunityRules from '../../../../components/communities/CommunityRules'
import CommunityManageTab from '../../../../components/communities/CommunityManageTab'
import CommunityAboutRail, { type CommunityDetailTab } from '../../../../components/communities/CommunityAboutRail'
import JoinButton from '../../../../components/communities/JoinButton'
import JoinCommunityCodeModal from '../../../../components/communities/JoinCommunityCodeModal'
import type { CommunityDetailResponse } from '../../../../types'
import styles from './CommunityDetail.module.css'

type Tab = CommunityDetailTab

const VALID_TABS: Tab[] = ['posts', 'members', 'rules', 'manage']

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
  const searchParams = useSearchParams()
  const { isAuthenticated, initializing } = useAuth()
  const communityID = params.communityID as string

  const rawTab = searchParams.get('tab') || 'posts'
  const urlTab: Tab = VALID_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : 'posts'

  // Local override of membership status after join/leave/code actions.
  // Reset when navigating to another community (adjust-during-render, no effect).
  const [prevID, setPrevID] = useState(communityID)
  const [statusOverride, setStatusOverride] = useState<
    CommunityDetailResponse['membership_status'] | null
  >(null)
  if (communityID !== prevID) {
    setPrevID(communityID)
    setStatusOverride(null)
  }
  const [codeOpen, setCodeOpen] = useState(false)

  const swrKey = communityID ? `/communities/${communityID}` : null
  const { data: community, error, isLoading, mutate } = useSWR<CommunityDetailResponse>(
    swrKey,
    (url: string) => swrFetcher<CommunityDetailResponse>(url),
  )

  const handleStatusChange = useCallback((newStatus: CommunityDetailResponse['membership_status']) => {
    setStatusOverride(newStatus)
    mutate()
  }, [mutate])

  const setTab = useCallback((tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'posts') params.delete('tab')
    else params.set('tab', tab)
    const qs = params.toString()
    router.replace(`/communities/${communityID}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [router, communityID, searchParams])

  if (initializing) return <div className={styles.page} />
  if (!isAuthenticated) {
    router.push('/login')
    return <div className={styles.page} />
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonHeader} aria-hidden>
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
        <div className={styles.empty} role="alert">
          <div className={styles.emptyIconWrap} aria-hidden>
            <i className="bx bx-error" />
          </div>
          <p className={styles.emptyTitle}>{t('communities.detailNotFound')}</p>
          <button className={styles.emptyPrimary} onClick={() => router.push('/communities')}>
            {t('communities.backToList')}
          </button>
        </div>
      </div>
    )
  }

  const effectiveStatus = statusOverride ?? community.membership_status
  const isMember = effectiveStatus === 'member' || effectiveStatus === 'admin' || effectiveStatus === 'creator'
  const isPrivileged = effectiveStatus === 'admin' || effectiveStatus === 'creator'

  const tabs: { key: Tab; label: string }[] = [
    { key: 'posts', label: t('communities.posts') },
    { key: 'members', label: t('communities.memberList') },
    { key: 'rules', label: t('communities.rules') },
  ]
  if (isPrivileged) {
    tabs.push({ key: 'manage', label: t('communities.manage') })
  }
  const activeTab = urlTab === 'manage' && !isPrivileged ? 'posts' : urlTab

  // Keep displayed header status in sync with local overrides
  const headerCommunity: CommunityDetailResponse =
    statusOverride === null ? community : { ...community, membership_status: statusOverride }

  return (
    <div className={styles.page}>
      <CommunityHeader community={headerCommunity} onStatusChange={handleStatusChange} />

      <div className={styles.tabs} role="tablist" aria-label={community.name}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'posts' ? (
        <div className={styles.split}>
          <div className={styles.feedCol}>
            {!isMember ? (
              <div className={styles.locked}>
                <div className={styles.emptyIconWrap} aria-hidden>
                  <i className="bx bx-lock-alt" />
                </div>
                <p className={styles.emptyTitle}>{t('communities.lockedTitle')}</p>
                <p className={styles.emptyHint}>{t('communities.lockedHint')}</p>
                <div className={styles.lockedCtas}>
                  {community.privacy === 'invitation_only' && (
                    <button type="button" className={styles.codeCta} onClick={() => setCodeOpen(true)}>
                      <i className="bx bx-key" aria-hidden /> {t('communities.enterCode')}
                    </button>
                  )}
                  <JoinButton
                    communityID={communityID}
                    status={effectiveStatus}
                    privacy={community.privacy}
                    onStatusChange={handleStatusChange}
                  />
                </div>
                <JoinCommunityCodeModal
                  open={codeOpen}
                  communityID={communityID}
                  communityName={community.name}
                  onClose={() => setCodeOpen(false)}
                  onJoined={(status) => handleStatusChange(status)}
                />
              </div>
            ) : (
              <CommunityFeed
                communityID={communityID}
                membershipStatus={effectiveStatus}
              />
            )}
          </div>
          <CommunityAboutRail community={community} onGoTab={setTab} />
        </div>
      ) : (
        <div className={styles.content}>
          {activeTab === 'members' && (
            <CommunityMemberList
              communityID={communityID}
              isAdmin={isPrivileged}
            />
          )}
          {activeTab === 'rules' && (
            <CommunityRules
              communityID={communityID}
              isAdmin={isPrivileged}
            />
          )}
          {activeTab === 'manage' && isPrivileged && (
            <CommunityManageTab
              communityID={communityID}
              community={community}
              onUpdate={() => mutate()}
            />
          )}
        </div>
      )}
    </div>
  )
}
