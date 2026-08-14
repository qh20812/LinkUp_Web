'use client'

import { useEffect, useRef, useState } from 'react'
import Modal from '../Modal'
import ExternalImage from '../ExternalImage'
import { searchFriends } from '../../api/chats'
import { useTranslation } from '../../hooks/useTranslation'
import styles from './UserPickerModal.module.css'

export interface UserSearchItem {
  id: string
  username: string
  display_name: string
  avatar_uri: string
}

interface UserPickerModalProps {
  open: boolean
  onClose: () => void
  onPick: (user: UserSearchItem) => void
}

export default function UserPickerModal({ open, onClose, onPick }: UserPickerModalProps) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<UserSearchItem[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seqRef = useRef(0)

  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (!open) {
      setKeyword('')
      setResults([])
      setSearching(false)
      setError(null)
    }
  }

  const MIN_CHARS = 2

  const handleKeywordChange = (value: string) => {
    setKeyword(value)
    if (value.trim().length < MIN_CHARS) {
      setSearching(false)
      setResults([])
      setError(null)
      return
    }
    setSearching(true)
  }

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const trimmed = keyword.trim()
    if (trimmed.length < MIN_CHARS) return
    timerRef.current = setTimeout(async () => {
      const seq = ++seqRef.current
      try {
        const res = await searchFriends(trimmed)
        if (seq !== seqRef.current) return
        setResults(res.users ?? [])
        setError(null)
      } catch (err) {
        if (seq !== seqRef.current) return
        setError(err instanceof Error ? err.message : t('common.error'))
      } finally {
        if (seq === seqRef.current) setSearching(false)
      }
    }, 400)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [keyword, t])

  const keywordLen = keyword.trim().length
  const emptyHint = keywordLen === 0 ? t('chat.typeToSearchFriends') : keywordLen < MIN_CHARS ? t('chat.keywordTooShort') : t('chat.noResults')

  return (
    <Modal open={open} onClose={onClose} title={t('chat.newMessage')}>
      <div className={styles.search}>
        <i className="bx bx-search" />
        <input
          autoFocus
          value={keyword}
          onChange={(e) => handleKeywordChange(e.target.value)}
          placeholder={t('chat.searchFriends')}
        />
      </div>
      <div className={styles.results}>
        {searching && (
          <div className={styles.center}>
            <span>{t('common.loading')}</span>
          </div>
        )}
        {!searching && error && (
          <div className={styles.center}>
            <p>{error}</p>
          </div>
        )}
        {!searching && !error && results.length === 0 && (
          <div className={styles.center}>
            <p>{emptyHint}</p>
          </div>
        )}
        {results.map((user) => (
          <button key={user.id} className={styles.row} onClick={() => onPick(user)}>
            <div className={styles.avatar}>
              {user.avatar_uri ? (
                <ExternalImage src={user.avatar_uri} alt="" />
              ) : (
                <i className="bx bxs-user" />
              )}
            </div>
            <div className={styles.meta}>
              <span className={styles.name}>{user.display_name || user.username}</span>
              {user.display_name && user.username && (
                <span className={styles.username}>@{user.username}</span>
              )}
            </div>
            <i className={`bx bx-message-rounded ${styles.icon}`} />
          </button>
        ))}
      </div>
    </Modal>
  )
}
