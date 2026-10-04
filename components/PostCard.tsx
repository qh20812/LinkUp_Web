'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ExternalImage from './ExternalImage'
import { renderPostContent } from './messages/EmojiImage'
import { emojiByCode, getEmotionEmojis } from '../utils/emojis'
import { separateGiphyUrls } from '../utils/giphy'
import styles from './PostCard.module.css'
import { useTranslation } from '../hooks/useTranslation'
import { getTokenPayload } from '../api/auth'
import { trackPostView } from '../api/posts'
import VideoPlayer from './VideoPlayer'
import ShareModal from './messages/ShareModal'
import ReportModal from './ReportModal'
import type { FeedPost } from '../types'

const EMOJI_CODE_MAP = emojiByCode(getEmotionEmojis())

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

// Ngưỡng impression chuẩn viewable (theo X/MRC cho video):
// bài hiện ≥50% trong viewport liên tục 2s mới tính 1 view.
const IMPRESSION_THRESHOLD = 0.5
const IMPRESSION_MIN_TIME_MS = 2000

/** Cắt nội dung dài, không cắt giữa URL (URL GIPHY bị cắt dở sẽ hỏng ảnh). */
export function truncateAvoidingUrl(content: string, max: number): string {
  if (content.length <= max) return content
  const cut = content.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  const tail = lastSpace === -1 ? cut : cut.slice(lastSpace + 1)
  if (tail.includes('://')) {
    return (lastSpace === -1 ? '' : cut.slice(0, lastSpace + 1)) + '...'
  }
  return cut + '...'
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

const PRIVACY_ICONS: Record<string, string> = {
  public: 'bx-globe',
  friend: 'bx-group',
  private: 'bx-lock',
}

const PRIVACY_LABELS: Record<string, string> = {
  public: 'post.privacyPublic',
  friend: 'post.privacyFriend',
  private: 'post.privacyPrivate',
}

interface PostCardProps {
  post: FeedPost
  onLike?: (postId: string) => void
  onSave?: (postId: string) => void
  onComment?: (postId: string) => void
  onShare?: (postId: string) => void
  onFollow?: (userId: string) => void
  onOpenDetail?: (postId: string) => void
}

function isVideo(fileType: string): boolean {
  return fileType.startsWith('video/')
}

function MediaItem({ m, overlay }: { m: FeedPost['media'][number]; overlay?: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false)
  const url = m.file_uri

  return (
    <div
      className={`${styles.mediaItem}${loaded ? ` ${styles.loaded}` : ''}`}
      style={{ '--media-url': `url(${url})` } as React.CSSProperties}
    >
      {isVideo(m.file_type) ? (
        <VideoPlayer src={url} />
      ) : (
        <ExternalImage src={url} alt="" className={styles.mediaEl} loading="lazy" onLoad={() => setLoaded(true)} />
      )}
      {overlay}
    </div>
  )
}

interface MediaGridProps {
  media: FeedPost['media']
  onMediaClick: () => void
  burst?: boolean
}

function MediaGrid({ media, onMediaClick, burst }: MediaGridProps) {
  // Server có thể trả media: null cho bài không có media (thay vì []) —
  // chuẩn hóa để tránh crash khi đọc .length.
  const items = media ?? []
  if (items.length === 0) return null
  const count = Math.min(items.length, 4)
  const gridClass = [styles.grid1, styles.grid2, styles.grid3, styles.grid4][count - 1] || styles.grid1
  const extraCount = items.length - 4

  return (
    <div className={`${styles.mediaGrid} ${gridClass}`} onClick={onMediaClick}>
      {items.slice(0, 4).map((m, i) => (
        <MediaItem
          key={m.id}
          m={m}
          overlay={
            i === 3 && extraCount > 0 ? (
              <div className={styles.mediaMore}>+{extraCount}</div>
            ) : undefined
          }
        />
      ))}
      {burst && (
        <span className={styles.burstHeart} aria-hidden="true">
          <i className="bxs-heart" />
        </span>
      )}
    </div>
  )
}

function LazyMediaGrid({ media, onMediaClick, burst }: { media: FeedPost['media']; onMediaClick: () => void; burst?: boolean }) {
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

  if ((media ?? []).length === 0) return null

  if (!visible) {
    return <div ref={ref} className={styles.mediaSkeleton} />
  }

  return <MediaGrid media={media} onMediaClick={onMediaClick} burst={burst} />
}

export default function PostCard({ post, onLike, onSave, onComment, onShare, onFollow, onOpenDetail }: PostCardProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [shareToFriendOpen, setShareToFriendOpen] = useState(false)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [likePop, setLikePop] = useState(false)
  const [burst, setBurst] = useState(false)
  const prevLikedRef = useRef(post.is_liked)
  const lastTapRef = useRef(0)
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cardRef = useRef<HTMLElement>(null)

  // Báo impression khi bài hiển thị đủ ngưỡng trên feed (khách vãng lai không tính).
  useEffect(() => {
    const el = cardRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (!getTokenPayload()?.user_id) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (timer === undefined) {
            timer = setTimeout(() => {
              trackPostView(post.id, 'feed')
            }, IMPRESSION_MIN_TIME_MS)
          }
        } else if (timer !== undefined) {
          clearTimeout(timer)
          timer = undefined
        }
      },
      { threshold: IMPRESSION_THRESHOLD },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [post.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUserId(getTokenPayload()?.user_id ?? null)
  }, [])

  useEffect(() => {
    if (post.is_liked && !prevLikedRef.current) {
      setLikePop(true)
      const timer = setTimeout(() => setLikePop(false), 320)
      prevLikedRef.current = post.is_liked
      return () => clearTimeout(timer)
    }
    prevLikedRef.current = post.is_liked
  }, [post.is_liked])

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!shareMenuOpen && !moreOpen) return
    const close = () => {
      setShareMenuOpen(false)
      setMoreOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('click', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [shareMenuOpen, moreOpen])

  // Tách URL GIPHY dính nhau TRƯỚC khi cắt — chuỗi liền mạch không có space
  // sẽ bị truncateAvoidingUrl trả về '...' (mất trắng nội dung).
  const repairedContent = separateGiphyUrls(post.content)
  const needsTruncation = repairedContent.length > CONTENT_TRUNCATE_LENGTH
  const displayContent = needsTruncation && !expanded
    ? truncateAvoidingUrl(repairedContent, CONTENT_TRUNCATE_LENGTH)
    : repairedContent

  const navigateToPost = () => {
    if (onOpenDetail) {
      onOpenDetail(post.id)
      return
    }
    router.push(`/posts/${post.id}`)
  }

  const isCoarsePointer = () =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

  const handleMediaClick = () => {
    if (!isCoarsePointer()) {
      navigateToPost()
      return
    }
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0
      if (navTimerRef.current) {
        clearTimeout(navTimerRef.current)
        navTimerRef.current = undefined
      }
      onLike?.(post.id)
      setBurst(true)
      setTimeout(() => setBurst(false), 600)
      return
    }
    lastTapRef.current = now
    navTimerRef.current = setTimeout(() => {
      navTimerRef.current = undefined
      navigateToPost()
    }, 280)
  }

  const isRepost = Boolean(post.shared_from_post_id && post.shared_post)
  const privacyIcon = PRIVACY_ICONS[post.status]
  const privacyLabelKey = PRIVACY_LABELS[post.status]
  const isOwn = post.user_id === currentUserId

  return (
    <article ref={cardRef} className={styles.card}>
      <div className={styles.header}>
        <Link href={`/profile/${post.user_id}`} className={styles.author} onClick={(e) => e.stopPropagation()}>
          <div className={styles.avatar}>
            {post.avatar_uri ? (
              <ExternalImage src={post.avatar_uri} alt="" className={styles.avatarImg} />
            ) : (
              <i className="bx bxs-user" />
            )}
          </div>
          <div className={styles.authorMeta}>
            <span className={styles.displayName}>
              <span className={styles.displayNameText}>{post.display_name}</span>
              {post.is_pinned && (
                <span className={styles.pinBadge}>
                  <i className="bx bx-pin" />
                  {t('post.pinned')}
                </span>
              )}
              {isRepost && <span className={styles.repostLabel}>{t('post.sharedPost')}</span>}
              {!isOwn && (post.is_following ? (
                <span className={styles.followingBadge}>{t('post.following')}</span>
              ) : (
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
              ))}
            </span>
            <span className={styles.usernameTime} title={new Date(post.created_at).toLocaleString()}>
              @{post.username} · {formatRelativeTime(post.created_at, t)}
              {privacyIcon && privacyLabelKey && (
                <i className={`bx ${privacyIcon} ${styles.privacyIcon}`} title={t(privacyLabelKey)} />
              )}
            </span>
          </div>
        </Link>
        {!isOwn && (
          <div className={styles.moreWrap}>
            <button
              type="button"
              className={styles.moreBtn}
              onClick={(e) => {
                e.stopPropagation()
                setMoreOpen((v) => !v)
              }}
              aria-label={t('common.more')}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
            >
              <i className="bx bx-dots-horizontal-rounded" />
            </button>
            {moreOpen && (
              <div className={styles.moreMenu} role="menu" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.moreItem}
                  onClick={() => {
                    setMoreOpen(false)
                    setReportOpen(true)
                  }}
                >
                  <i className="bx bx-flag" />
                  <span>{t('report.menuReport')}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className={styles.body}
        role="button"
        tabIndex={0}
        onClick={navigateToPost}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigateToPost()
          }
        }}
      >
        {isRepost && post.share_content && (
          <p className={styles.shareContent}>
            {renderPostContent(post.share_content, EMOJI_CODE_MAP, `sc-${post.id}`, styles.textEmoji, styles.hashtag)}
          </p>
        )}
        {isRepost && post.shared_post ? (
          <div className={styles.embeddedPost}>
            <div className={styles.embeddedHeader}>
              <Link href={`/profile/${post.shared_post.user_id}`} className={styles.embeddedAuthor} onClick={(e) => e.stopPropagation()}>
                <div className={styles.embeddedAvatar}>
                  {post.shared_post.avatar_uri ? (
                    <ExternalImage src={post.shared_post.avatar_uri} alt="" className={styles.avatarImg} />
                  ) : (
                    <i className="bx bxs-user" />
                  )}
                </div>
                <div className={styles.embeddedAuthorMeta}>
                  <span className={styles.embeddedName}>{post.shared_post.display_name}</span>
                  <span className={styles.embeddedUsername}>@{post.shared_post.username}</span>
                </div>
              </Link>
            </div>
            {post.shared_post.title && <h2 className={styles.title}>{post.shared_post.title}</h2>}
            {post.shared_post.content && (
              <p className={styles.text}>
                {renderPostContent(
                  truncateAvoidingUrl(separateGiphyUrls(post.shared_post.content), CONTENT_TRUNCATE_LENGTH),
                  EMOJI_CODE_MAP, `spc-${post.shared_post.id}`, styles.textEmoji, styles.hashtag
                )}
              </p>
            )}
            {(post.shared_post.media ?? []).length > 0 && (
              <MediaGrid media={post.shared_post.media} onMediaClick={navigateToPost} />
            )}
          </div>
        ) : (
          <>
            {post.title && <h2 className={styles.title}>{post.title}</h2>}
            {post.content && (
              <div className={styles.content}>
                <p className={styles.text}>
                  {renderPostContent(displayContent, EMOJI_CODE_MAP, `pc-${post.id}`, styles.textEmoji, styles.hashtag)}
                </p>
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
            {!post.title && !post.content && (post.media ?? []).length === 0 && (
              <p className={styles.emptyBody}>{t('post.noContent')}</p>
            )}
          </>
        )}
      </div>

      {!isRepost && <LazyMediaGrid media={post.media} onMediaClick={handleMediaClick} burst={burst} />}

      <div className={styles.actionBar}>
        <div className={styles.actionCluster}>
          <button
            className={`${styles.actionBtn} ${post.is_liked ? styles.liked : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onLike?.(post.id)
            }}
            aria-label={t('post.like')}
            aria-pressed={post.is_liked}
          >
            <i className={`bx ${post.is_liked ? 'bxs-heart' : 'bx-heart'}${likePop ? ` ${styles.likePopIcon}` : ''}`} />
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

          <div className={styles.shareWrap}>
            <button
              className={styles.actionBtn}
              onClick={(e) => {
                e.stopPropagation()
                setShareMenuOpen((v) => !v)
              }}
              aria-label={t('post.share')}
              aria-haspopup="menu"
              aria-expanded={shareMenuOpen}
              disabled={isOwn}
            >
              <i className="bx bx-share-alt" />
              <span>{formatCount(post.shares_count)}</span>
            </button>
            {shareMenuOpen && (
              <div className={styles.shareMenu} role="menu" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.shareMenuItem}
                  onClick={() => {
                    setShareMenuOpen(false)
                    onShare?.(post.id)
                  }}
                >
                  <i className="bx bx-share-alt" />
                  <span>{t('post.sharePost')}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.shareMenuItem}
                  onClick={() => {
                    setShareMenuOpen(false)
                    setShareToFriendOpen(true)
                  }}
                >
                  <i className="bx bx-message-rounded-detail" />
                  <span>{t('post.shareToFriend')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={`${styles.actionCluster} ${styles.clusterRight}`}>
          {isOwn ? (
            <span
              className={styles.viewStat}
              role="img"
              aria-label={t('post.viewCount', { count: post.views_count })}
            >
              <i className="bx bx-show" aria-hidden="true" />
              <span>{formatCount(post.views_count)}</span>
            </span>
          ) : (
            <button
              className={`${styles.actionBtn} ${post.is_saved ? styles.saved : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onSave?.(post.id)
              }}
              aria-label={post.is_saved ? t('post.saved') : t('post.save')}
              aria-pressed={post.is_saved}
            >
              <i className={`bx ${post.is_saved ? 'bxs-bookmark' : 'bx-bookmark'}`} />
            </button>
          )}
        </div>
      </div>

      <ShareModal
        open={shareToFriendOpen}
        onClose={() => setShareToFriendOpen(false)}
        postId={post.id}
      />
      <ReportModal
        open={reportOpen}
        targetType="post"
        targetId={post.id}
        onClose={() => setReportOpen(false)}
      />
    </article>
  )
}
