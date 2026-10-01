'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import ExternalImage from './ExternalImage'
import { renderPostContent } from './messages/EmojiImage'
import { emojiByCode, getEmotionEmojis } from '../utils/emojis'
import styles from './PostDetailModal.module.css'
import { useTranslation } from '../hooks/useTranslation'
import { useToast } from '../contexts/ToastContext'
import { useFollowContext } from '../contexts/FollowContext'
import { getTokenPayload } from '../api/auth'
import { request } from '../api/api'
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
  setCommentsEnabled,
} from '../api/posts'
import VideoPlayer from './VideoPlayer'
import ShareModal from './messages/ShareModal'
import type { FeedPost, CommentItem, EmojiItem, ViewProfileResponse } from '../types'

const COMMENT_PAGE_SIZE = 10
const COMMENT_MAX_LENGTH = 1000
const COMMENT_COUNTER_START = 900
const EMOJI_CODE_MAP = emojiByCode(getEmotionEmojis())

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

function runeLength(text: string): number {
  return Array.from(text).length
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
  initialShareOpen?: boolean
}

// Server có thể trả media: null cho bài không có media (thay vì []) —
// chuẩn hóa ngay tại state để mọi chỗ đọc current.media đều an toàn.
function withMedia(post: FeedPost): FeedPost {
  if (post.media) return post
  return { ...post, media: [] }
}

export default function PostDetailModal({
  post,
  open,
  onClose,
  onUpdated,
  onDeleted,
  initialShareOpen,
}: PostDetailModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { followUser: ctxFollowUser, unfollowUser: ctxUnfollowUser } = useFollowContext()
  const [current, setCurrent] = useState<FeedPost>(() => withMedia(post))
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentPage, setCommentPage] = useState(1)
  const [commentTotal, setCommentTotal] = useState(0)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<CommentItem | null>(null)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [commentSort, setCommentSort] = useState<'newest' | 'oldest' | 'relevant'>('newest')
  const [shareOpen, setShareOpen] = useState(() => !!initialShareOpen)
  const [shareText, setShareText] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareToFriendOpen, setShareToFriendOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [togglingComments, setTogglingComments] = useState(false)
  const [mediaIndex, setMediaIndex] = useState(0)
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const [videoFrame, setVideoFrame] = useState<string | null>(null)
  const [likePop, setLikePop] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)
  const shareInputRef = useRef<HTMLTextAreaElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const commentsRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const pushedRef = useRef(false)
  const confirmRef = useRef(false)
  const prevLikedRef = useRef(post.is_liked)
  const touchStartXRef = useRef<number | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    onCloseRef.current = onClose
    confirmRef.current = confirmDelete
  }, [onClose, confirmDelete])

  const requestClose = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false
      window.history.back()
    }
    onCloseRef.current()
  }, [])

  const { data: myProfile } = useSWR<ViewProfileResponse>(
    open ? '/profile' : null,
    (key: string) => request<ViewProfileResponse>(key),
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  )

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
          if (!c) return withMedia(res.data)
          return {
            ...c,
            ...res.data,
            media: res.data.media ?? c.media ?? [],
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
    returnFocusRef.current = document.activeElement as HTMLElement | null

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmRef.current) {
          setConfirmDelete(false)
          return
        }
        requestClose()
        return
      }
      if (e.key === 'Tab' && modalRef.current) {
        const nodes = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (nodes.length === 0) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        const active = document.activeElement
        if (e.shiftKey && (active === first || !modalRef.current.contains(active))) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
        return
      }
      const target = e.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      if (typing || current.media.length < 2) return
      if (e.key === 'ArrowLeft') setMediaIndex((i) => (i - 1 + current.media.length) % current.media.length)
      if (e.key === 'ArrowRight') setMediaIndex((i) => (i + 1) % current.media.length)
    }
    document.addEventListener('keydown', handleKey)
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    const focusTimer = setTimeout(() => {
      modalRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }, 50)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.documentElement.style.overflow = prevHtmlOverflow
      clearTimeout(focusTimer)
      returnFocusRef.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const here = window.location.pathname
    const target = `/posts/${post.id}`
    if (here !== target) {
      window.history.pushState({ linkupPostModal: true }, '', target)
      pushedRef.current = true
    }
    const onPop = () => {
      pushedRef.current = false
      onCloseRef.current()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [open, post.id])

  useEffect(() => {
    if (current.is_liked && !prevLikedRef.current) {
      setLikePop(true)
      const timer = setTimeout(() => setLikePop(false), 320)
      prevLikedRef.current = current.is_liked
      return () => clearTimeout(timer)
    }
    prevLikedRef.current = current.is_liked
  }, [current.is_liked])

  useEffect(() => {
    if (!shareOpen) return
    const timer = setTimeout(() => shareInputRef.current?.focus(), 30)
    return () => clearTimeout(timer)
  }, [shareOpen])

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('click', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const loadMoreComments = useCallback(async () => {
    const nextPage = commentPage + 1
    setCommentsLoading(true)
    try {
      const res = await getComments(current.id, nextPage, COMMENT_PAGE_SIZE, commentSort)
      setComments((prev) => {
        const seen = new Set(prev.map((c) => c.id))
        return [...prev, ...res.data.filter((c) => !seen.has(c.id))]
      })
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
    if (!emojiId) {
      toast({ type: 'error', title: t('post.likeFailed') })
      return
    }
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
    if (runeLength(content) > COMMENT_MAX_LENGTH) return
    setSubmittingComment(true)
    try {
      const res = await createComment(current.id, content, replyingTo?.id)
      const existingIds = new Set(comments.map((c) => c.id))
      const created = res.data.find((c) => !existingIds.has(c.id))
      if (created) {
        setComments((prev) => [created, ...prev])
        setCommentTotal((prev) => prev + 1)
        setHighlightId(created.id)
        setTimeout(() => setHighlightId(null), 1500)
      }
      const next = { ...current, comments_count: current.comments_count + 1 }
      setCurrent(next)
      onUpdated?.(next)
      setCommentText('')
      setReplyingTo(null)
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
    setConfirmDelete(false)
    setDeleting(true)
    setMenuOpen(false)
    try {
      await deletePost(current.id)
      toast({ type: 'success', title: t('postDetail.deleted') })
      onDeleted?.(current.id)
      requestClose()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleComments = async () => {
    if (!current || togglingComments) return
    setTogglingComments(true)
    setMenuOpen(false)
    const prev = current
    const next = { ...current, comments_enabled: !current.comments_enabled }
    setCurrent(next)
    onUpdated?.(next)
    try {
      const res = await setCommentsEnabled(prev.id, next.comments_enabled)
      const remote = res.data
      const merged = { ...next, comments_enabled: remote.comments_enabled }
      setCurrent(merged)
      onUpdated?.(merged)
      toast({
        type: 'success',
        title: merged.comments_enabled ? t('postDetail.commentsEnabledToast') : t('postDetail.commentsDisabledToast'),
      })
    } catch (e) {
      setCurrent(prev)
      onUpdated?.(prev)
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setTogglingComments(false)
    }
  }

  const handleCopyLink = async () => {
    setMenuOpen(false)
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${current.id}`)
      toast({ type: 'success', title: t('post.linkCopied') })
    } catch {
      toast({ type: 'error', title: t('common.error') })
    }
  }

  const handleFollowToggle = async () => {
    if (!current || isOwner) return
    const prev = current
    const next = { ...current, is_following: !current.is_following }
    setCurrent(next)
    onUpdated?.(next)
    try {
      if (prev.is_following) await ctxUnfollowUser(current.user_id)
      else await ctxFollowUser(current.user_id)
    } catch (e) {
      setCurrent(prev)
      onUpdated?.(prev)
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  const handleReply = (c: CommentItem) => {
    setReplyingTo((cur) => (cur?.id === c.id ? null : c))
    if (replyingTo?.id !== c.id) {
      setHighlightId(c.id)
      setTimeout(() => setHighlightId(null), 1500)
      requestAnimationFrame(() => {
        const el = commentsRef.current?.querySelector<HTMLElement>(`[data-comment-id="${c.id}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
    commentInputRef.current?.focus()
  }

  const scrollToComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartXRef.current
    touchStartXRef.current = null
    if (Math.abs(delta) < 50 || current.media.length < 2) return
    if (delta > 0) setMediaIndex((i) => (i - 1 + current.media.length) % current.media.length)
    else setMediaIndex((i) => (i + 1) % current.media.length)
  }

  if (!open || !current) return null

  const hasMedia = current.media.length > 0
  const isOwner = currentUserId !== null && current.user_id === currentUserId
  const commentTree = buildCommentTree(comments, commentSort)
  const commentRuneLen = runeLength(commentText)
  const overLimit = commentRuneLen > COMMENT_MAX_LENGTH
  const privacyIcon = PRIVACY_ICONS[current.status]
  const privacyLabelKey = PRIVACY_LABELS[current.status]
  const safeMediaIndex = Math.min(mediaIndex, Math.max(current.media.length - 1, 0))

  const renderComment = (node: CommentNode): React.ReactNode => (
    <div
      key={node.comment.id}
      data-comment-id={node.comment.id}
      className={`${styles.commentItem}${highlightId === node.comment.id ? ` ${styles.commentHighlight}` : ''}`}
    >
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
          aria-pressed={node.comment.is_liked}
        >
          <i className={`bx ${node.comment.is_liked ? 'bxs-heart' : 'bx-heart'}`} />
          {node.comment.likes_count > 0 && <span>{formatCount(node.comment.likes_count)}</span>}
        </button>
        {current.comments_enabled && (
          <button
            type="button"
            className={styles.replyBtn}
            onClick={() => handleReply(node.comment)}
          >
            {t('postDetail.reply')}
          </button>
        )}
      </div>
      {node.replies.length > 0 && (
        <div className={styles.commentReplies}>{node.replies.map(renderComment)}</div>
      )}
    </div>
  )

  return (
    <div className={styles.overlay} onClick={requestClose}>
      <div
        className={`${styles.modal}${hasMedia ? '' : ` ${styles.modalNoMedia}`}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('postDetail.dialogLabel')}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${styles.grid}${hasMedia ? '' : ` ${styles.gridNoMedia}`}`}>
          {hasMedia && (
            <div
              className={styles.mediaPane}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className={styles.mediaStage}>
                {(() => {
                  const m = current.media[safeMediaIndex]
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
                    aria-label={t('postDetail.prevMedia')}
                  >
                    <i className="bx bx-chevron-left" />
                  </button>
                  <button
                    type="button"
                    className={`${styles.navBtn} ${styles.navNext}`}
                    onClick={() => setMediaIndex((i) => (i + 1) % current.media.length)}
                    aria-label={t('postDetail.nextMedia')}
                  >
                    <i className="bx bx-chevron-right" />
                  </button>
                  <span className={styles.mediaCounter}>
                    {safeMediaIndex + 1} / {current.media.length}
                  </span>
                  {current.media.length <= 10 && (
                    <div className={styles.mediaDots}>
                      {current.media.map((m, i) => (
                        <button
                          key={m.id}
                          type="button"
                          className={`${styles.dot}${i === safeMediaIndex ? ` ${styles.dotActive}` : ''}`}
                          onClick={() => setMediaIndex(i)}
                          aria-label={`${i + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className={styles.contentCol}>
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
                  <span
                    className={styles.usernameTime}
                    title={new Date(current.created_at).toLocaleString()}
                  >
                    @{current.username} · {formatRelativeTime(current.created_at, t)}
                    {privacyIcon && privacyLabelKey && (
                      <i className={`bx ${privacyIcon} ${styles.privacyIcon}`} title={t(privacyLabelKey)} />
                    )}
                  </span>
                </div>
              </Link>

              {!isOwner && (
                <button
                  type="button"
                  className={current.is_following ? styles.followingBtn : styles.followBtn}
                  onClick={handleFollowToggle}
                >
                  {current.is_following ? t('post.following') : t('post.follow')}
                </button>
              )}

              <div className={styles.moreWrap}>
                <button
                  type="button"
                  className={styles.moreBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen((v) => !v)
                  }}
                  aria-label={t('common.more')}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <i className="bx bx-dots-horizontal-rounded" />
                </button>
                {menuOpen && (
                  <div className={styles.moreMenu} role="menu" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className={styles.moreItem} onClick={handleCopyLink}>
                      <i className="bx bx-link" />
                      <span>{t('post.copyLink')}</span>
                    </button>
                    {isOwner && (
                      <>
                        <button
                          type="button"
                          className={styles.moreItem}
                          onClick={handleToggleComments}
                          disabled={togglingComments}
                        >
                          <i className={`bx ${current.comments_enabled ? 'bx-message-rounded-x' : 'bx-message-rounded'}`} />
                          <span>
                            {current.comments_enabled ? t('postDetail.disableComments') : t('postDetail.enableComments')}
                          </span>
                        </button>
                        <button
                          type="button"
                          className={`${styles.moreItem} ${styles.moreItemDanger}`}
                          onClick={() => {
                            setMenuOpen(false)
                            setConfirmDelete(true)
                          }}
                          disabled={deleting}
                        >
                          <i className="bx bx-trash" />
                          <span>{t('postDetail.delete')}</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                className={styles.closeBtn}
                onClick={requestClose}
                aria-label={t('common.close')}
                data-autofocus
              >
                <i className="bx bx-x" />
              </button>
            </div>

            <div className={styles.scrollArea} ref={scrollRef}>
              <div className={styles.contentInner}>
                <div className={styles.body}>
                  {current.shared_from_post_id && current.shared_post && current.share_content && (
                    <p className={styles.shareContentText}>
                      {renderPostContent(
                        current.share_content,
                        EMOJI_CODE_MAP,
                        `psc-${current.id}`,
                        styles.textEmoji,
                        styles.hashtag,
                      )}
                    </p>
                  )}
                  {current.shared_from_post_id && current.shared_post ? (
                    <div className={styles.embeddedPost}>
                      <Link
                        href={`/profile/${current.shared_post.user_id}`}
                        className={styles.embeddedAuthor}
                        onClick={(e) => e.stopPropagation()}
                      >
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
                          {renderPostContent(
                            current.shared_post.content,
                            EMOJI_CODE_MAP,
                            `spd-${current.shared_post.id}`,
                            styles.textEmoji,
                            styles.hashtag,
                          )}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      {current.title && <h2 className={styles.title}>{current.title}</h2>}
                      {current.content && (
                        <p className={styles.text}>
                          {renderPostContent(
                            current.content,
                            EMOJI_CODE_MAP,
                            `pd-${current.id}`,
                            styles.textEmoji,
                            styles.hashtag,
                          )}
                        </p>
                      )}
                      {!current.title && !current.content && current.media.length === 0 && (
                        <p className={styles.emptyBody}>{t('post.noContent')}</p>
                      )}
                    </>
                  )}
                </div>

                <div className={styles.stats}>
                  <span>{t('postDetail.likeCount', { count: formatCount(current.likes_count) })}</span>
                  <button type="button" className={styles.statLink} onClick={scrollToComments}>
                    {t('postDetail.commentCount', { count: formatCount(current.comments_count) })}
                  </button>
                  <span>{t('postDetail.shareCount', { count: formatCount(current.shares_count) })}</span>
                  <span>{t('postDetail.viewCount', { count: formatCount(current.views_count) })}</span>
                </div>

                <div className={styles.actionBar}>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${current.is_liked ? styles.liked : ''}`}
                    onClick={handleLike}
                    aria-pressed={current.is_liked}
                  >
                    <i
                      className={`bx ${current.is_liked ? 'bxs-heart' : 'bx-heart'}${likePop ? ` ${styles.likePopIcon}` : ''}`}
                    />
                    <span>{formatCount(current.likes_count)}</span>
                  </button>

                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={scrollToComments}
                  >
                    <i className="bx bx-message-rounded" />
                    <span>{formatCount(current.comments_count)}</span>
                  </button>

                  <div className={styles.shareWrap}>
                    <button
                      type="button"
                      className={`${styles.actionBtn}${current.is_shared ? ` ${styles.sharedBtn}` : ''}`}
                      onClick={() => setShareOpen((v) => !v)}
                      disabled={isOwner}
                      aria-haspopup="dialog"
                      aria-expanded={shareOpen}
                      title={current.is_shared ? t('post.sharedState') : undefined}
                    >
                      <i className={current.is_shared ? 'bx bxs-check-circle' : 'bx bx-share-alt'} />
                      <span>{formatCount(current.shares_count)}</span>
                    </button>
                    {shareOpen && (
                      <div className={styles.sharePopover} onClick={(e) => e.stopPropagation()}>
                        <textarea
                          ref={shareInputRef}
                          className={styles.shareInput}
                          value={shareText}
                          onChange={(e) => setShareText(e.target.value)}
                          rows={2}
                          placeholder={t('postDetail.sharePlaceholder')}
                        />
                        <div className={styles.shareActions}>
                          <button
                            type="button"
                            className={styles.shareCancel}
                            onClick={() => setShareOpen(false)}
                          >
                            {t('postDetail.cancel')}
                          </button>
                          <button
                            type="button"
                            className={styles.shareSubmit}
                            onClick={handleShare}
                            disabled={sharing}
                          >
                            <span>{t('postDetail.shareButton')}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={styles.actionSpacer} />

                  <button
                    type="button"
                    className={`${styles.actionBtn} ${current.is_saved ? styles.saved : ''}`}
                    onClick={handleSave}
                    disabled={isOwner}
                    aria-pressed={current.is_saved}
                  >
                    <i className={`bx ${current.is_saved ? 'bxs-bookmark' : 'bx-bookmark'}`} />
                  </button>
                </div>
              </div>

              <div className={styles.commentsSection} ref={commentsRef}>
                <div className={styles.commentsHeader}>
                  <span>{t('postDetail.comments')}</span>
                  <div className={styles.commentSort} role="tablist" aria-label={t('postDetail.comments')}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={commentSort === 'newest'}
                      className={`${styles.commentSortBtn} ${commentSort === 'newest' ? styles.commentSortActive : ''}`}
                      onClick={() => handleSortChange('newest')}
                    >
                      {t('postDetail.sortNewest')}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={commentSort === 'oldest'}
                      className={`${styles.commentSortBtn} ${commentSort === 'oldest' ? styles.commentSortActive : ''}`}
                      onClick={() => handleSortChange('oldest')}
                    >
                      {t('postDetail.sortOldest')}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={commentSort === 'relevant'}
                      className={`${styles.commentSortBtn} ${commentSort === 'relevant' ? styles.commentSortActive : ''}`}
                      onClick={() => handleSortChange('relevant')}
                    >
                      {t('postDetail.sortRelevant')}
                    </button>
                  </div>
                </div>
                <div className={styles.commentsList}>
                  {comments.length === 0 && !commentsLoading && (
                    <div className={styles.emptyComments}>
                      <div className={styles.emptyIcon}>
                        <i className="bx bx-message-rounded-dots" />
                      </div>
                      <p className={styles.emptyTitle}>{t('postDetail.emptyCommentsTitle')}</p>
                      <p className={styles.emptyHint}>{t('postDetail.emptyCommentsHint')}</p>
                    </div>
                  )}
                  {commentTree.map(renderComment)}
                  {comments.length > 0 && comments.length < commentTotal && (
                    <div className={styles.loadMoreWrap}>
                      <button type="button" className={styles.loadMoreBtn} onClick={loadMoreComments} disabled={commentsLoading}>
                        {t('postDetail.loadMore')}
                      </button>
                    </div>
                  )}
                  {commentsLoading && comments.length > 0 && (
                    <div className={styles.skelRow}>
                      <div className={`skeleton ${styles.skelAvatar}`} />
                      <div className={styles.skelLines}>
                        <div className={`skeleton ${styles.skelLineShort}`} />
                        <div className={`skeleton ${styles.skelLineLong}`} />
                      </div>
                    </div>
                  )}
                  {commentsLoading && comments.length === 0 && (
                    <div aria-label={t('postDetail.commentsSkeletonLabel')}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} className={styles.skelRow}>
                          <div className={`skeleton ${styles.skelAvatar}`} />
                          <div className={styles.skelLines}>
                            <div className={`skeleton ${styles.skelLineShort}`} />
                            <div className={`skeleton ${styles.skelLineLong}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
              {current.comments_enabled ? (
                <div className={styles.commentInputRow}>
                  <div className={styles.composerAvatar}>
                    {myProfile?.avatar_uri ? (
                      <ExternalImage src={myProfile.avatar_uri} alt="" />
                    ) : (
                      <i className="bx bxs-user" />
                    )}
                  </div>
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
                    aria-label={t('postDetail.commentButton')}
                  />
                  {commentRuneLen >= COMMENT_COUNTER_START && (
                    <span
                      className={`${styles.charCount}${overLimit ? ` ${styles.charCountOver}` : ''}`}
                      title={overLimit ? t('postDetail.charLimit') : undefined}
                    >
                      {commentRuneLen}/{COMMENT_MAX_LENGTH}
                    </span>
                  )}
                  <button
                    type="button"
                    className={styles.commentSubmit}
                    onClick={handleSubmitComment}
                    disabled={submittingComment || commentText.trim() === '' || overLimit}
                    aria-label={t('postDetail.commentButton')}
                  >
                    <i className="bx bx-send" />
                  </button>
                </div>
              ) : (
                <div className={styles.commentsDisabled}>
                  <i className="bx bx-message-rounded-x" />
                  <span>{t('postDetail.commentsDisabled')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmDelete(false)}>
          <div
            className={styles.confirmDialog}
            role="alertdialog"
            aria-modal="true"
            aria-label={t('postDetail.deleteTitle')}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.confirmTitle}>{t('postDetail.deleteTitle')}</h3>
            <p className={styles.confirmText}>{t('postDetail.deleteMessage')}</p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.confirmCancel} onClick={() => setConfirmDelete(false)}>
                {t('postDetail.cancel')}
              </button>
              <button
                type="button"
                className={styles.confirmDanger}
                onClick={handleDelete}
                disabled={deleting}
                autoFocus
              >
                {t('postDetail.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}

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
