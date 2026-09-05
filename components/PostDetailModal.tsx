'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import ExternalImage from './ExternalImage'
import { renderEmojiContent } from './messages/EmojiImage'
import { emojiByCode, getEmotionEmojis } from '../utils/emojis'
import styles from './PostDetailModal.module.css'
import { useTranslation } from '../hooks/useTranslation'
import { useToast } from '../contexts/ToastContext'
import { getTokenPayload } from '../api/auth'
import {
  getPostDetail,
  getComments,
  createComment,
  reactPost,
  toggleCommentReaction,
  savePost,
  sharePost,
  deletePost,
  getEmojis,
} from '../api/posts'
import VideoPlayer from './VideoPlayer'
import ShareModal from './messages/ShareModal'
import type { FeedPost, CommentItem, EmojiItem } from '../types'

const COMMENT_PAGE_SIZE = 10
const EMOJI_CODE_MAP = emojiByCode(getEmotionEmojis())

let likeEmojiIdPromise: Promise<string | undefined> | undefined

function ensureLikeEmojiId(): Promise<string | undefined> {
  likeEmojiIdPromise ??= (async () => {
    try {
      const res = await getEmojis()
      const emoji = res.data.find((e: EmojiItem) => e.code === ':like:')
      return emoji ? emoji.id : undefined
    } catch {
      return undefined
    }
  })()
  return likeEmojiIdPromise
}

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

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

function isVideo(fileType: string): boolean {
  return fileType.startsWith('video/')
}

interface CommentNode {
  comment: CommentItem
  replies: CommentNode[]
}

function buildCommentTree(comments: CommentItem[], sort: string): CommentNode[] {
  const byId = new Map<string, CommentItem>(comments.map((c) => [c.id, c]))

  const rootOf = (id: string): string => {
    const visited = new Set<string>()
    let currentId = id
    while (currentId && byId.has(currentId) && !visited.has(currentId)) {
      visited.add(currentId)
      const parentId = byId.get(currentId)!.parent_id
      if (!parentId || !byId.has(parentId)) return currentId
      currentId = parentId
    }
    return currentId
  }

  const nodes = new Map<string, CommentNode>()
  for (const c of comments) nodes.set(c.id, { comment: c, replies: [] })

  const roots: CommentNode[] = []
  for (const c of comments) {
    const node = nodes.get(c.id)!
    const rootId = c.parent_id ? rootOf(c.id) : c.id
    if (rootId !== c.id) {
      nodes.get(rootId)!.replies.push(node)
    } else {
      roots.push(node)
    }
  }

  if (sort === 'newest') {
    roots.sort(
      (a, b) => new Date(b.comment.created_at).getTime() - new Date(a.comment.created_at).getTime(),
    )
  } else if (sort === 'oldest') {
    roots.sort(
      (a, b) => new Date(a.comment.created_at).getTime() - new Date(b.comment.created_at).getTime(),
    )
  }

  for (const root of roots) {
    root.replies.sort(
      (a, b) => new Date(a.comment.created_at).getTime() - new Date(b.comment.created_at).getTime(),
    )
  }

  return roots
}

interface PostDetailModalProps {
  post: FeedPost
  open: boolean
  onClose: () => void
  onUpdated?: (post: FeedPost) => void
  onDeleted?: (postId: string) => void
}

export default function PostDetailModal({ post, open, onClose, onUpdated, onDeleted }: PostDetailModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [current, setCurrent] = useState<FeedPost>(post)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentPage, setCommentPage] = useState(1)
  const [commentTotal, setCommentTotal] = useState(0)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<CommentItem | null>(null)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [commentSort, setCommentSort] = useState<'newest' | 'oldest' | 'relevant'>('newest')
  const [shareOpen, setShareOpen] = useState(false)
  const [shareText, setShareText] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareToFriendOpen, setShareToFriendOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [mediaIndex, setMediaIndex] = useState(0)
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const [videoFrame, setVideoFrame] = useState<string | null>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUserId(getTokenPayload()?.user_id ?? null)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMediaIndex(0)
    getComments(post.id, 1, COMMENT_PAGE_SIZE, 'newest')
      .then((res) => {
        setComments(res.data)
        setCommentTotal(res.total)
      })
      .catch(() => {})

    getPostDetail(post.id)
      .then((res) => {
        setCurrent((c) => {
          if (!c) return res.data
          return {
            ...c,
            ...res.data,
            avatar_uri: res.data.avatar_uri || c.avatar_uri,
            display_name: res.data.display_name || c.display_name,
            username: res.data.username || c.username,
            is_liked: c.is_liked,
            is_saved: c.is_saved,
            is_shared: c.is_shared,
            is_following: c.is_following,
          }
        })
      })
      .catch(() => {})
  }, [post.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMediaLoaded(false)
    setVideoFrame(null)
  }, [mediaIndex, post.id])

  useEffect(() => {
    if (current.media.length === 0) return
    const safeIndex = Math.min(mediaIndex, current.media.length - 1)
    const m = current.media[safeIndex]
    if (!isVideo(m.file_type)) return

    const video = document.createElement('video')
    video.src = m.file_uri
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.currentTime = 1
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 72
      canvas.getContext('2d')?.drawImage(video, 0, 0, 128, 72)
      setVideoFrame(canvas.toDataURL('image/jpeg', 0.4))
      video.remove()
    }
  }, [mediaIndex, current.media])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.documentElement.style.overflow = prevHtmlOverflow
    }
  }, [open, onClose])

  const loadMoreComments = useCallback(async () => {
    const nextPage = commentPage + 1
    setCommentsLoading(true)
    try {
      const res = await getComments(current.id, nextPage, COMMENT_PAGE_SIZE, commentSort)
      setComments((prev) => [...prev, ...res.data])
      setCommentPage(nextPage)
      setCommentTotal(res.total)
    } catch {
      // keep existing list
    } finally {
      setCommentsLoading(false)
    }
  }, [commentPage, current, commentSort])

  const handleSortChange = useCallback(
    (sort: 'newest' | 'oldest' | 'relevant') => {
      setCommentSort(sort)
      setComments([])
      setCommentPage(1)
      setCommentsLoading(true)
      getComments(current.id, 1, COMMENT_PAGE_SIZE, sort)
        .then((res) => {
          setComments(res.data)
          setCommentTotal(res.total)
        })
        .catch(() => {})
        .finally(() => setCommentsLoading(false))
    },
    [current],
  )

  const handleToggleCommentLike = useCallback(
    async (commentId: string) => {
      if (!currentUserId) return
      const emojiId = await ensureLikeEmojiId()
      if (!emojiId) return

      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, is_liked: !c.is_liked, likes_count: c.is_liked ? c.likes_count - 1 : c.likes_count + 1 }
            : c,
        ),
      )

      try {
        await toggleCommentReaction(commentId, emojiId)
      } catch {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, is_liked: !c.is_liked, likes_count: c.is_liked ? c.likes_count - 1 : c.likes_count + 1 }
              : c,
          ),
        )
      }
    },
    [currentUserId],
  )

  const handleLike = async () => {
    if (!current) return
    const emojiId = await ensureLikeEmojiId()
    if (!emojiId) return
    const prev = current
    const next = {
      ...current,
      is_liked: !current.is_liked,
      likes_count: current.likes_count + (current.is_liked ? -1 : 1),
    }
    setCurrent(next)
    onUpdated?.(next)
    try {
      await reactPost(current.id, emojiId)
    } catch {
      setCurrent(prev)
      onUpdated?.(prev)
    }
  }

  const handleSave = async () => {
    if (!current) return
    const prev = current
    const next = { ...current, is_saved: !current.is_saved }
    setCurrent(next)
    onUpdated?.(next)
    try {
      await savePost(current.id)
    } catch (e) {
      setCurrent(prev)
      onUpdated?.(prev)
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  const handleSubmitComment = async () => {
    const content = commentText.trim()
    if (!content || !current || submittingComment) return
    setSubmittingComment(true)
    try {
      const res = await createComment(current.id, content, replyingTo?.id)
      setComments(res.data)
      setCommentTotal(res.data.length)
      setCommentPage(1)
      setCommentText('')
      setReplyingTo(null)
      const next = { ...current, comments_count: res.data.length }
      setCurrent(next)
      onUpdated?.(next)
      toast({ type: 'success', title: t('postDetail.commentPosted') })
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleShare = async () => {
    if (!current || sharing) return
    setSharing(true)
    try {
      await sharePost(current.id, shareText.trim())
      const next = { ...current, shares_count: current.shares_count + 1, is_shared: true }
      setCurrent(next)
      onUpdated?.(next)
      setShareOpen(false)
      setShareText('')
      toast({ type: 'success', title: t('postDetail.shared') })
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSharing(false)
    }
  }

  const handleDelete = async () => {
    if (!current || deleting) return
    if (!window.confirm(t('postDetail.deleteConfirm'))) return
    setDeleting(true)
    setMenuOpen(false)
    try {
      await deletePost(current.id)
      toast({ type: 'success', title: t('postDetail.deleted') })
      onDeleted?.(current.id)
      onClose()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setDeleting(false)
    }
  }

  if (!open || !current) return null

  const hasMedia = current.media.length > 0

  const isOwner = currentUserId !== null && current.user_id === currentUserId

  const commentTree = buildCommentTree(comments, commentSort)

  const renderComment = (node: CommentNode): React.ReactNode => (
    <div key={node.comment.id} className={styles.commentItem}>
      <div className={styles.commentHead}>
        <div className={styles.commentAvatar}>
          {node.comment.avatar_uri ? (
            <ExternalImage src={node.comment.avatar_uri} alt="" />
          ) : (
            <i className="bx bxs-user" />
          )}
        </div>
        <span className={styles.commentAuthor}>{node.comment.display_name}</span>
        {current.user_id === node.comment.user_id && (
          <span className={styles.postAuthorBadge}>{t('postDetail.postAuthorBadge')}</span>
        )}
        <span className={styles.commentTime}>{formatRelativeTime(node.comment.created_at, t)}</span>
      </div>
      <p className={styles.commentContent}>
        {node.comment.parent_id && (() => {
          const parentComment = comments.find((x) => x.id === node.comment.parent_id)
          return parentComment ? (
            <span className={styles.mention}>@{parentComment.display_name}</span>
          ) : null
        })()}
        {node.comment.content}
      </p>
      <div className={styles.commentActions}>
        <button
          type="button"
          className={`${styles.commentLikeBtn} ${node.comment.is_liked ? styles.commentLikeActive : ''}`}
          onClick={() => handleToggleCommentLike(node.comment.id)}
        >
          <i className={`bx ${node.comment.is_liked ? 'bxs-heart' : 'bx-heart'}`} />
          {node.comment.likes_count > 0 && <span>{formatCount(node.comment.likes_count)}</span>}
        </button>
        <button
          type="button"
          className={styles.replyBtn}
          onClick={() => {
            setReplyingTo((cur) => (cur?.id === node.comment.id ? null : node.comment))
            commentInputRef.current?.focus()
          }}
        >
          {t('postDetail.reply')}
        </button>
      </div>
      {node.replies.length > 0 && (
        <div className={styles.commentReplies}>{node.replies.map(renderComment)}</div>
      )}
    </div>
  )

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.grid}>
          {hasMedia && (
            <div className={styles.mediaPane}>
              <div className={styles.mediaStage}>
                {(() => {
                  const mediaCount = current.media.length
                  const safeIndex = Math.min(mediaIndex, mediaCount - 1)
                  const m = current.media[safeIndex]
                  const blurUrl = isVideo(m.file_type)
                    ? (videoFrame ? `url(${videoFrame})` : 'none')
                    : `url(${m.file_uri})`
                  const itemClass = `${styles.mediaItem}${mediaLoaded ? ` ${styles.loaded}` : ''}`
                  const itemStyle = { '--media-url': blurUrl } as React.CSSProperties
                  return isVideo(m.file_type) ? (
                    <div key={m.id} className={`${itemClass} ${styles.videoWrap}`} style={itemStyle}>
                      <VideoPlayer src={m.file_uri} />
                    </div>
                  ) : (
                    <div key={m.id} className={itemClass} style={itemStyle}>
                      <ExternalImage src={m.file_uri} alt="" onLoad={() => setMediaLoaded(true)} />
                    </div>
                  )
                })()}
              </div>
              {current.media.length > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.navBtn} ${styles.navPrev}`}
                    onClick={() => setMediaIndex((i) => (i - 1 + current.media.length) % current.media.length)}
                    aria-label="Previous media"
                  >
                    <i className="bx bx-chevron-left" />
                  </button>
                  <button
                    type="button"
                    className={`${styles.navBtn} ${styles.navNext}`}
                    onClick={() => setMediaIndex((i) => (i + 1) % current.media.length)}
                    aria-label="Next media"
                  >
                    <i className="bx bx-chevron-right" />
                  </button>
                  <span className={styles.mediaCounter}>
                    {Math.min(mediaIndex, current.media.length - 1) + 1} / {current.media.length}
                  </span>
                </>
              )}
            </div>
          )}

          <div className={`${styles.contentPane}${hasMedia ? ` ${styles.contentPaneSplit}` : ''}`}>
            <div className={styles.header}>
              <Link href={`/profile/${current.user_id}`} className={styles.author}>
                <div className={styles.avatar}>
                  {current.avatar_uri ? (
                    <ExternalImage src={current.avatar_uri} alt="" className={styles.avatarImg} />
                  ) : (
                    <i className="bx bxs-user" />
                  )}
                </div>
                <div className={styles.authorMeta}>
                  <span className={styles.displayName}>{current.display_name}</span>
                  <span className={styles.usernameTime}>
                    @{current.username} · {formatRelativeTime(current.created_at, t)}
                  </span>
                </div>
              </Link>

              {isOwner && (
                <div className={styles.moreWrap}>
                  <button
                    type="button"
                    className={styles.moreBtn}
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="More"
                  >
                    <i className="bx bx-dots-horizontal-rounded" />
                  </button>
                  {menuOpen && (
                    <div className={styles.moreMenu}>
                      <button type="button" className={styles.moreItem} onClick={handleDelete} disabled={deleting}>
                        <i className="bx bx-trash" />
                        <span>{t('postDetail.delete')}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
                <i className="bx bx-x" />
              </button>
            </div>

            <div className={styles.body}>
              {current.shared_from_post_id && current.shared_post && (
                current.share_content && (
                  <p className={styles.text} style={{ marginBottom: 10 }}>
                    {renderEmojiContent(current.share_content, EMOJI_CODE_MAP, `psc-${current.id}`, styles.textEmoji)}
                  </p>
                )
              )}
              {current.shared_from_post_id && current.shared_post ? (
                <div className={styles.embeddedPost}>
                  <Link href={`/profile/${current.shared_post.user_id}`} className={styles.embeddedAuthor} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.embeddedAvatar}>
                      {current.shared_post.avatar_uri ? (
                        <ExternalImage src={current.shared_post.avatar_uri} alt="" />
                      ) : (
                        <i className="bx bxs-user" />
                      )}
                    </div>
                    <div className={styles.embeddedAuthorMeta}>
                      <span className={styles.embeddedName}>{current.shared_post.display_name}</span>
                      <span className={styles.embeddedUsername}>@{current.shared_post.username}</span>
                    </div>
                  </Link>
                  {current.shared_post.title && <h2 className={styles.title}>{current.shared_post.title}</h2>}
                  {current.shared_post.content && (
                    <p className={styles.text}>
                      {renderEmojiContent(current.shared_post.content, EMOJI_CODE_MAP, `spd-${current.shared_post.id}`, styles.textEmoji)}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {current.title && <h2 className={styles.title}>{current.title}</h2>}
                  {current.content && (
                    <p className={styles.text}>
                      {renderEmojiContent(current.content, EMOJI_CODE_MAP, `pd-${current.id}`, styles.textEmoji)}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className={styles.stats}>
              <span>{t('postDetail.viewCount', { count: formatCount(current.views_count) })}</span>
              <span>{t('postDetail.commentCount', { count: formatCount(current.comments_count) })}</span>
            </div>

            <div className={styles.actionBar}>
              <button
                type="button"
                className={`${styles.actionBtn} ${current.is_liked ? styles.liked : ''}`}
                onClick={handleLike}
              >
                <i className={`bx ${current.is_liked ? 'bxs-heart' : 'bx-heart'}`} />
                <span>{formatCount(current.likes_count)}</span>
              </button>

              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => commentInputRef.current?.focus()}
              >
                <i className="bx bx-message-rounded" />
                <span>{formatCount(current.comments_count)}</span>
              </button>

              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => setShareOpen((v) => !v)}
                disabled={isOwner || current.is_shared}
              >
                <i className="bx bx-share-alt" />
                <span>{formatCount(current.shares_count)}</span>
              </button>

              <button
                type="button"
                className={`${styles.actionBtn} ${current.is_saved ? styles.saved : ''}`}
                onClick={handleSave}
                disabled={isOwner}
              >
                <i className={`bx ${current.is_saved ? 'bxs-bookmark' : 'bx-bookmark'}`} />
              </button>

              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => setShareToFriendOpen(true)}
                disabled={isOwner}
                title={t('post.shareToFriend')}
              >
                <i className="bx bx-message-rounded-detail" />
              </button>
            </div>

            {shareOpen && (
              <div className={styles.shareBox}>
                <textarea
                  className={styles.shareInput}
                  value={shareText}
                  onChange={(e) => setShareText(e.target.value)}
                  rows={2}
                  placeholder={t('postDetail.sharePlaceholder')}
                />
                <div className={styles.shareActions}>
                  <button type="button" className={styles.shareCancel} onClick={() => setShareOpen(false)}>
                    {t('postDetail.cancel')}
                  </button>
                  <button type="button" className={styles.shareSubmit} onClick={handleShare} disabled={sharing}>
                    {sharing && <i className="bx bx-loader-circle bx-spin" />}
                    <span>{t('postDetail.shareButton')}</span>
                  </button>
                </div>
              </div>
            )}

            <div className={styles.commentsSection}>
              <div className={styles.commentsHeader}>
                <span>{t('postDetail.comments')}</span>
                <div className={styles.commentSort}>
                  <button
                    type="button"
                    className={`${styles.commentSortBtn} ${commentSort === 'newest' ? styles.commentSortActive : ''}`}
                    onClick={() => handleSortChange('newest')}
                  >
                    {t('postDetail.sortNewest')}
                  </button>
                  <button
                    type="button"
                    className={`${styles.commentSortBtn} ${commentSort === 'oldest' ? styles.commentSortActive : ''}`}
                    onClick={() => handleSortChange('oldest')}
                  >
                    {t('postDetail.sortOldest')}
                  </button>
                  <button
                    type="button"
                    className={`${styles.commentSortBtn} ${commentSort === 'relevant' ? styles.commentSortActive : ''}`}
                    onClick={() => handleSortChange('relevant')}
                  >
                    {t('postDetail.sortRelevant')}
                  </button>
                </div>
              </div>
              <div className={styles.commentsList}>
                {comments.length === 0 && !commentsLoading && (
                  <div className={styles.noComments}>{t('postDetail.noComments')}</div>
                )}
                {commentTree.map(renderComment)}
                {comments.length > 0 && comments.length < commentTotal && (
                  <div className={styles.loadMoreWrap}>
                    <button type="button" className={styles.loadMoreBtn} onClick={loadMoreComments}>
                      {t('postDetail.loadMore')}
                    </button>
                  </div>
                )}
                {commentsLoading && (
                  <div className={styles.commentsLoading}>
                    <i className="bx bx-loader-circle bx-spin" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.commentForm}>
          {replyingTo && (
            <div className={styles.replyChip}>
              <span>
                {t('postDetail.replyingTo')} @{replyingTo.username}
              </span>
              <button
                type="button"
                className={styles.cancelReplyBtn}
                onClick={() => setReplyingTo(null)}
                aria-label={t('postDetail.cancelReply')}
              >
                <i className="bx bx-x" />
              </button>
            </div>
          )}
          <div className={styles.commentInputRow}>
            <input
              ref={commentInputRef}
              className={styles.commentInput}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmitComment()
                }
              }}
              placeholder={t('postDetail.commentPlaceholder')}
            />
            <button
              type="button"
              className={styles.commentSubmit}
              onClick={handleSubmitComment}
              disabled={submittingComment || commentText.trim() === ''}
              aria-label={t('postDetail.commentButton')}
            >
              {submittingComment ? (
                <i className="bx bx-loader-circle bx-spin" />
              ) : (
                <i className="bx bx-send" />
              )}
            </button>
          </div>
        </div>
      </div>
      {current && (
        <ShareModal
          open={shareToFriendOpen}
          onClose={() => setShareToFriendOpen(false)}
          postId={current.id}
        />
      )}
    </div>
  )
}
