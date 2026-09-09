'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Modal from '../Modal'
import ExternalImage from '../ExternalImage'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import { searchFriends, createGroupChat, uploadMedia } from '../../api/chats'
import { getFriends } from '../../api/friends'
import styles from './CreateGroupModal.module.css'

interface CreateGroupModalProps {
  open: boolean
  onClose: () => void
  onCreated: (chatId: string) => void
}

interface Friend {
  id: string
  username: string
  display_name: string
  avatar_uri: string
}

export default function CreateGroupModal({ open, onClose, onCreated }: CreateGroupModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Friend[]>([])
  const [selected, setSelected] = useState<Map<string, Friend>>(new Map())
  const [creating, setCreating] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarFileRef = useRef<HTMLInputElement>(null)
  const avatarPreviewUrlRef = useRef<string | null>(null)
  const [friendsState, setFriendsState] = useState<{
    data: Friend[]
    loaded: boolean
  }>({ data: [], loaded: false })
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = () => {
    setName('')
    setSearch('')
    setResults([])
    setSelected(new Map())
    setFriendsState({ data: [], loaded: false })
    setAvatarFile(null)
    if (avatarPreviewUrlRef.current) {
      URL.revokeObjectURL(avatarPreviewUrlRef.current)
      avatarPreviewUrlRef.current = null
    }
    setAvatarPreview(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  useEffect(() => {
    if (!open) return
    if (search.trim().length > 0) return
    let cancelled = false
    getFriends(1, 50)
      .then((res) => {
        if (cancelled) return
        setFriendsState({
          data: (res.data ?? []).map((u) => ({
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
  }, [open, search])

  const handleSearch = (value: string) => {
    setSearch(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (value.trim().length < 2) {
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

  const toggleMember = (friend: Friend) => {
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (avatarPreviewUrlRef.current) {
      URL.revokeObjectURL(avatarPreviewUrlRef.current)
    }
    const url = URL.createObjectURL(file)
    avatarPreviewUrlRef.current = url
    setAvatarFile(file)
    setAvatarPreview(url)
  }

  const handleCreate = useCallback(async () => {
    if (!name.trim() || name.trim().length < 3) {
      toast({ type: 'warning', title: 'Tên nhóm phải từ 3-50 ký tự' })
      return
    }
    if (selected.size === 0) {
      toast({ type: 'warning', title: 'Hãy chọn ít nhất 1 thành viên' })
      return
    }
    setCreating(true)
    try {
      let avatarUri: string | undefined
      if (avatarFile) {
        setAvatarUploading(true)
        try {
          const uploadRes = await uploadMedia(avatarFile)
          avatarUri = uploadRes.data.file_uri
        } finally {
          setAvatarUploading(false)
        }
      }
      const res = await createGroupChat(name.trim(), Array.from(selected.keys()), avatarUri)
      toast({ type: 'success', title: t('chat.groupCreated') })
      reset()
      onCreated(res.group_id)
    } catch (err) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('common.error'),
      })
    } finally {
      setCreating(false)
    }
  }, [name, selected, avatarFile, toast, t, onCreated])

  const keywordLen = search.trim().length
  const showFriends = keywordLen === 0
  const displayList = showFriends ? friendsState.data : results
  const isLoading = !showFriends && !friendsState.loaded

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('chat.createGroup')}
      footer={
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={handleClose}>
            {t('common.cancel')}
          </button>
          <button
            className={styles.createBtn}
            onClick={handleCreate}
            disabled={creating || !name.trim() || selected.size === 0}
          >
            {creating ? t('common.loading') : t('chat.createGroup')}
          </button>
        </div>
      }
    >
      <div className={styles.body}>
        <div className={styles.avatarField}>
          <div
            className={styles.avatarPicker}
            onClick={() => avatarFileRef.current?.click()}
          >
            {avatarPreview ? (
              <ExternalImage src={avatarPreview} alt="" className={styles.avatarPreviewImg} />
            ) : (
              <i className="bx bx-camera" />
            )}
            {avatarUploading && (
              <div className={styles.avatarUploading}>
                <i className="bx bx-loader-circle bx-spin" />
              </div>
            )}
          </div>
          <input
            ref={avatarFileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatarChange}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('chat.groupName')}</label>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('chat.groupNamePlaceholder')}
            maxLength={50}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('chat.addMembers')}</label>
          <input
            className={styles.input}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t('chat.searchFriends')}
          />
        </div>

        {selected.size > 0 && (
          <div className={styles.selectedList}>
            {Array.from(selected.values()).map((f) => (
              <div key={f.id} className={styles.selectedChip}>
                <ExternalImage src={f.avatar_uri} alt="" className={styles.chipAvatar} />
                <span>{f.display_name}</span>
                <button className={styles.chipRemove} onClick={() => toggleMember(f)}>
                  <i className="bx bx-x" />
                </button>
              </div>
            ))}
          </div>
        )}

        {showFriends && friendsState.loaded && friendsState.data.length > 0 && (
          <div className={styles.friendsLabel}>{t('chat.friends')}</div>
        )}

        {isLoading && (
          <div className={styles.loading}>{t('common.loading')}</div>
        )}

        {displayList.length > 0 && (
          <div className={styles.results}>
            {displayList.map((friend) => (
              <button
                key={friend.id}
                className={`${styles.resultRow} ${
                  selected.has(friend.id) ? styles.resultSelected : ''
                }`}
                onClick={() => toggleMember(friend)}
              >
                <ExternalImage src={friend.avatar_uri} alt="" className={styles.resultAvatar} />
                <div className={styles.resultInfo}>
                  <span className={styles.resultName}>{friend.display_name}</span>
                  <span className={styles.resultUsername}>@{friend.username}</span>
                </div>
                {selected.has(friend.id) && (
                  <i className={`bx bx-check-circle ${styles.checkIcon}`} />
                )}
              </button>
            ))}
          </div>
        )}

        {!isLoading && displayList.length === 0 && (
          <div className={styles.loading}>
            {keywordLen < 1 ? t('chat.noFriends') : t('chat.noResults')}
          </div>
        )}
      </div>
    </Modal>
  )
}
