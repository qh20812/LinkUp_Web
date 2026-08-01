'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './PostCard.module.css'
import { useTranslation } from '../hooks/useTranslation'
import { getTokenPayload } from '../api/auth'
import VideoPlayer from './VideoPlayer'
import type { FeedPost } from '../types'

function formatRelativeTime(dateStr: string, t: (key: string) => string): string {
  const now = Date.now()
  const past = new Date(dateStr).getTime()
  const diffMs = now - past
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return t('post.justNow')
  if (diffMins < 60) return t('post.minutesAgo').replace('{minutes}', String(diffMins))
  if (diffHours < 24) return t('post.hoursAgo').replace('{hours}', String(diffHours))
  if (diffDays <= 7) return t('post.daysAgo').replace('{days}', String(diffDays))

  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

const CONTENT_TRUNCATE_LENGTH = 200

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

interface PostCardProps {
  post: FeedPost
  onLike?: (postId: string) => void
  onSave?: (postId: string) => void
  onComment?: (postId: string) => void
  onShare?: (postId: string) => void
  onFollow?: (userId: string) => void
}

function isVideo(fileType: string): boolean {
  return fileType.startsWith('video/')
}

function MediaGrid({ media, onNavigate }: { media: FeedPost['media']; onNavigate: () => void }) {
  if (media.length === 0) return null
  const count = Math.min(media.length, 4)
  const gridClass = [styles.grid1, styles.grid2, styles.grid3, styles.grid4][count - 1] || styles.grid1

  return (
    <div className={`${styles.mediaGrid} ${gridClass}`} onClick={onNavigate}>
      {media.slice(0, 4).map((m) => (
        <div key={m.id} className={styles.mediaItem}>
          {isVideo(m.file_type) ? (
            <VideoPlayer src={m.file_uri} />
          ) : (
            <img src={m.file_uri} alt="" className={styles.mediaEl} loading="lazy" />
          )}
        </div>
      ))}
    </div>
  )
}

function LazyMediaGrid({ media, onNavigate }: { media: FeedPost['media']; onNavigate: () => void }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  if (media.length === 0) return null

  if (!visible) {
    return <div ref={ref} className={styles.mediaSkeleton} />
  }

  return <MediaGrid media={media} onNavigate={onNavigate} />
}

export default function PostCard({ post, onLike, onSave, onComment, onShare, onFollow }: PostCardProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUserId(getTokenPayload()?.user_id ?? null)
  }, [])
  const needsTruncation = post.content.length > CONTENT_TRUNCATE_LENGTH
  const displayContent = needsTruncation && !expanded
    ? post.content.slice(0, CONTENT_TRUNCATE_LENGTH) + '...'
    : post.content

  const navigateToPost = () => router.push(`/posts/${post.id}`)

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <Link href={`/profile/${post.user_id}`} className={styles.author} onClick={(e) => e.stopPropagation()}>
          <div className={styles.avatar}>
            {post.avatar_uri ? (
              <img src={post.avatar_uri} alt="" className={styles.avatarImg} />
            ) : (
              <i className="bx bxs-user" />
            )}
          </div>
          <div className={styles.authorMeta}>
            <span className={styles.displayName}>
              <span className={styles.displayNameText}>{post.display_name}</span>
              {!post.is_following && post.user_id !== currentUserId && (
                <button
                  className={styles.followBadge}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onFollow?.(post.user_id)
                  }}
                >
                  {t('post.follow')}
                </button>
              )}
            </span>
            <span className={styles.usernameTime}>
              @{post.username} · {formatRelativeTime(post.created_at, t)}
            </span>
          </div>
        </Link>
      </div>

      <div className={styles.body} onClick={navigateToPost}>
        {post.title && <h2 className={styles.title}>{post.title}</h2>}
        {post.content && (
          <div className={styles.content}>
            <p className={styles.text}>{displayContent}</p>
            {needsTruncation && (
              <button
                className={styles.toggleBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded((v) => !v)
                }}
              >
                {expanded ? t('post.viewLess') : t('post.viewMore')}
              </button>
            )}
          </div>
        )}
      </div>

      <LazyMediaGrid media={post.media} onNavigate={navigateToPost} />

      <div className={styles.actionBar}>
        <button
          className={`${styles.actionBtn} ${post.is_liked ? styles.liked : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onLike?.(post.id)
          }}
          aria-label={t('post.like')}
        >
          <i className={`bx ${post.is_liked ? 'bxs-heart' : 'bx-heart'}`} />
          <span>{formatCount(post.likes_count)}</span>
        </button>

        <button
          className={styles.actionBtn}
          onClick={(e) => {
            e.stopPropagation()
            onComment?.(post.id)
          }}
          aria-label={t('post.comment')}
        >
          <i className="bx bx-message-rounded" />
          <span>{formatCount(post.comments_count)}</span>
        </button>

        <button
          className={styles.actionBtn}
          onClick={(e) => {
            e.stopPropagation()
            onShare?.(post.id)
          }}
          aria-label={t('post.share')}
        >
          <i className="bx bx-share-alt" />
          <span>{formatCount(post.shares_count)}</span>
        </button>

        <button
          className={`${styles.actionBtn} ${post.is_saved ? styles.saved : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onSave?.(post.id)
          }}
          aria-label={t('post.save')}
        >
          <i className={`bx ${post.is_saved ? 'bxs-bookmark' : 'bx-bookmark'}`} />
        </button>
      </div>
    </article>
  )
}
