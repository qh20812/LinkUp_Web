'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import ExternalImage from '../ExternalImage'
import Modal from '../Modal'
import { useTranslation } from '../../hooks/useTranslation'
import { formatChatDate, formatChatTime } from '../../utils/chat'
import type { ChatConversation, ChatMessage } from '../../types'
import type { ChatRoom } from '../../hooks/useChatRoom'
import styles from './ChatWindow.module.css'

interface ChatWindowProps {
  conversation: ChatConversation | null
  myUserId: string
  room: ChatRoom
  onDeleteChat?: () => void
}

interface DeleteTarget {
  message: ChatMessage
}

export default function ChatWindow({
  conversation,
  myUserId,
  room,
  onDeleteChat,
}: ChatWindowProps) {
  const { t } = useTranslation()
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [searchActive, setSearchActive] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const clearSearch = room.clearSearch
  const searchMessages = room.searchMessages

  const toggleSearch = () => {
    if (searchActive) {
      setSearchInput('')
      clearSearch()
    }
    setSearchActive((prev) => !prev)
  }

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    const keyword = searchInput
    if (!keyword.trim()) {
      clearSearch()
      return
    }
    searchTimerRef.current = setTimeout(() => searchMessages(keyword), 350)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchInput, clearSearch, searchMessages])

  useEffect(() => {
    const el = scrollRef.current
    if (el && room.searchResults === null) {
      el.scrollTop = el.scrollHeight
    }
  }, [room.messages.length, room.partnerTyping, room.searchResults])

  if (!conversation) {
    return (
      <div className={styles.empty}>
        <i className="bx bx-message-rounded-dots" />
        <p>{t('chat.selectHint')}</p>
      </div>
    )
  }

  const confirmDelete = (mode: 'all' | 'one') => {
    if (deleteTarget) {
      room.deleteMessage(deleteTarget.message.id, mode)
    }
    setDeleteTarget(null)
  }

  const messages = room.messages
  const searchResults = room.searchResults
  const inSearch = searchResults !== null

  return (
    <div className={styles.window}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          {conversation.partner.avatar_uri ? (
            <ExternalImage src={conversation.partner.avatar_uri} alt="" />
          ) : (
            <i className="bx bxs-user" />
          )}
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.name}>
            {conversation.partner.display_name || t('chat.unknown')}
          </span>
        </div>
        <button
          className={`${styles.iconBtn} ${searchActive ? styles.iconBtnActive : ''}`}
          onClick={toggleSearch}
          aria-label={t('chat.searchMessages')}
        >
          <i className="bx bx-search" />
        </button>
        {onDeleteChat && (
          <button
            className={styles.iconBtn}
            onClick={onDeleteChat}
            aria-label={t('chat.deleteChat')}
            title={t('chat.deleteChat')}
          >
            <i className="bx bx-trash" />
          </button>
        )}
      </div>

      {searchActive && (
        <div className={styles.searchRow}>
          <i className="bx bx-search" />
          <input
            autoFocus
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('chat.searchMessages')}
          />
          {searchInput && (
            <button className={styles.clearBtn} onClick={() => setSearchInput('')}>
              <i className="bx bx-x" />
            </button>
          )}
        </div>
      )}

      {inSearch ? (
        <div className={styles.searchResults}>
          <div className={styles.searchResultsHeader}>
            <span>
              {t('chat.searchResults', { keyword: room.searchKeyword })}
            </span>
            <button className={styles.clearBtn} onClick={room.clearSearch}>
              <i className="bx bx-x" />
            </button>
          </div>
          {searchResults.length === 0 ? (
            <div className={styles.center}>{t('chat.noResults')}</div>
          ) : (
            searchResults.map((msg) => (
              <div key={msg.id} className={styles.searchResultItem}>
                <span className={styles.searchResultSender}>
                  {msg.sender_id === myUserId ? t('chat.you') : conversation.partner.display_name}
                </span>
                <span className={styles.searchResultContent}>{msg.content}</span>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className={styles.messages} ref={scrollRef}>
          {room.loading && (
            <div className={styles.center}>{t('common.loading')}</div>
          )}

          {!room.loading && messages.length === 0 && (
            <div className={styles.center}>
              <p>{t('chat.noMessages')}</p>
            </div>
          )}

          {messages.map((msg, i) => {
            const prev = messages[i - 1]
            const showDate =
              !prev || formatChatDate(prev.created_at, t) !== formatChatDate(msg.created_at, t)
            const mine = msg.sender_id === myUserId
            return (
              <Fragment key={msg.id}>
                {showDate && (
                  <div className={styles.dateSep}>{formatChatDate(msg.created_at, t)}</div>
                )}
                <div className={`${styles.msgRow} ${mine ? styles.mine : styles.theirs}`}>
                  <div className={styles.bubble}>
                    <span className={styles.msgText}>{msg.content}</span>
                    <span className={styles.msgTime}>{formatChatTime(msg.created_at, t)}</span>
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => setDeleteTarget({ message: msg })}
                    aria-label={t('chat.delete')}
                  >
                    <i className="bx bx-trash" />
                  </button>
                </div>
              </Fragment>
            )
          })}

          {room.partnerTyping && (
            <div className={styles.typing}>
              <i className="bx bx-loader-circle bx-spin" />
              <span>{t('chat.typing')}</span>
            </div>
          )}
        </div>
      )}

      <Composer room={room} />

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t('chat.deleteMessage')}
        footer={
          <button className={styles.ghostBtn} onClick={() => setDeleteTarget(null)}>
            {t('common.cancel')}
          </button>
        }
      >
        <p className={styles.deleteText}>{t('chat.deleteConfirm')}</p>
        <div className={styles.deleteActions}>
          <button className={styles.ghostBtn} onClick={() => confirmDelete('one')}>
            <i className="bx bx-trash" />
            {t('chat.deleteForMe')}
          </button>
          {deleteTarget && deleteTarget.message.sender_id === myUserId && (
            <button className={styles.dangerBtn} onClick={() => confirmDelete('all')}>
              <i className="bx bx-trash" />
              {t('chat.deleteForAll')}
            </button>
          )}
        </div>
      </Modal>
    </div>
  )
}

interface ComposerProps {
  room: ChatRoom
}

function Composer({ room }: ComposerProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastTypingRef = useRef(0)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sendTyping = room.sendTyping

  const stopTyping = () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    sendTyping(false)
  }

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
      sendTyping(false)
    }
  }, [sendTyping])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setValue(v)
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }
    const now = Date.now()
    if (v.trim() && now - lastTypingRef.current > 800) {
      lastTypingRef.current = now
      sendTyping(true)
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
      stopTimerRef.current = setTimeout(() => sendTyping(false), 1500)
    }
  }

  const send = () => {
    if (!value.trim()) return
    room.sendMessage(value)
    setValue('')
    stopTyping()
    const el = textareaRef.current
    if (el) el.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className={styles.composer}>
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={t('chat.placeholder')}
      />
      <button
        className={styles.sendBtn}
        onClick={send}
        disabled={!value.trim()}
        aria-label={t('chat.send')}
      >
        <i className="bx bx-send" />
      </button>
    </div>
  )
}
