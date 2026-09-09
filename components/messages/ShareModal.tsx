'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Modal from '../Modal'
import ExternalImage from '../ExternalImage'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import { searchFriends, sharePostToChat } from '../../api/chats'
import { getFriends } from '../../api/friends'
import styles from './ShareModal.module.css'

interface ShareModalProps {
  open: boolean
  onClose: () => void
  postId: string
}

interface Friend {
  id: string
  username?: string
  display_name: string
  avatar_uri: string
}

export default function ShareModal({ open, onClose, postId }: ShareModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [friends, setFriends] = useState<Friend[]>([])
  const [results, setResults] = useState<Friend[]>([])
  const [selected, setSelected] = useState<Map<string, Friend>>(new Map())
  const [sending, setSending] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    getFriends(1, 50)
      .then((res) => {
        setFriends(
          (res.data ?? []).map((f) => ({
            id: f.user_id,
            display_name: f.display_name,
            avatar_uri: f.avatar_uri,
          })),
        )
      })
      .catch(() => {})
  }, [open])

  const reset = () => {
    setSearch('')
    setResults([])
    setSelected(new Map())
  }

  const handleClose = () => {
    reset()
    onClose()
  }

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
      if (next.has(friend.id)) {
        next.delete(friend.id)
      } else {
        next.set(friend.id, friend)
      }
      return next
    })
  }

  const handleShare = useCallback(async () => {
    if (selected.size === 0) {
      toast({ type: 'warning', title: 'Hãy chọn ít nhất 1 người' })
      return
    }
    setSending(true)
    let successCount = 0
    let failCount = 0
    try {
      const friends = Array.from(selected.values())
      const results = await Promise.allSettled(
        friends.map((friend) => sharePostToChat(friend.id, postId)),
      )
      for (const r of results) {
        if (r.status === 'fulfilled') {
          successCount++
        } else {
          failCount++
        }
      }
      if (successCount > 0) {
        toast({ type: 'success', title: `Đã gửi đến ${successCount} người` })
      }
      if (failCount > 0) {
        toast({ type: 'warning', title: `${failCount} người không thể gửi` })
      }
      handleClose()
    } catch {
      toast({ type: 'error', title: t('common.error') })
    } finally {
      setSending(false)
    }
  }, [selected, postId, toast, t, handleClose])

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('shareModal.title')}
      footer={
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={handleClose}>
            {t('common.cancel')}
          </button>
          <button
            className={styles.shareBtn}
            onClick={handleShare}
            disabled={sending || selected.size === 0}
          >
            {sending ? t('common.loading') : t('shareModal.share')}
          </button>
        </div>
      }
    >
      <div className={styles.body}>
        <div className={styles.field}>
          <input
            className={styles.input}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t('shareModal.searchPlaceholder')}
          />
        </div>

        {selected.size > 0 && (
          <div className={styles.selectedList}>
            {Array.from(selected.values()).map((f) => (
              <div key={f.id} className={styles.selectedChip}>
                <ExternalImage src={f.avatar_uri} alt="" className={styles.chipAvatar} />
                <span>{f.display_name}</span>
                <button className={styles.chipRemove} onClick={() => toggleFriend(f)}>
                  <i className="bx bx-x" />
                </button>
              </div>
            ))}
          </div>
        )}

        {search.trim().length === 0 ? (
          friends.length > 0 && (
            <div className={styles.results}>
              {friends.map((friend) => (
                <button
                  key={friend.id}
                  className={`${styles.resultRow} ${
                    selected.has(friend.id) ? styles.resultSelected : ''
                  }`}
                  onClick={() => toggleFriend(friend)}
                >
                  <ExternalImage src={friend.avatar_uri} alt="" className={styles.resultAvatar} />
                  <div className={styles.resultInfo}>
                    <span className={styles.resultName}>{friend.display_name}</span>
                    {friend.username && (
                      <span className={styles.resultUsername}>@{friend.username}</span>
                    )}
                  </div>
                  {selected.has(friend.id) && (
                    <i className={`bx bx-check-circle ${styles.checkIcon}`} />
                  )}
                </button>
              ))}
            </div>
          )
        ) : results.length > 0 ? (
          <div className={styles.results}>
            {results.map((friend) => (
              <button
                key={friend.id}
                className={`${styles.resultRow} ${
                  selected.has(friend.id) ? styles.resultSelected : ''
                }`}
                onClick={() => toggleFriend(friend)}
              >
                <ExternalImage src={friend.avatar_uri} alt="" className={styles.resultAvatar} />
                <div className={styles.resultInfo}>
                  <span className={styles.resultName}>{friend.display_name}</span>
                  {friend.username && (
                    <span className={styles.resultUsername}>@{friend.username}</span>
                  )}
                </div>
                {selected.has(friend.id) && (
                  <i className={`bx bx-check-circle ${styles.checkIcon}`} />
                )}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
