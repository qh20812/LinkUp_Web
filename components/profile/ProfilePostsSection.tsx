'use client'

import styles from './ProfilePostsSection.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import PostCard from '../PostCard'
import type { FeedPost } from '../../types'

interface ProfilePostsSectionProps {
  posts: FeedPost[]
  postsLoading: boolean
  postsError: string | null
  hasMore: boolean
  title: string
  sentinelRef: React.RefObject<HTMLDivElement | null>
  onLike: (postId: string) => void
  onSave: (postId: string) => void
  onComment: (postId: string) => void
  onShare: (postId: string) => void
  onFollow?: (userId: string) => void
  onOpenDetail: (postId: string) => void
}

export default function ProfilePostsSection({
  posts,
  postsLoading,
  postsError,
  hasMore,
  title,
  sentinelRef,
  onLike,
  onSave,
  onComment,
  onShare,
  onFollow,
  onOpenDetail,
}: ProfilePostsSectionProps) {
  const { t } = useTranslation()

  return (
    <div className={styles.postsSection}>
      <h2 className={styles.postsSectionTitle}>{title}</h2>
      <div className={styles.postsList}>
        {!postsLoading && postsError && posts.length === 0 && (
          <div className={styles.loadingWrap}>
            <p>{postsError}</p>
          </div>
        )}

        {!postsLoading && !postsError && posts.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}><i className="bx bx-file" /></span>
            <p className={styles.emptyText}>{t('profile.noPosts')}</p>
          </div>
        )}

        {posts.map((post) => (
          <div key={post.id} className={styles.postItem}>
            <PostCard
              post={post}
              onLike={onLike}
              onSave={onSave}
              onComment={onComment}
              onShare={onShare}
              onFollow={onFollow}
              onOpenDetail={onOpenDetail}
            />
          </div>
        ))}

        {postsLoading && (
          <div className={styles.loadingWrap}>
            <div className={styles.loadingSpinner} />
            <span>{t('profile.loadingPosts')}</span>
          </div>
        )}

        {!hasMore && posts.length > 0 && (
          <div className={styles.loadingWrap}>
            <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
          </div>
        )}

        <div ref={sentinelRef} />
      </div>
    </div>
  )
}
