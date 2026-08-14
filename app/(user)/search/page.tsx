'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import useSWR from 'swr'
import { swrFetcher } from '../../../api/swr'
import ExternalImage from '../../../components/ExternalImage'
import { useTranslation } from '../../../hooks/useTranslation'
import { useAuth } from '../../../hooks/useAuth'
import type { SearchResponse } from '../../../types'
import styles from './Search.module.css'

type Tab = 'all' | 'users' | 'posts' | 'hashtags'

const VALID_TABS: Tab[] = ['all', 'users', 'posts', 'hashtags']

export default function SearchPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <SearchContent />
    </Suspense>
  )
}

function SearchContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, initializing } = useAuth()

  const rawQ = searchParams.get('q') || ''
  const q = rawQ.trim()

  const rawTab = searchParams.get('tab') || 'all'
  const activeTab: Tab = VALID_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : 'all'

  const swrKey = q
    ? `/search?keyword=${encodeURIComponent(q)}&type=${activeTab}`
    : null

  const { data: res, isLoading } = useSWR<SearchResponse>(
    swrKey,
    (url: string) => swrFetcher<SearchResponse>(url),
  )

  if (initializing) return <div className={styles.page} />
  if (!isAuthenticated) {
    router.push('/login')
    return <div className={styles.page} />
  }

  if (!q) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <i className={`bx bx-search ${styles.emptyIcon}`} />
          <p className={styles.emptyText}>{t('common.search')}</p>
        </div>
      </div>
    )
  }

  const users = res?.users ?? []
  const posts = res?.posts ?? []
  const hashtags = res?.hashtags ?? []
  const hasResults = users.length > 0 || posts.length > 0 || hashtags.length > 0

  const handleTabChange = (tab: Tab) => {
    const params = new URLSearchParams({ q })
    if (tab !== 'all') params.set('tab', tab)
    router.push(`/search?${params.toString()}`)
  }

  const renderSkeletons = () => (
    <div className={styles.content}>
      {activeTab === 'all' && (
        <>
          <div className={styles.skeletonSectionHeader} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`u-${i}`} className={styles.skeletonItem}>
              <div className={styles.skeletonCircle} />
              <div className={styles.skeletonLines}>
                <div className={styles.skeletonLine} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
              </div>
            </div>
          ))}
          <div className={styles.skeletonSectionHeader} style={{ marginTop: 16 }} />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={`p-${i}`} className={styles.skeletonItem}>
              <div className={styles.skeletonSquare} />
              <div className={styles.skeletonLines}>
                <div className={styles.skeletonLine} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
              </div>
            </div>
          ))}
        </>
      )}
      {activeTab === 'users' && Array.from({ length: 4 }).map((_, i) => (
        <div key={`u-${i}`} className={styles.skeletonItem}>
          <div className={styles.skeletonCircle} />
          <div className={styles.skeletonLines}>
            <div className={styles.skeletonLine} />
            <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
          </div>
        </div>
      ))}
      {activeTab === 'posts' && Array.from({ length: 3 }).map((_, i) => (
        <div key={`p-${i}`} className={styles.skeletonItem}>
          <div className={styles.skeletonSquare} />
          <div className={styles.skeletonLines}>
            <div className={styles.skeletonLine} />
            <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
          </div>
        </div>
      ))}
      {activeTab === 'hashtags' && Array.from({ length: 3 }).map((_, i) => (
        <div key={`h-${i}`} className={styles.skeletonItem}>
          <div className={styles.skeletonSquare} />
          <div className={styles.skeletonLines}>
            <div className={styles.skeletonLine} />
            <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
          </div>
        </div>
      ))}
    </div>
  )

  const renderEmpty = () => (
    <div className={styles.empty}>
      <i className={`bx bx-search ${styles.emptyIcon}`} />
      <p className={styles.emptyText}>
        {t('search.noResults')} <span className={styles.emptyKeyword}>&ldquo;{q}&rdquo;</span>
      </p>
    </div>
  )

  const renderUsers = () => {
    if (users.length === 0) return null
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          {t('search.peopleSection').replace('{count}', String(users.length))}
        </h3>
        {users.map((user) => (
          <button
            key={user.id}
            className={styles.userItem}
            onClick={() => router.push(`/profile/${user.id}`)}
          >
            <div className={styles.userAvatar}>
              {user.avatar_uri ? (
                <ExternalImage src={user.avatar_uri} alt="" className={styles.userAvatarImg} />
              ) : (
                <i className="bx bxs-user" />
              )}
            </div>
            <div className={styles.itemMeta}>
              <span className={styles.itemName}>{user.display_name || user.username}</span>
              {user.display_name && user.username && (
                <span className={styles.itemSub}>@{user.username}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    )
  }

  const renderPosts = () => {
    if (posts.length === 0) return null
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          {t('search.postsSection').replace('{count}', String(posts.length))}
        </h3>
        {posts.map((post) => (
          <button
            key={post.id}
            className={styles.postItem}
            onClick={() => router.push(`/posts/${post.id}`)}
          >
            <div className={styles.postIcon}>
              <i className="bx bx-file" />
            </div>
            <div className={styles.itemMeta}>
              <span className={styles.itemName}>{post.title}</span>
              <span className={styles.itemSub}>@{post.username}</span>
            </div>
          </button>
        ))}
      </div>
    )
  }

  const renderHashtags = () => {
    if (hashtags.length === 0) return null
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          {t('search.hashtagsSection').replace('{count}', String(hashtags.length))}
        </h3>
        {hashtags.map((tag) => (
          <button
            key={tag.name}
            className={styles.hashtagItem}
            onClick={() => router.push(`/search?q=%23${encodeURIComponent(tag.name)}`)}
          >
            <div className={styles.hashtagIcon}>
              <i className="bx bx-hash" />
            </div>
            <div className={styles.itemMeta}>
              <span className={styles.itemName}>#{tag.name}</span>
              <span className={styles.itemSub}>
                {tag.post_count} {t('rightSidebar.posts')}
              </span>
            </div>
          </button>
        ))}
      </div>
    )
  }

  const renderAllTabs = () => (
    <div className={styles.content}>
      {renderUsers()}
      {renderPosts()}
      {renderHashtags()}
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {t('search.title').replace('{keyword}', q)}
        </h1>
      </div>

      <div className={styles.tabs}>
        {(['all', 'users', 'posts', 'hashtags'] as Tab[]).map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => handleTabChange(tab)}
          >
            {t(`search.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        renderSkeletons()
      ) : !hasResults ? (
        renderEmpty()
      ) : activeTab === 'all' ? (
        renderAllTabs()
      ) : activeTab === 'users' ? (
        <div className={styles.content}>{renderUsers()}</div>
      ) : activeTab === 'posts' ? (
        <div className={styles.content}>{renderPosts()}</div>
      ) : (
        <div className={styles.content}>{renderHashtags()}</div>
      )}
    </div>
  )
}
