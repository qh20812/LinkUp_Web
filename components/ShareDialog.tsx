'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Modal from './Modal'
import ExternalImage from './ExternalImage'
import { useTranslation } from '../hooks/useTranslation'
import { useToast } from '../contexts/ToastContext'
import { searchFriends, sharePostToChat } from '../api/chats'
import { getFriends } from '../api/friends'
import { sharePost } from '../api/posts'
import type { FeedPost } from '../types'
import styles from './ShareDialog.module.css'

type ShareTab = 'profile' | 'friends'

interface ShareDialogProps {
  open: boolean
  onClose: () => void
  post: FeedPost
  /** Lớp xếp chồng — truyền 1 khi dialog mở từ bên trong PostDetailModal. */
  layer?: number
  /** Gọi sau khi chia sẻ lên trang cá nhân thành công (để cập nhật số chia sẻ). */
  onShared?: (post: FeedPost) => void
}

interface Friend {
  id: string
  username?: string
  display_name: string
  avatar_uri: string
}

function isVideo(fileType: string): boolean {
  return fileType.startsWith('video/')
}

export default function ShareDialog({ open, onClose, post, layer = 0, onShared }: ShareDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const idPrefix = useId()
  const [tab, setTab] = useState<ShareTab>('profile')
  const [shareText, setShareText] = useState('')
  const [sharing, setSharing] = useState(false)
  const [search, setSearch] = useState('')
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [results, setResults] = useState<Friend[]>([])
  const [selected, setSelected] = useState<Map<string, Friend>>(new Map())
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Nạp danh sách bạn bè mỗi lần mở dialog. Phần reset state nằm ở
  // handleClose (đóng là dọn sạch) để không setState đồng bộ trong effect.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    getFriends(1, 1, 50)
      .then((res) => {
        if (cancelled) return
        setFriends(
          (res.data ?? []).map((f) => ({
            id: f.user_id,
            display_name: f.display_name,
            avatar_uri: f.avatar_uri,
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setFriends([])
      })
      .finally(() => {
        if (!cancelled) setFriendsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  const handleClose = useCallback(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
      searchTimerRef.current = null
    }
    setTab('profile')
    setShareText('')
    setSearch('')
    setResults([])
    setSelected(new Map())
    setFriendsLoading(true)
    onClose()
  }, [onClose])

  const handleSearch = (value: string) => {
    setSearch(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (value.trim().length < 1) {
      setResults([])
      return
    }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await searchFriends(value.trim())
        setResults(res.users ?? [])
      } catch {
        setResults([])
      }
    }, 350)
  }

  const toggleFriend = (friend: Friend) => {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(friend.id)) next.delete(friend.id)
      else next.set(friend.id, friend)
      return next
    })
  }

  const handleShareToProfile = async () => {
    if (sharing) return
    setSharing(true)
    try {
      const res = await sharePost(post.id, shareText.trim())
      const next: FeedPost = { ...post, shares_count: post.shares_count + 1, is_shared: true }
      onShared?.(next)
      // Prepend bài repost vừa tạo lên đầu feed qua event chung với
      // PostComposer — Feed dedup theo id nên APPEND sau đó không trùng.
      if (res.data) {
        window.dispatchEvent(new CustomEvent<FeedPost>('post:created', { detail: res.data }))
      }
      toast({ type: 'success', title: t('postDetail.shared') })
      handleClose()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSharing(false)
    }
  }

  const handleSendToFriends = async () => {
    if (selected.size === 0) {
      toast({ type: 'warning', title: t('shareDialog.selectFriendWarning') })
      return
    }
    setSharing(true)
    let successCount = 0
    let failCount = 0
    try {
      const targets = Array.from(selected.values())
      const settled = await Promise.allSettled(
        targets.map((friend) => sharePostToChat(friend.id, post.id)),
      )
      for (const r of settled) {
        if (r.status === 'fulfilled') successCount++
        else failCount++
      }
      if (successCount > 0) {
        toast({ type: 'success', title: t('shareDialog.sentCount', { count: successCount }) })
      }
      if (failCount > 0) {
        toast({ type: 'warning', title: t('shareDialog.failedCount', { count: failCount }) })
      }
      handleClose()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSharing(false)
    }
  }

  const previewText = post.title || post.content || t('post.noContent')
  const previewMedia = (post.media ?? [])[0]
  const friendList = search.trim().length === 0 ? friends : results
  const isFriendsTab = tab === 'friends'
  const ctaDisabled = sharing || (isFriendsTab && selected.size === 0)

  const tabId = (name: ShareTab) => `${idPrefix}-tab-${name}`
  const panelId = (name: ShareTab) => `${idPrefix}-panel-${name}`

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('shareDialog.title')}
      layer={layer}
      footer={
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={handleClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={isFriendsTab ? handleSendToFriends : handleShareToProfile}
            disabled={ctaDisabled}
          >
            {sharing ? (
              t('common.loading')
            ) : (
              <>
                <i className={isFriendsTab ? 'bx bx-send' : 'bx bx-share-alt'} aria-hidden="true" />
                {isFriendsTab ? t('shareModal.share') : t('postDetail.shareButton')}
              </>
            )}
          </button>
        </div>
      }
    >
      <div className={styles.body}>
        <div className={styles.preview}>
          <ExternalImage src={post.avatar_uri} alt="" className={styles.previewAvatar} />
          <div className={styles.previewMeta}>
            <span className={styles.previewName}>{post.display_name}</span>
            <p className={styles.previewText}>{previewText}</p>
          </div>
          {previewMedia &&
            (isVideo(previewMedia.file_type) ? (
              <span className={`${styles.previewThumb} ${styles.previewThumbVideo}`} aria-hidden="true">
                <i className="bx bx-play" />
              </span>
            ) : (
              <ExternalImage src={previewMedia.file_uri} alt="" className={styles.previewThumb} />
            ))}
        </div>

        <div className={styles.tabs} role="tablist" aria-label={t('shareDialog.title')}>
          <button
            type="button"
            role="tab"
            id={tabId('profile')}
            aria-selected={tab === 'profile'}
            aria-controls={panelId('profile')}
            className={`${styles.tab}${tab === 'profile' ? ` ${styles.tabActive}` : ''}`}
            onClick={() => setTab('profile')}
          >
            <i className="bx bx-user-circle" aria-hidden="true" />
            {t('shareDialog.tabProfile')}
          </button>
          <button
            type="button"
            role="tab"
            id={tabId('friends')}
            aria-selected={isFriendsTab}
            aria-controls={panelId('friends')}
            className={`${styles.tab}${isFriendsTab ? ` ${styles.tabActive}` : ''}`}
            onClick={() => setTab('friends')}
          >
            <i className="bx bx-message-rounded-detail" aria-hidden="true" />
            {t('shareDialog.tabFriend')}
          </button>
        </div>

        {tab === 'profile' ? (
          <div
            className={styles.panel}
            role="tabpanel"
            id={panelId('profile')}
            aria-labelledby={tabId('profile')}
          >
            <textarea
              className={styles.textarea}
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t('postDetail.sharePlaceholder')}
              aria-label={t('postDetail.sharePlaceholder')}
            />
            <p className={styles.hint}>
              <i className="bx bx-globe" aria-hidden="true" />
              {t('shareDialog.profileHint')}
            </p>
          </div>
        ) : (
          <div
            className={styles.panel}
            role="tabpanel"
            id={panelId('friends')}
            aria-labelledby={tabId('friends')}
          >
            <div className={styles.searchWrap}>
              <i className="bx bx-search" aria-hidden="true" />
              <input
                className={styles.searchInput}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t('shareModal.searchPlaceholder')}
                aria-label={t('shareModal.searchPlaceholder')}
                type="search"
              />
            </div>

            {selected.size > 0 && (
              <div className={styles.selectedList}>
                {Array.from(selected.values()).map((f) => (
                  <span key={f.id} className={styles.selectedChip}>
                    <ExternalImage src={f.avatar_uri} alt="" className={styles.chipAvatar} />
                    <span className={styles.chipName}>{f.display_name}</span>
                    <button
                      type="button"
                      className={styles.chipRemove}
                      onClick={() => toggleFriend(f)}
                      aria-label={t('common.delete')}
                    >
                      <i className="bx bx-x" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className={styles.results}>
              {friendsLoading && search.trim().length === 0 ? (
                <p className={styles.empty}>{t('common.loading')}</p>
              ) : friendList.length === 0 ? (
                <p className={styles.empty}>
                  {search.trim().length === 0 ? t('shareDialog.noFriends') : t('shareDialog.noResults')}
                </p>
              ) : (
                friendList.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    className={`${styles.resultRow}${selected.has(friend.id) ? ` ${styles.resultSelected}` : ''}`}
                    onClick={() => toggleFriend(friend)}
                    aria-pressed={selected.has(friend.id)}
                  >
                    <ExternalImage src={friend.avatar_uri} alt="" className={styles.resultAvatar} />
                    <span className={styles.resultInfo}>
                      <span className={styles.resultName}>{friend.display_name}</span>
                      {friend.username && (
                        <span className={styles.resultUsername}>@{friend.username}</span>
                      )}
                    </span>
                    {selected.has(friend.id) && (
                      <i className={`bx bx-check-circle ${styles.checkIcon}`} aria-hidden="true" />
                    )}
                  </button>
                ))
              )}
            </div>

            <p className={styles.hint}>
              <i className="bx bx-info-circle" aria-hidden="true" />
              {t('shareDialog.friendHint')}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
