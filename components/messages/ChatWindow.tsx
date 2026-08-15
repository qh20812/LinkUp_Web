'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import ExternalImage from '../ExternalImage'
import Modal from '../Modal'
import { useTranslation } from '../../hooks/useTranslation'
import { useEmojis } from '../../hooks/useEmojis'
import { useToast } from '../../contexts/ToastContext'
import { downloadMessageMedia, uploadMedia } from '../../api/chats'
import { formatChatDate, formatChatTime } from '../../utils/chat'
import type { ChatConversation, ChatMessage, EmojiItem } from '../../types'
import type { ChatRoom } from '../../hooks/useChatRoom'
import styles from './ChatWindow.module.css'

interface ChatWindowProps {
  conversation: ChatConversation | null
  myUserId: string
  room: ChatRoom
  isEncrypted?: boolean
  onDeleteChat?: () => void
}

interface DeleteTarget {
  message: ChatMessage
}

export default function ChatWindow({
  conversation,
  myUserId,
  room,
  isEncrypted = false,
  onDeleteChat,
}: ChatWindowProps) {
  const { t } = useTranslation()
  const { emojis } = useEmojis()
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

  const confirmDelete = (mode: 'all' | 'me') => {
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
          {isEncrypted && (
            <span className={styles.e2eBadge} title={t('chat.e2eTitle')}>
              <i className="bx bxs-lock-alt" />
              {t('chat.e2eBadge')}
            </span>
          )}
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
                <span className={styles.searchResultContent}>
                  {msg.media_id
                    ? t('chat.mediaMessage')
                    : msg.emoji_id
                      ? emojis.get(msg.emoji_id)?.code || t('chat.emojiMessage')
                      : msg.content}
                </span>
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
            const plain =
              !msg.deleted &&
              !msg.decrypt_failed &&
              !msg.content &&
              Boolean(msg.media_id || msg.emoji_id)
            return (
              <Fragment key={msg.id}>
                {showDate && (
                  <div className={styles.dateSep}>{formatChatDate(msg.created_at, t)}</div>
                )}
                <div className={`${styles.msgRow} ${mine ? styles.mine : styles.theirs}`}>
                  <div
                    className={`${styles.bubble}${plain ? ` ${styles.bubblePlain}` : ''}`}
                  >
                    {msg.deleted ? (
                      <span className={styles.deletedText}>{t('chat.messageDeleted')}</span>
                    ) : (
                      <>
                        {msg.media_id && (
                          <div className={styles.mediaWrap}>
                            <MessageMedia message={msg} />
                          </div>
                        )}
                        {msg.emoji_id && !msg.media_id && (
                          <EmojiBubble message={msg} emojis={emojis} />
                        )}
                        {msg.decrypt_failed ? (
                          <span className={styles.deletedText}>
                            <i className="bx bxs-lock-alt" /> {t('chat.undecryptable')}
                          </span>
                        ) : msg.content ? (
                          <span className={styles.msgText}>{msg.content}</span>
                        ) : null}
                      </>
                    )}
                    <span className={styles.msgTime}>{formatChatTime(msg.created_at, t)}</span>
                  </div>
                  {!msg.deleted && (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => setDeleteTarget({ message: msg })}
                      aria-label={t('chat.delete')}
                    >
                      <i className="bx bx-trash" />
                    </button>
                  )}
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
          <button className={styles.ghostBtn} onClick={() => confirmDelete('me')}>
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

interface MessageMediaProps {
  message: ChatMessage
}

function MessageMedia({ message }: MessageMediaProps) {
  const { t } = useTranslation()
  const [src, setSrc] = useState<string | null>(message.media_uri ?? null)
  const [isVideo, setIsVideo] = useState(message.media_type?.startsWith('video/') ?? false)
  const [failed, setFailed] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (message.media_uri) return
    let cancelled = false
    downloadMessageMedia(message.id)
      .then((blob) => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        objectUrlRef.current = url
        setSrc(url)
        setIsVideo(blob.type.startsWith('video/'))
      })
      .catch(() => {
        if (cancelled) return
        setFailed(true)
      })
    return () => {
      cancelled = true
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [message.id, message.media_uri])

  const loading = !src && !failed
  if (loading) {
    return (
      <span className={styles.mediaLoading}>
        <i className="bx bx-loader-circle bx-spin" />
      </span>
    )
  }
  if (failed || !src) {
    return <span className={styles.deletedText}>{t('chat.mediaFailed')}</span>
  }
  if (isVideo) {
    return <video src={src} controls muted playsInline className={styles.mediaEl} />
  }
  return <ExternalImage src={src} alt="" className={styles.mediaEl} loading="lazy" />
}

interface EmojiImageProps {
  emoji: EmojiItem
  className?: string
}

function EmojiImage({ emoji, className }: EmojiImageProps) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return <span className={styles.emojiFallback}>{emoji.code}</span>
  }
  return (
    <ExternalImage
      src={emoji.image_uri}
      alt={emoji.code}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

interface EmojiBubbleProps {
  message: ChatMessage
  emojis: Map<string, EmojiItem>
}

function EmojiBubble({ message, emojis }: EmojiBubbleProps) {
  const { t } = useTranslation()
  const emoji = message.emoji_id ? emojis.get(message.emoji_id) : undefined
  if (!emoji) {
    return <span className={styles.deletedText}>{t('chat.emojiUnavailable')}</span>
  }
  return <EmojiImage emoji={emoji} className={styles.emojiMsg} />
}

interface ComposerProps {
  room: ChatRoom
}

function Composer({ room }: ComposerProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { emojis } = useEmojis()
  const [value, setValue] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const toggleEmojiRef = useRef<HTMLButtonElement>(null)
  const lastTypingRef = useRef(0)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sendTyping = room.sendTyping

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
      sendTyping(false)
    }
  }, [sendTyping])

  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }
  }, [value])

  useEffect(() => {
    if (!emojiOpen) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (pickerRef.current?.contains(target)) return
      if (toggleEmojiRef.current?.contains(target)) return
      setEmojiOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [emojiOpen])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setValue(v)
    const now = Date.now()
    if (v.trim() && now - lastTypingRef.current > 800) {
      lastTypingRef.current = now
      sendTyping(true)
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
      stopTimerRef.current = setTimeout(() => sendTyping(false), 1500)
    }
  }

  const resetComposer = () => {
    setValue('')
    setEmojiOpen(false)
    sendTyping(false)
  }

  const send = (opts?: { emojiId?: string; mediaId?: string; mediaUri?: string; mediaType?: string }) => {
    if (!value.trim() && !opts?.emojiId && !opts?.mediaId) return
    room.sendMessage(value, opts)
    resetComposer()
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || uploading) return
    setUploading(true)
    try {
      const res = await uploadMedia(file)
      send({
        mediaId: res.data.id,
        mediaUri: res.data.file_uri,
        mediaType: res.data.file_type,
      })
    } catch {
      toast({ type: 'error', title: t('chat.uploadFailed') })
    } finally {
      setUploading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className={styles.composer}>
      <div className={styles.composerActions}>
        <button
          ref={toggleEmojiRef}
          className={`${styles.iconBtn} ${emojiOpen ? styles.iconBtnActive : ''}`}
          onClick={() => setEmojiOpen((prev) => !prev)}
          aria-label={t('chat.emojiPicker')}
          title={t('chat.emojiPicker')}
        >
          <i className="bx bxs-smile" />
        </button>
        <button
          className={styles.iconBtn}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label={t('chat.attach')}
          title={t('chat.attach')}
        >
          <i className="bx bx-paperclip" />
        </button>
      </div>
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
        onClick={() => send()}
        disabled={!value.trim() || uploading}
        aria-label={t('chat.send')}
      >
        <i className={uploading ? 'bx bx-loader-circle bx-spin' : 'bx bx-send'} />
      </button>
      <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={handleFile} />
      {emojiOpen && (
        <div ref={pickerRef} className={styles.emojiPicker}>
          {emojis.size === 0 ? (
            <span className={styles.center}>{t('common.loading')}</span>
          ) : (
            [...emojis.values()].map((e) => (
              <button
                key={e.id}
                className={styles.emojiItem}
                onClick={() => {
                  room.sendMessage(value, { emojiId: e.id })
                  resetComposer()
                }}
                title={e.code}
              >
                <EmojiImage emoji={e} className={styles.emojiItemImg} />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
