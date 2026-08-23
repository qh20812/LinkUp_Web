'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ExternalImage from '../ExternalImage'
import OnlineIndicator from '../OnlineIndicator'
import Modal from '../Modal'
import GifPicker from '../GifPicker'
import { useTranslation } from '../../hooks/useTranslation'
import { useEmojis } from '../../hooks/useEmojis'
import { useToast } from '../../contexts/ToastContext'
import { downloadMessageMedia, uploadMedia } from '../../api/chats'
import { getCallHistory } from '../../api/calls'
import { formatChatDate, formatChatTime } from '../../utils/chat'
import { EmojiImage, renderEmojiContent } from './EmojiImage'
import {
  EMOTION_GROUPS,
  emojiByCode,
  getEmotionEmojis,
  type EmojiGroup,
  type EmotionEmojiItem,
} from '../../utils/emojis'
import type {
  CallHistoryItem,
  ChatConversation,
  ChatMessage,
  EmojiItem,
  GifItem,
} from '../../types'
import type { ChatRoom } from '../../hooks/useChatRoom'
import { useCall, type CallPhase } from '../../contexts/CallContext'
import { usePresence } from '../../contexts/PresenceContext'
import styles from './ChatWindow.module.css'

const EMOTION_EMOJI_MAP = emojiByCode(getEmotionEmojis())

function singleEmojiCode(content: string, map: Map<string, EmojiItem>): string | null {
  const trimmed = content.trim()
  if (!trimmed.startsWith(':') || !trimmed.endsWith(':')) return null
  if (trimmed.includes(' ') || trimmed.includes('\n')) return null
  return map.has(trimmed) ? trimmed : null
}

function serializeContent(el: HTMLElement): string {
  let out = ''
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? ''
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const n = node as HTMLElement
    if (n.dataset.code) {
      out += n.dataset.code
      return
    }
    const tag = n.tagName
    if (tag === 'BR') {
      out += '\n'
      return
    }
    if (tag === 'DIV' || tag === 'P') {
      if (out && !out.endsWith('\n')) out += '\n'
      node.childNodes.forEach(walk)
      if (!out.endsWith('\n')) out += '\n'
      return
    }
    node.childNodes.forEach(walk)
  }
  walk(el)
  return out.replace(/\n{3,}/g, '\n\n')
}

interface ChatWindowProps {
  conversation: ChatConversation | null
  myUserId: string
  room: ChatRoom
  isEncrypted?: boolean
  onDeleteChat?: () => void
  mode?: 'direct' | 'group'
  groupName?: string
  memberCount?: number
  typingUsers?: Set<string>
  memberNames?: Map<string, { display_name: string; avatar_uri: string }>
  onOpenGroupSettings?: () => void
}

interface DeleteTarget {
  message: ChatMessage
}

type TimelineItem =
  | { kind: 'message'; msg: ChatMessage; created: number }
  | { kind: 'call'; item: CallHistoryItem; created: number }

const EMPTY_CALL_HISTORY: CallHistoryItem[] = []

// Cache media trong session: tránh tải lại blob khi mở lại hội thoại, và lưu
// tỉ lệ ảnh để render lại reserve đúng chỗ, giảm layout shift.
const mediaBlobCache = new Map<string, { url: string; isVideo: boolean }>()
const mediaRatioCache = new Map<string, { width: number; height: number }>()

function formatCallDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ChatWindow({
  conversation,
  myUserId,
  room,
  isEncrypted = false,
  onDeleteChat,
  mode = 'direct',
  groupName,
  memberCount,
  typingUsers,
  memberNames,
  onOpenGroupSettings,
}: ChatWindowProps) {
  const { t } = useTranslation()
  const {
    startCall,
    isInCall,
    phase: callPhase,
    call: activeCall,
  } = useCall()
  const { isOnline, prefetchPresence } = usePresence()
  const { emojis } = useEmojis()
  const emojiCodeMap = useMemo(() => {
    const map = new Map(EMOTION_EMOJI_MAP)
    for (const e of emojis.values()) map.set(e.code, e)
    return map
  }, [emojis])
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [searchActive, setSearchActive] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const pinToBottomRef = useRef(true)

  const partnerUserId = conversation?.partner.user_id ?? null

  useEffect(() => {
    if (partnerUserId) prefetchPresence([partnerUserId])
  }, [partnerUserId, prefetchPresence])

  const [historyByPartner, setHistoryByPartner] = useState<
    Map<string, CallHistoryItem[]>
  >(() => new Map())

  useEffect(() => {
    if (!partnerUserId) return
    if (historyByPartner.has(partnerUserId)) return
    let cancelled = false
    getCallHistory({ limit: 100 })
      .then((res) => {
        if (cancelled) return
        const items = res.data.filter(
          (item) => item.other_user.id === partnerUserId,
        )
        setHistoryByPartner((prev) => {
          const next = new Map(prev)
          next.set(partnerUserId, items)
          return next
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [partnerUserId, historyByPartner])

  // Cập nhật lịch sử cuộc gọi theo thời gian thực: khi cuộc gọi với đối tác hiện
  // tại kết thúc (cả 2 phía đều qua phase 'ended'), nạp lại history và merge để
  // cuộc gọi xuất hiện ngay trong timeline mà không cần reload.
  const prevCallPhaseRef = useRef<CallPhase>(callPhase)
  useEffect(() => {
    const prev = prevCallPhaseRef.current
    prevCallPhaseRef.current = callPhase
    if (prev === 'ended' || callPhase !== 'ended') return
    if (!activeCall || activeCall.peer.user_id !== partnerUserId) return
    let cancelled = false
    getCallHistory({ limit: 100 })
      .then((res) => {
        if (cancelled) return
        const items = res.data.filter(
          (item) => item.other_user.id === partnerUserId,
        )
        if (items.length === 0) return
        setHistoryByPartner((prevMap) => {
          const existing = prevMap.get(partnerUserId) ?? []
          const byId = new Map(existing.map((item) => [item.id, item]))
          for (const item of items) byId.set(item.id, item)
          const next = new Map(prevMap)
          next.set(
            partnerUserId,
            [...byId.values()].sort((a, b) => b.created_at - a.created_at),
          )
          return next
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [callPhase, activeCall, partnerUserId])

  const callHistory = partnerUserId
    ? (historyByPartner.get(partnerUserId) ?? EMPTY_CALL_HISTORY)
    : EMPTY_CALL_HISTORY

  const timeline = useMemo<TimelineItem[]>(() => {
    const msgs: TimelineItem[] = room.messages.map((msg) => ({
      kind: 'message',
      msg,
      created: new Date(msg.created_at).getTime(),
    }))
    const calls: TimelineItem[] = callHistory.map((item) => ({
      kind: 'call',
      item,
      created: item.created_at,
    }))
    return [...msgs, ...calls].sort((a, b) => a.created - b.created)
  }, [room.messages, callHistory])

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

// Bám đáy khi có tin nhắn / cuộc gọi mới; media load xong làm nội dung cao
  // thêm cũng được kéo xuống đáy nhờ ResizeObserver trên wrapper nội dung.
  // Không giật người dùng đang cuộn lên đọc lịch sử (xem handleMessagesScroll).
const prevTimelineLenRef = useRef(0)
  const programmaticScrollRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    programmaticScrollRef.current = true
    scroller.scrollTop = scroller.scrollHeight
  }, [])

  useEffect(() => {
    const el = timelineRef.current
    if (!el) return

    // Chỉ re-pin khi số mục timeline thay đổi (message/call mới) và không đang
    // xem kết quả tìm kiếm. Thay đổi ephemeral (typing) không kéo xuống đáy.
    const totalLen = room.messages.length + callHistory.length
    if (totalLen !== prevTimelineLenRef.current && room.searchResults === null) {
      pinToBottomRef.current = true
      scrollToBottom()
    }
    prevTimelineLenRef.current = totalLen

    const observer = new ResizeObserver(() => {
      if (pinToBottomRef.current && room.searchResults === null) {
        scrollToBottom()
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [room.messages.length, callHistory.length, room.searchResults, scrollToBottom])

  // Người dùng cuộn lên đọc lịch sử → không còn bám đáy. Các lần cuộn do
  // scrollToBottom() gây ra bị bỏ qua để tránh race làm mất trạng thái bám đáy.
  const handleMessagesScroll = () => {
    if (programmaticScrollRef.current) {
      programmaticScrollRef.current = false
      return
    }
    const el = scrollRef.current
    if (!el) return
    pinToBottomRef.current =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 24
  }

  const chatId = conversation?.chat_id ?? null
  useEffect(() => {
    if (chatId) pinToBottomRef.current = true
  }, [chatId])

  if (!conversation && mode !== 'group') {
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

  const searchResults = room.searchResults
  const inSearch = searchResults !== null

  const itemDate = (item: TimelineItem) =>
    formatChatDate(
      item.kind === 'message'
        ? item.msg.created_at
        : new Date(item.created).toISOString(),
      t,
    )

  return (
    <div className={styles.window}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          {mode === 'group' ? (
            <i className="bx bx-group" />
          ) : conversation?.partner.avatar_uri ? (
            <ExternalImage src={conversation.partner.avatar_uri} alt="" />
          ) : (
            <i className="bx bxs-user" />
          )}
          {mode === 'direct' && conversation && <OnlineIndicator isOnline={isOnline(conversation.partner.user_id)} />}
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.name}>
            {mode === 'group'
              ? (groupName || t('chat.groupChat'))
              : (conversation?.partner.display_name || t('chat.unknown'))
            }
          </span>
          {mode === 'group' && memberCount != null && (
            <span className={styles.memberCount}>{memberCount} {t('chat.members')}</span>
          )}
          {isEncrypted && (
            <span className={styles.e2eBadge} title={t('chat.e2eTitle')}>
              <i className="bx bxs-lock-alt" />
              {t('chat.e2eBadge')}
            </span>
          )}
        </div>
        {mode === 'direct' ? (
          <>
            <button
              className={styles.iconBtn}
              onClick={() => conversation && void startCall(conversation.partner, 'voice')}
              disabled={isInCall}
              aria-label={t('call.voiceCall')}
              title={t('call.voiceCall')}
            >
              <i className="bx bx-phone-call" />
            </button>
            <button
              className={styles.iconBtn}
              onClick={() => conversation && void startCall(conversation.partner, 'video')}
              disabled={isInCall}
              aria-label={t('call.videoCall')}
              title={t('call.videoCall')}
            >
              <i className="bx bx-video" />
            </button>
          </>
        ) : onOpenGroupSettings ? (
          <button
            className={styles.iconBtn}
            onClick={onOpenGroupSettings}
            aria-label={t('chat.groupSettings')}
            title={t('chat.groupSettings')}
          >
            <i className="bx bx-cog" />
          </button>
        ) : null}
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
                  {msg.sender_id === myUserId
                    ? t('chat.you')
                    : mode === 'group'
                      ? (memberNames?.get(msg.sender_id)?.display_name || t('chat.unknown'))
                      : (conversation?.partner.display_name || t('chat.unknown'))}
                </span>
                <span className={styles.searchResultContent}>
                  {msg.media_id
                    ? t('chat.mediaMessage')
                    : msg.emoji_id
                      ? emojis.get(msg.emoji_id)?.code || t('chat.emojiMessage')
                      : renderEmojiContent(msg.content, emojiCodeMap, `s-${msg.id}`, styles.emojiInline)}
                </span>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className={styles.messages} ref={scrollRef} onScroll={handleMessagesScroll}>
          {room.loading && (
            <div className={styles.center}>{t('common.loading')}</div>
          )}

          {!room.loading && timeline.length === 0 && (
            <div className={styles.center}>
              <p>{t('chat.noMessages')}</p>
            </div>
          )}

          <div ref={timelineRef} className={styles.timelineContent}>
            {timeline.map((item, i) => {
            const prev = timeline[i - 1]
            const showDate = !prev || itemDate(prev) !== itemDate(item)

            if (item.kind === 'call') {
              return (
                <Fragment key={`call-${item.item.id}`}>
                  {showDate && <div className={styles.dateSep}>{itemDate(item)}</div>}
                  <CallLogItem item={item.item} />
                </Fragment>
              )
            }

            const msg = item.msg
            const mine = msg.sender_id === myUserId
            const singleEmoji =
              !msg.deleted && !msg.decrypt_failed
                ? singleEmojiCode(msg.content ?? '', emojiCodeMap)
                : null
            const plain =
              !msg.deleted &&
              !msg.decrypt_failed &&
              ((!msg.content && Boolean(msg.media_id || msg.media_uri || msg.emoji_id)) ||
                (!msg.media_id && !msg.media_uri && !msg.emoji_id && singleEmoji !== null))
            const showSenderName = mode === 'group' && !mine
            const mapMember = showSenderName ? memberNames?.get(msg.sender_id) : null
            const senderDisplayName = msg.sender_name || mapMember?.display_name || null
            const senderAvatarUri = msg.sender_avatar || mapMember?.avatar_uri || null
            const senderMember = showSenderName ? { display_name: senderDisplayName || '', avatar_uri: senderAvatarUri || '' } : null
            return (
              <Fragment key={msg.id}>
                {showDate && (
                  <div className={styles.dateSep}>{itemDate(item)}</div>
                )}
                {showSenderName && (
                  <div className={styles.senderLine}>
                    {senderMember?.avatar_uri ? (
                      <ExternalImage src={senderMember.avatar_uri} alt="" className={styles.senderAvatar} />
                    ) : (
                      <div className={styles.senderAvatarPlaceholder}>
                        {(senderDisplayName || '?')[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className={styles.senderName}>{senderDisplayName || t('chat.unknown')}</span>
                  </div>
                )}
                <div className={`${styles.msgRow} ${mine ? styles.mine : styles.theirs}`}>
                  {msg.deleted ? (
                    <div className={styles.bubble}>
                      <span className={styles.deletedText}>{t('chat.messageDeleted')}</span>
                      <span className={styles.msgTime}>{formatChatTime(msg.created_at, t)}</span>
                    </div>
                  ) : msg.media_id && msg.content ? (
                    <div className={styles.msgStack}>
                      <div className={`${styles.bubble} ${styles.bubblePlain}`}>
                        <div className={styles.mediaWrap}>
                          <MessageMedia message={msg} />
                        </div>
                        <span className={styles.msgTime}>{formatChatTime(msg.created_at, t)}</span>
                      </div>
                      <div className={styles.bubble}>
                        {msg.decrypt_failed ? (
                          <span className={styles.deletedText}>
                            <i className="bx bxs-lock-alt" /> {t('chat.undecryptable')}
                          </span>
                        ) : (
                          <span className={styles.msgText}>
                            {renderEmojiContent(msg.content, emojiCodeMap, msg.id, styles.emojiInline)}
                          </span>
                        )}
                        <span className={styles.msgTime}>{formatChatTime(msg.created_at, t)}</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`${styles.bubble}${plain ? ` ${styles.bubblePlain}` : ''}`}
                    >
                      {(msg.media_id || msg.media_uri) && (
                        <div className={styles.mediaWrap}>
                          <MessageMedia message={msg} />
                        </div>
                      )}
                      {msg.emoji_id && !msg.media_id && !msg.media_uri && (
                        <EmojiBubble message={msg} emojis={emojis} />
                      )}
                      {msg.decrypt_failed ? (
                        <span className={styles.deletedText}>
                          <i className="bx bxs-lock-alt" /> {t('chat.undecryptable')}
                        </span>
                      ) : msg.content ? (
                        singleEmoji ? (
                          <EmojiImage
                            emoji={emojiCodeMap.get(singleEmoji)!}
                            className={styles.emojiMsg}
                          />
                        ) : (
                          <span className={styles.msgText}>
                            {renderEmojiContent(msg.content, emojiCodeMap, msg.id, styles.emojiInline)}
                          </span>
                        )
                      ) : null}
                      <span className={styles.msgTime}>{formatChatTime(msg.created_at, t)}</span>
                    </div>
                  )}
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

          {(mode === 'group' ? (typingUsers && typingUsers.size > 0) : room.partnerTyping) && (
            <div className={styles.typing}>
              <i className="bx bx-loader-circle bx-spin" />
              <span>
                {mode === 'group'
                  ? (() => {
                      const names = Array.from(typingUsers ?? []).map((uid) => memberNames?.get(uid)?.display_name || uid)
                      if (names.length === 1) return `${names[0]} ${t('chat.isTyping')}`
                      if (names.length === 2) return `${names[0]} ${t('chat.and')} ${names[1]} ${t('chat.isTyping')}`
                      return t('chat.multiplePeopleTyping')
                    })()
                  : t('chat.typing')
                }
              </span>
            </div>
          )}
          </div>
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
  const downloadRequired = !message.media_uri
  const cached = mediaBlobCache.get(message.id)
  const cachedRatio = mediaRatioCache.get(message.id)
  const [src, setSrc] = useState<string | null>(
    message.media_uri ?? cached?.url ?? null,
  )
  const [isVideo, setIsVideo] = useState(
    message.media_type?.startsWith('video/') ?? cached?.isVideo ?? false,
  )
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(() => !!(message.media_uri ?? cached?.url))
  const [ratio, setRatio] = useState<{ width: number; height: number } | null>(
    cachedRatio ?? null,
  )
  const objectUrlRef = useRef<string | null>(null)
  const boxRef = useRef<HTMLSpanElement>(null)

  const needsDownload = downloadRequired && !src

  useEffect(() => {
    if (!needsDownload) return
    if (mediaBlobCache.has(message.id)) return
    let cancelled = false
    let started = false
    let observer: IntersectionObserver | null = null
    const runDownload = () => {
      if (started || cancelled) return
      started = true
      downloadMessageMedia(message.id)
        .then((blob) => {
          if (cancelled) return
          const url = URL.createObjectURL(blob)
          const isVideoBlob = blob.type.startsWith('video/')
          mediaBlobCache.set(message.id, { url, isVideo: isVideoBlob })
          objectUrlRef.current = url
          setSrc(url)
          setIsVideo(isVideoBlob)
        })
        .catch(() => {
          if (cancelled) return
          setFailed(true)
        })
    }
    if (typeof IntersectionObserver === 'undefined') {
      runDownload()
    } else {
      const el = boxRef.current
      if (!el) {
        runDownload()
      } else {
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              runDownload()
              observer?.disconnect()
            }
          },
          { rootMargin: '200px' },
        )
        observer.observe(el)
      }
    }
    return () => {
      cancelled = true
      observer?.disconnect()
      if (
        objectUrlRef.current &&
        mediaBlobCache.get(message.id)?.url !== objectUrlRef.current
      ) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
      objectUrlRef.current = null
    }
  }, [message.id, message.media_uri, needsDownload])

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true)
    const img = e.currentTarget
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      const dims = { width: img.naturalWidth, height: img.naturalHeight }
      mediaRatioCache.set(message.id, dims)
      setRatio(dims)
    }
  }

  const loading = !src && !failed
  if (loading) {
    return (
      <span ref={boxRef} className={styles.mediaLoading}>
        <i className="bx bx-loader-circle bx-spin" />
      </span>
    )
  }
  if (failed || !src) {
    return <span className={styles.deletedText}>{t('chat.mediaFailed')}</span>
  }
  if (isVideo) {
    return (
      <video
        src={src}
        controls
        muted
        playsInline
        preload="metadata"
        className={styles.mediaEl}
      />
    )
  }
  return (
    <span
      ref={boxRef}
      className={`${styles.mediaBox}${loaded ? '' : ` ${styles.mediaBoxLoading}`}`}
    >
      {!loaded && (
        <span className={styles.mediaLoading}>
          <i className="bx bx-loader-circle bx-spin" />
        </span>
      )}
      <ExternalImage
        src={src}
        alt=""
        className={styles.mediaEl}
        onLoad={handleImageLoad}
        loading="eager"
        decoding="async"
        style={ratio ? { aspectRatio: `${ratio.width} / ${ratio.height}` } : undefined}
      />
    </span>
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

interface CallLogItemProps {
  item: CallHistoryItem
}

function CallLogItem({ item }: CallLogItemProps) {
  const { t } = useTranslation()
  const mine = item.direction === 'outgoing'
  const isVideo = item.call_type === 'video'
  const missed = item.is_missed
  const typeLabel = isVideo ? t('call.videoCall') : t('call.voiceCall')
  const label = missed
    ? t('call.historyMissed')
    : `${mine ? t('call.historyOutgoing') : t('call.historyIncoming')} • ${typeLabel}`
  const icon = isVideo
    ? 'bx-video'
    : missed
      ? 'bx-phone-missed'
      : mine
        ? 'bx-phone-call'
        : 'bx-phone-incoming'
  const showDuration = !missed && item.duration > 0

  return (
    <div className={`${styles.callRow} ${mine ? styles.callMine : styles.callTheirs}`}>
      <div className={`${styles.callBubble}${missed ? ` ${styles.callMissed}` : ''}`}>
        <i className={`bx ${icon}`} />
        <span className={styles.callLabel}>{label}</span>
        {showDuration && (
          <span className={styles.callDuration}>
            {formatCallDuration(item.duration)}
          </span>
        )}
        <span className={styles.callTime}>
          {formatChatTime(new Date(item.created_at).toISOString(), t)}
        </span>
      </div>
    </div>
  )
}

const SINGLE_URL_RE = /^https?:\/\/\S+$/i

function isSingleImageUrl(text: string): boolean {
  const trimmed = text.trim()
  if (!SINGLE_URL_RE.test(trimmed)) return false
  try {
    const u = new URL(trimmed)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function imageExtension(contentType: string): string {
  switch (contentType.split(';')[0].trim()) {
    case 'image/jpeg':
      return '.jpg'
    case 'image/gif':
      return '.gif'
    case 'image/webp':
      return '.webp'
    case 'image/png':
    default:
      return '.png'
  }
}

function normalizePastedFile(file: File): File {
  if (file.name && /\.[a-z0-9]+$/i.test(file.name)) return file
  return new File([file], `pasted-image${imageExtension(file.type)}`, { type: file.type })
}

async function fetchRemoteImage(url: string): Promise<File | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) return null
    const blob = await res.blob()
    return new File([blob], `image${imageExtension(contentType)}`, { type: contentType })
  } catch {
    return null
  }
}

interface ComposerProps {
  room: ChatRoom
}

function Composer({ room }: ComposerProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [value, setValue] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [emojiGroup, setEmojiGroup] = useState<EmojiGroup>('positive')
  const [gifOpen, setGifOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const attachmentUrlRef = useRef<string | null>(null)
  const inputRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const toggleEmojiRef = useRef<HTMLButtonElement>(null)
  const gifPickerRef = useRef<HTMLDivElement>(null)
  const toggleGifRef = useRef<HTMLButtonElement>(null)
  const lastTypingRef = useRef(0)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const emotions = useMemo(() => getEmotionEmojis(), [])
  const emotionGroups = useMemo(() => {
    const map = new Map<EmojiGroup, EmotionEmojiItem[]>()
    for (const g of EMOTION_GROUPS) {
      map.set(g, emotions.filter((e) => e.group === g))
    }
    return map
  }, [emotions])

  const sendTyping = room.sendTyping

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
      if (attachmentUrlRef.current) URL.revokeObjectURL(attachmentUrlRef.current)
      sendTyping(false)
    }
  }, [sendTyping])

  const attachFile = (file: File) => {
    if (attachmentUrlRef.current) URL.revokeObjectURL(attachmentUrlRef.current)
    const url = URL.createObjectURL(file)
    attachmentUrlRef.current = url
    setAttachment(file)
    setAttachmentUrl(url)
  }

  const clearAttachment = () => {
    if (attachmentUrlRef.current) URL.revokeObjectURL(attachmentUrlRef.current)
    attachmentUrlRef.current = null
    setAttachment(null)
    setAttachmentUrl(null)
  }

  useEffect(() => {
    if (!emojiOpen && !gifOpen) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (pickerRef.current?.contains(target)) return
      if (toggleEmojiRef.current?.contains(target)) return
      if (gifPickerRef.current?.contains(target)) return
      if (toggleGifRef.current?.contains(target)) return
      setEmojiOpen(false)
      setGifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [emojiOpen, gifOpen])

  const insertNodeAtCaret = (node: Node) => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    let range: Range
    if (sel && sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      range = sel.getRangeAt(0)
    } else {
      range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
    }
    range.deleteContents()
    range.insertNode(node)
    range.setStartAfter(node)
    range.collapse(true)
    sel?.removeAllRanges()
    sel?.addRange(range)
    setValue(serializeContent(el))
  }

  const insertEmoji = (emoji: EmotionEmojiItem) => {
    const img = document.createElement('img')
    img.src = emoji.image_uri
    img.alt = emoji.code
    img.dataset.code = emoji.code
    img.className = 'emojiInline'
    insertNodeAtCaret(img)
  }

  const insertText = (text: string) => {
    insertNodeAtCaret(document.createTextNode(text))
  }

  const handleInput = () => {
    const el = inputRef.current
    if (!el) return
    const v = serializeContent(el)
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
    if (inputRef.current) inputRef.current.innerHTML = ''
    setEmojiOpen(false)
    sendTyping(false)
  }

  const selectGif = (gif: GifItem) => {
    room.sendMessage('', {
      gifUrl: gif.preview,
      mediaUri: gif.preview,
      mediaType: 'image/gif',
    })
    setGifOpen(false)
  }

  const sendFile = async (file: File, caption: string): Promise<boolean> => {
    if (uploading) return false
    setUploading(true)
    try {
      const res = await uploadMedia(file)
      room.sendMessage(caption, {
        mediaId: res.data.id,
        mediaUri: res.data.file_uri,
        mediaType: res.data.file_type,
      })
      return true
    } catch {
      toast({ type: 'error', title: t('chat.uploadFailed') })
      return false
    } finally {
      setUploading(false)
    }
  }

  const send = async (opts?: { emojiId?: string; mediaId?: string; mediaUri?: string; mediaType?: string }) => {
    if (!value.trim() && !opts?.emojiId && !opts?.mediaId && !attachment) return
    const text = value

    if (attachment) {
      const ok = await sendFile(attachment, text)
      if (ok) {
        clearAttachment()
        resetComposer()
      }
      return
    }

    // Toàn bộ tin là một URL duy nhất → thử tải ảnh về rồi gửi dạng media.
    if (!opts && isSingleImageUrl(text)) {
      const file = await fetchRemoteImage(text)
      if (file) {
        resetComposer()
        const ok = await sendFile(file, '')
        if (ok) return
        // Upload ảnh thất bại → fallback gửi URL dạng text để không mất tin nhắn.
        room.sendMessage(text)
        return
      }
    }

    room.sendMessage(text, opts)
    resetComposer()
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || uploading) return
    attachFile(file)
  }

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items
    let file: File | null = null
    if (items) {
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          file = item.getAsFile()
          break
        }
      }
    }
    if (file) {
      e.preventDefault()
      attachFile(normalizePastedFile(file))
      return
    }
    const text = e.clipboardData.getData('text/plain')
    if (text) {
      e.preventDefault()
      insertText(text)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className={styles.composer}>
      {attachment && (
        <div className={styles.attachmentBar}>
          {attachmentUrl && (
            <span className={styles.attachmentThumb}>
              {attachment.type.startsWith('video/') ? (
                <video src={attachmentUrl} muted preload="metadata" />
              ) : (
                <ExternalImage src={attachmentUrl} alt="" />
              )}
            </span>
          )}
          <span className={styles.attachmentName}>{attachment.name}</span>
          <button
            type="button"
            className={styles.attachmentRemove}
            onClick={clearAttachment}
            title={t('chat.removeAttachment')}
            aria-label={t('chat.removeAttachment')}
          >
            <i className="bx bx-x" />
          </button>
        </div>
      )}
      <div className={styles.composerRow}>
        <div className={styles.composerActions}>
          <button
            ref={toggleEmojiRef}
            className={`${styles.iconBtn} ${emojiOpen ? styles.iconBtnActive : ''}`}
            onClick={() => {
              setGifOpen(false)
              setEmojiOpen((prev) => !prev)
            }}
            aria-label={t('chat.emojiPicker')}
            title={t('chat.emojiPicker')}
          >
            <i className="bx bxs-smile" />
          </button>
          <button
            ref={toggleGifRef}
            className={`${styles.iconBtn} ${gifOpen ? styles.iconBtnActive : ''}`}
            onClick={() => {
              setEmojiOpen(false)
              setGifOpen((prev) => !prev)
            }}
            aria-label={t('chat.gif')}
            title={t('chat.gif')}
          >
            <i className="bx bx-movie" />
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
        <div
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label={t('chat.placeholder')}
          className={styles.composerInput}
          data-placeholder={t('chat.placeholder')}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
        <button
          className={styles.sendBtn}
          onClick={() => send()}
          disabled={(!value.trim() && !attachment) || uploading}
          aria-label={t('chat.send')}
        >
          <i className={uploading ? 'bx bx-loader-circle bx-spin' : 'bx bx-send'} />
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={handleFile} />
      {emojiOpen && (
        <div ref={pickerRef} className={styles.emojiPicker}>
          <div className={styles.emojiTabs}>
            {EMOTION_GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                className={`${styles.emojiTab} ${emojiGroup === g ? styles.emojiTabActive : ''}`}
                onClick={() => setEmojiGroup(g)}
              >
                {t(`chat.emojiCat.${g}`)}
              </button>
            ))}
          </div>
          <div className={styles.emojiGrid}>
            {emotionGroups.get(emojiGroup)?.map((e) => (
              <button
                key={e.id}
                type="button"
                className={styles.emojiItem}
                onClick={() => insertEmoji(e)}
                title={`${e.label} ${e.code}`}
              >
                <EmojiImage emoji={e} className={styles.emojiItemImg} />
              </button>
            ))}
          </div>
        </div>
      )}
      {gifOpen && (
        <div ref={gifPickerRef} className={styles.gifPickerWrap}>
          <GifPicker placement="top" onSelect={selectGif} onClose={() => setGifOpen(false)} />
        </div>
      )}
    </div>
  )
}
