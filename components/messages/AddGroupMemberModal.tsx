'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Modal from '../Modal'
import ExternalImage from '../ExternalImage'
import { searchFriends, addGroupMember } from '../../api/chats'
import { getFriends } from '../../api/friends'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import styles from './AddGroupMemberModal.module.css'

interface FriendUser {
  id: string
  username: string
  display_name: string
  avatar_uri: string
}

interface AddGroupMemberModalProps {
  open: boolean
  onClose: () => void
  chatId: string
  memberIds: Set<string>
  onMembersAdded?: () => void
}

export default function AddGroupMemberModal({
  open,
  onClose,
  chatId,
  memberIds,
  onMembersAdded,
}: AddGroupMemberModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<FriendUser[]>([])
  const [friendsState, setFriendsState] = useState<{
    data: FriendUser[]
    loaded: boolean
  }>({ data: [], loaded: false })
  const [searching, setSearching] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seqRef = useRef(0)

  const resetState = useCallback(() => {
    setKeyword('')
    setResults([])
    setFriendsState({ data: [], loaded: false })
    setSearching(false)
    setSelectedIds(new Set())
    setAdding(false)
  }, [])

  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (!open) resetState()
  }

  useEffect(() => {
    if (!open) return
    if (keyword.trim().length > 0) return
    let cancelled = false
    getFriends(1, 50)
      .then((res) => {
        if (cancelled) return
        setFriendsState({
          data: (res.data ?? [])
            .filter((u) => !memberIds.has(u.user_id))
            .map((u) => ({
              id: u.user_id,
              username: u.display_name || u.user_id,
              display_name: u.display_name,
              avatar_uri: u.avatar_uri,
            })),
          loaded: true,
        })
      })
      .catch(() => {
        if (!cancelled) setFriendsState({ data: [], loaded: true })
      })
    return () => { cancelled = true }
  }, [open, keyword, memberIds])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const trimmed = keyword.trim()
    if (trimmed.length < 1) {
      setSearching(false)
      setResults([])
      return
    }
    setSearching(true)
    timerRef.current = setTimeout(async () => {
      const seq = ++seqRef.current
      try {
        const res = await searchFriends(trimmed)
        if (seq !== seqRef.current) return
        setResults(
          (res.users ?? [])
            .filter((u) => !memberIds.has(u.id))
            .map((u) => ({
              id: u.id,
              username: u.username || u.id,
              display_name: u.display_name,
              avatar_uri: u.avatar_uri,
            }))
        )
      } catch {
        if (seq !== seqRef.current) return
        setResults([])
      } finally {
        if (seq === seqRef.current) setSearching(false)
      }
    }, 400)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [keyword, memberIds])

  const toggleSelect = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const handleAdd = async () => {
    if (selectedIds.size === 0 || adding) return
    setAdding(true)
    let addedCount = 0
    let lastError = ''
    for (const userId of selectedIds) {
      try {
        await addGroupMember(chatId, userId)
        addedCount++
      } catch (err) {
        lastError = err instanceof Error ? err.message : t('common.error')
      }
    }
    if (addedCount > 0) {
      toast({ type: 'success', title: t('chat.memberInviteSent', { count: addedCount }) })
      onMembersAdded?.()
    } else if (lastError) {
      toast({ type: 'error', title: lastError })
    }
    resetState()
    onClose()
  }

  const keywordLen = keyword.trim().length
  const showFriends = keywordLen === 0
  const displayList = showFriends ? friendsState.data : results
  const isLoading = searching || !friendsState.loaded

  return (
    <Modal
      open={open}
      onClose={() => { resetState(); onClose() }}
      title={t('chat.addMembers')}
      footer={
        <div className={styles.footer}>
          <span className={styles.selectedCount}>
            {selectedIds.size > 0
              ? t('chat.selectedCount', { count: selectedIds.size })
              : ''}
          </span>
          <button
            className={`${styles.addBtn} ${selectedIds.size === 0 ? styles.addBtnDisabled : ''}`}
            disabled={selectedIds.size === 0 || adding}
            onClick={handleAdd}
          >
            {adding ? t('common.loading') : t('chat.sendInviteCount', { count: selectedIds.size })}
          </button>
        </div>
      }
    >
      <div className={styles.search}>
        <i className="bx bx-search" />
        <input
          autoFocus
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={t('chat.searchFriends')}
        />
      </div>
      <div className={styles.results}>
        {isLoading && (
          <div className={styles.center}>
            <span>{t('common.loading')}</span>
          </div>
        )}
        {!isLoading && displayList.length === 0 && (
          <div className={styles.center}>
            <p>{keywordLen < 1 ? t('chat.noFriends') : t('chat.noResults')}</p>
          </div>
        )}
        {!isLoading && showFriends && friendsState.data.length > 0 && (
          <div className={styles.sectionLabel}>{t('chat.friends')}</div>
        )}
        {displayList.map((user) => {
          const isSelected = selectedIds.has(user.id)
          return (
            <button
              key={user.id}
              className={styles.row}
              onClick={() => toggleSelect(user.id)}
            >
              <div className={styles.avatar}>
                {user.avatar_uri ? (
                  <ExternalImage src={user.avatar_uri} alt="" />
                ) : (
                  <i className="bx bxs-user" />
                )}
              </div>
              <div className={styles.meta}>
                <span className={styles.name}>{user.display_name || user.username}</span>
                {user.display_name && user.username && user.display_name !== user.username && (
                  <span className={styles.username}>@{user.username}</span>
                )}
              </div>
              <div className={`${styles.checkbox} ${isSelected ? styles.checkboxChecked : ''}`}>
                {isSelected && <i className="bx bx-check" />}
              </div>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
