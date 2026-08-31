'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ExternalImage from '../ExternalImage'
import OnlineIndicator from '../OnlineIndicator'
import Modal from '../Modal'
import GifPicker from '../GifPicker'
import { useTranslation } from '../../hooks/useTranslation'
import { useEmojis } from '../../hooks/useEmojis'
import { useToast } from '../../contexts/ToastContext'
import { uploadChatMedia } from '../../api/chats'
import { getCallHistory } from '../../api/calls'
import { formatChatDate, formatChatTime } from '../../utils/chat'
import { EmojiImage, renderEmojiContent } from './EmojiImage'
import GroupInviteBubble from './GroupInviteBubble'
import VideoLinkPreview from './VideoLinkPreview'
import { extractVideoUrls } from '../../utils/videoLink'
import { groupMediaTimeline } from '../../utils/chatMediaGroup'
import {
  useMessageMedia,
  mediaRatioCache,
} from './useMessageMedia'
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
  PinnedMessage,
} from '../../types'
import type { GroupCallHistoryItem, GroupCallJoinRequestState } from '../../types/groupCall'
import type { ChatRoom } from '../../hooks/useChatRoom'
import { useCall, type CallPhase } from '../../contexts/CallContext'
import { useGroupCall } from '../../contexts/GroupCallContext'
import { usePresence } from '../../contexts/PresenceContext'
import GroupCallMemberSelectModal from '../calls/GroupCallMemberSelectModal'
import GroupCallRequestJoinModal from '../calls/GroupCallRequestJoinModal'
import GroupCallMessage from './GroupCallMessage'
import ChatMediaLightbox from './ChatMediaLightbox'
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
  groupChatId?: string | null
  groupName?: string
  groupAvatarUri?: string
  memberCount?: number
  typingUsers?: Set<string>
  memberNames?: Map<string, { display_name: string; avatar_uri: string }>
  onOpenGroupSettings?: () => void
  onGroupInviteAccepted?: (groupChatId: string) => void
  groupCallHistory?: GroupCallHistoryItem[]
  activeGroupCallId?: string | null
}

interface DeleteTarget {
  message: ChatMessage
}

type TimelineItem =
  | { kind: 'message'; msg: ChatMessage; created: number }
  | { kind: 'call'; item: CallHistoryItem; created: number }
  | { kind: 'group_call'; call: GroupCallHistoryItem; created: number }

const EMPTY_CALL_HISTORY: CallHistoryItem[] = []

// ── Media grouping (Messenger-style stacked media) ────────────────────────
// Nhóm các media message liền kề từ cùng 1 người gửi thành một group. Chỉ
// nhóm tin media-only (không text) hoặc tin đầu tiên trong group có caption.

type GroupedTimelineItem =
  | TimelineItem
  | { kind: 'media_group'; msgs: ChatMessage[]; created: number }

interface MediaStackProps {
  msgs: ChatMessage[]
  onOpen?: (msgs: ChatMessage[], index: number) => void
}

function MediaStack({ msgs, onOpen }: MediaStackProps) {
  const count = msgs.length
  const open = (index: number) => onOpen?.(msgs, index)

  if (count === 1) {
    return (
      <div className={styles.mediaWrap}>
        <MessageMedia message={msgs[0]} onClick={() => open(0)} />
      </div>
    )
  }

  if (count === 2) {
    return (
      <div className={styles.mediaStack2}>
        {msgs.map((m, i) => (
          <div key={m.id} className={styles.mediaWrap}>
            <MessageMedia message={m} onClick={() => open(i)} />
          </div>
        ))}
        <span className={styles.mediaCountBadge}>{count}</span>
      </div>
    )
  }

  // 3+ items: card stack
  const visible = msgs.slice(0, 3)

  return (
    <div className={styles.mediaStack}>
      {visible.map((m, idx) => (
        <div
          key={m.id}
          className={styles.mediaStackItem}
          onClick={() => open(idx)}
          style={{
            zIndex: 3 - idx,
            transform: `translateY(${idx * 14}px) rotate(${idx === 1 ? 2 : idx === 2 ? -1.5 : 0}deg)`,
          }}
        >
          <MessageMedia message={m} />
        </div>
      ))}
      <span className={styles.mediaCountBadge}>{count}</span>
    </div>
  )
}

function formatCallDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getSystemMessageText(
  msg: ChatMessage,
  memberNames?: Map<string, { display_name: string; avatar_uri: string }>,
  t?: (key: string, params?: Record<string, string>) => string,
): string {
  if (!t) return msg.content
  if (msg.message_category !== 'system') return msg.content

  const hasNewFormat = msg.content.includes('|')
  if (!hasNewFormat) return msg.content

  const parts = msg.content.split('|')
  const translationKey = parts[0]
  const actorId = parts[1] || ''
  const extraParam = parts[2] || ''

  const actorName = actorId ? (memberNames?.get(actorId)?.display_name || actorId) : ''

  switch (translationKey) {
    case 'member_left':
      return t('chat.systemMemberLeft', { name: actorName })
    case 'member_joined':
      return t('chat.systemMemberJoined', { name: actorName })
    case 'member_invited':
      return t('chat.systemMemberInvited', { name: actorName })
    case 'admin_transferred':
      return t('chat.systemAdminTransferred', { name: actorName })
    case 'group_settings_updated':
    case 'group_name_changed':
      return t('chat.systemGroupNameChanged', { name: actorName, groupName: extraParam })
    case 'group_avatar_changed':
      return t('chat.systemGroupAvatarChanged', { name: actorName })
    case 'call_started':
      return t('chat.callStarted')
    case 'call_ended':
      return t('chat.callEnded', { name: actorName })
    case 'call_timeout':
      return t('chat.callTimeout')
    default:
      return msg.content
  }
}

export default function ChatWindow({
  conversation,
  myUserId,
  room,
  isEncrypted = false,
  onDeleteChat,
  mode = 'direct',
  groupChatId,
  groupName,
  groupAvatarUri,
  memberCount,
  typingUsers,
  memberNames,
  onOpenGroupSettings,
  onGroupInviteAccepted,
  groupCallHistory = [],
  activeGroupCallId = null,
}: ChatWindowProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const {
    startCall,
    isInCall,
    phase: callPhase,
    call: activeCall,
  } = useCall()
  const {
    phase: groupCallPhase,
    call: groupCall,
    startGroupCall,
    joinGroupCall,
    isInGroupCall,
  } = useGroupCall()
  const { isOnline, prefetchPresence } = usePresence()
  const { emojis } = useEmojis()
  const emojiCodeMap = useMemo(() => {
    const map = new Map(EMOTION_EMOJI_MAP)
    for (const e of emojis.values()) map.set(e.code, e)
    return map
  }, [emojis])
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null)
  const [searchActive, setSearchActive] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [newMessagesCount, setNewMessagesCount] = useState(0)
  const [showMemberSelectModal, setShowMemberSelectModal] = useState(false)
  const [joinRequestState, setJoinRequestState] = useState<GroupCallJoinRequestState | null>(null)
  const [lightbox, setLightbox] = useState<{ msgs: ChatMessage[]; index: number } | null>(null)
  const openLightbox = useCallback((msgs: ChatMessage[], index: number) => {
    setLightbox({ msgs, index })
  }, [])
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const pinToBottomRef = useRef(true)

  const partnerUserId = conversation?.partner.user_id ?? null

  const handleRequestJoin = useCallback(
    (callId: string) => {
      const gc = groupCallHistory.find((c) => c.call_id === callId)
      if (!gc) return
      setJoinRequestState({
        callId,
        callerId: gc.caller_id,
        participantCount: gc.participants.length,
      })
    },
    [groupCallHistory],
  )

  const handleConfirmJoinRequest = useCallback(() => {
    if (!joinRequestState) return
    void joinGroupCall(joinRequestState.callId)
    setJoinRequestState(null)
  }, [joinRequestState, joinGroupCall])

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
    const groupCalls: TimelineItem[] = groupCallHistory.map((gc) => ({
      kind: 'group_call',
      call: gc,
      created: new Date(gc.created_at).getTime(),
    }))
    return [...msgs, ...calls, ...groupCalls].sort((a, b) => a.created - b.created)
  }, [room.messages, callHistory, groupCallHistory])

  const groupedTimeline = useMemo<GroupedTimelineItem[]>(
    () => (room.searchResults === null ? groupMediaTimeline(timeline) : timeline.map((t) => t)),
    [timeline, room.searchResults],
  )

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
      if (pinToBottomRef.current) {
        scrollToBottom()
      } else {
        setNewMessagesCount((prev) => prev + (totalLen - prevTimelineLenRef.current))
      }
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
      setNewMessagesCount(0)
      return
    }
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24
    pinToBottomRef.current = atBottom
    if (atBottom) setNewMessagesCount(0)
    // Cuộn lên chạm đầu danh sách → tải thêm tin cũ hơn.
    if (!room.loading && !room.loadingMore && room.hasMore && el.scrollTop <= 48) {
      room.loadMoreMessages()
    }
  }

  const chatId = conversation?.chat_id ?? groupChatId ?? null
  useEffect(() => {
    if (chatId) pinToBottomRef.current = true
  }, [chatId])

  const handleStartGroupCall = useCallback(
    (selectedIds: string[]) => {
      if (chatId) {
        void startGroupCall(chatId, selectedIds)
      }
    },
    [chatId, startGroupCall],
  )

  const scrollToMessage = useCallback((messageId: string) => {
    const el = timelineRef.current?.querySelector(`[data-message-id="${messageId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedMsgId(messageId)
      setTimeout(() => setHighlightedMsgId(null), 1500)
    }
  }, [])

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
  const pinnedMessages = room.pinnedMessages
  const pinMessage = room.pinMessage
  const unpinMessage = room.unpinMessage

  const itemDate = (item: GroupedTimelineItem) =>
    formatChatDate(
      item.kind === 'message'
        ? item.msg.created_at
        : item.kind === 'media_group'
          ? item.msgs[0].created_at
          : new Date(item.created).toISOString(),
      t,
    )

  return (
    <div className={styles.window}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          {mode === 'group' ? (
            groupAvatarUri ? (
              <ExternalImage src={groupAvatarUri} alt="" />
            ) : (
              <i className="bx bx-group" />
            )
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
        ) : mode === 'group' ? (
          <>
            <button
              className={styles.iconBtn}
              onClick={() => setShowMemberSelectModal(true)}
              disabled={isInGroupCall || isInCall}
              aria-label={t('call.videoCall')}
              title={t('call.videoCall')}
            >
              <i className="bx bx-video" />
            </button>
            {onOpenGroupSettings && (
              <button
                className={styles.iconBtn}
                onClick={onOpenGroupSettings}
                aria-label={t('chat.groupSettings')}
                title={t('chat.groupSettings')}
              >
                <i className="bx bx-cog" />
              </button>
            )}
          </>
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

      {mode === 'group' && groupCall && groupCall.chatId === chatId && (groupCallPhase === 'active' || groupCallPhase === 'minimized') && (
        <div className={styles.callBanner}>
          <i className="bx bx-video" />
          <span>{t('groupCall.inCall')}</span>
          <button
            className={styles.callBannerBtn}
            onClick={() => groupCallPhase === 'minimized' ? undefined : undefined}
          >
            {t('groupCall.expand')}
          </button>
        </div>
      )}

      {pinnedMessages.length > 0 && !inSearch && (
        <div className={styles.pinnedBar}>
          <div className={styles.pinnedBarHeader}>
            <i className="bx bx-pin" />
            <span>{t('chat.pinnedMessages')} ({pinnedMessages.length})</span>
          </div>
          {pinnedMessages.map((pin) => (
            <div
              key={pin.message_id}
              className={styles.pinnedBarItem}
              onClick={() => scrollToMessage(pin.message_id)}
            >
              <div className={styles.pinnedBarItemContent}>
                <span className={styles.pinnedBarItemSender}>{pin.sender_name || t('chat.unknown')}</span>
                <span className={styles.pinnedBarItemText}>
                  {pin.content.length > 60 ? pin.content.slice(0, 60) + '...' : pin.content || t('chat.attachment')}
                </span>
              </div>
              <button
                className={styles.pinnedBarRemove}
                onClick={(e) => {
                  e.stopPropagation()
                  unpinMessage(pin.message_id)
                }}
                title={t('chat.unpin')}
                aria-label={t('chat.unpin')}
              >
                <i className="bx bx-x" />
              </button>
            </div>
          ))}
        </div>
      )}

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

          {!room.loading && timeline.length > 0 && (room.hasMore || room.loadingMore) && (
            <div className={styles.loadMore}>
              {room.loadingMore && <i className="bx bx-loader-circle" />}
              <span>{room.loadingMore ? t('chat.loadingOlder') : t('chat.scrollForOlder')}</span>
            </div>
          )}

          <div ref={timelineRef} className={styles.timelineContent}>
            {groupedTimeline.map((item, i) => {
            const prev = groupedTimeline[i - 1]
            const showDate = !prev || itemDate(prev) !== itemDate(item)

            if (item.kind === 'media_group') {
              const mine = item.msgs[0].sender_id === myUserId
              const first = item.msgs[0]
              const showSenderName = mode === 'group' && !mine
              const mapMember = showSenderName ? memberNames?.get(first.sender_id) : null
              const senderDisplayName = first.sender_name || mapMember?.display_name || null
              const senderAvatarUri = first.sender_avatar || mapMember?.avatar_uri || null
              const senderMember = showSenderName ? { display_name: senderDisplayName || '', avatar_uri: senderAvatarUri || '' } : null
              return (
                <Fragment key={`mg-${item.msgs.map((m) => m.id).join('-')}`}>
                  {showDate && (
                    <div className={styles.dateSep}>{itemDate(item)}</div>
                  )}
                  {showSenderName && (
                    <div className={styles.senderLine} onClick={() => router.push(`/profile/${first.sender_id}`)}>
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
                  <div
                    className={`${styles.msgRow} ${mine ? styles.mine : styles.theirs}`}
                    data-message-id={first.id}
                  >
                    {item.msgs[0].content?.trim() ? (
                      <div className={styles.msgStack}>
                        <div className={`${styles.bubble} ${styles.bubblePlain}`}>
                          <MediaStack msgs={item.msgs} onOpen={openLightbox} />
                          {item.msgs[0].content?.trim() && (
                            <div className={styles.msgText}>
                              {!item.msgs[0].decrypt_failed &&
                                renderEmojiContent(item.msgs[0].content ?? '', emojiCodeMap, `mg-${first.id}`, styles.emojiInline)}
                            </div>
                          )}
                          <span className={styles.msgTime}>{formatChatTime(first.created_at, t)}</span>
                        </div>
                      </div>
                    ) : (
                      <MediaStack msgs={item.msgs} onOpen={openLightbox} />
                    )}
                  </div>
                </Fragment>
              )
            }

            if (item.kind === 'call') {
              return (
                <Fragment key={`call-${item.item.id}`}>
                  {showDate && <div className={styles.dateSep}>{itemDate(item)}</div>}
                  <CallLogItem item={item.item} />
                </Fragment>
              )
            }

            if (item.kind === 'group_call') {
              return (
                <Fragment key={`gc-${item.call.call_id}`}>
                  {showDate && <div className={styles.dateSep}>{itemDate(item)}</div>}
                  <GroupCallMessage
                    call={item.call}
                    myUserId={myUserId}
                    memberNames={memberNames}
                    isMine={item.call.caller_id === myUserId}
                    isActive={activeGroupCallId === item.call.call_id}
                    onRequestJoin={handleRequestJoin}
                  />
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
            const videoUrls = !msg.deleted && !msg.decrypt_failed && msg.content
              ? extractVideoUrls(msg.content)
              : []
            const isSingleVideo = videoUrls.length === 1 && videoUrls[0] === msg.content?.trim()
            return (
              <Fragment key={msg.id}>
                {showDate && (
                  <div className={styles.dateSep}>{itemDate(item)}</div>
                )}
                {(msg.message_category === 'system' || msg.sender_id === 'SYSTEM' || msg.type === 'member_invited' || msg.type === 'member_joined' || msg.type === 'member_left' || msg.type === 'admin_transferred' || msg.type === 'group_settings_updated') ? (
                  <div className={styles.systemMessage} data-message-id={msg.id}>
                    <span className={styles.systemMessageText}>
                      {getSystemMessageText(msg, memberNames, t)}
                    </span>
                  </div>
                ) : msg.type === 'group_invite' ? (
                  <div data-message-id={msg.id}>
                    <GroupInviteBubble
                      message={msg}
                      myUserId={myUserId}
                      onAccepted={onGroupInviteAccepted}
                    />
                  </div>
                ) : msg.type === 'shared_post' ? (
                <div className={`${styles.msgRow} ${mine ? styles.mine : styles.theirs}`}>
                  <div className={styles.bubble}>
                    <div className={styles.sharedPostHeader}>
                      <i className="bx bx-revision" />
                      <span>{t('chat.sharedPost')}</span>
                    </div>
                    {msg.shared_post ? (
                      <a
                        href={`/posts/${msg.shared_post_id}`}
                        className={styles.sharedPostCard}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {msg.shared_post.media_uri && (
                          <ExternalImage
                            src={msg.shared_post.media_uri}
                            alt=""
                            className={styles.sharedPostImage}
                          />
                        )}
                        <div className={styles.sharedPostContent}>
                          <div className={styles.sharedPostAuthor}>
                            {msg.shared_post.avatar_uri && (
                              <ExternalImage
                                src={msg.shared_post.avatar_uri}
                                alt=""
                                className={styles.sharedPostAvatar}
                              />
                            )}
                            <span className={styles.sharedPostName}>
                              {msg.shared_post.display_name}
                            </span>
                          </div>
                          {msg.shared_post.title && (
                            <div className={styles.sharedPostTitle}>{msg.shared_post.title}</div>
                          )}
                          {msg.shared_post.content && (
                            <div className={styles.sharedPostText}>
                              {msg.shared_post.content.length > 120
                                ? msg.shared_post.content.slice(0, 120) + '...'
                                : msg.shared_post.content}
                            </div>
                          )}
                        </div>
                      </a>
                    ) : (
                      <div className={styles.sharedPostPlaceholder}>
                        <span>{t('chat.postNotAvailable')}</span>
                      </div>
                    )}
                    <span className={styles.msgTime}>{formatChatTime(msg.created_at, t)}</span>
                  </div>
                </div>
                ) : (
                <>
                {showSenderName && (
                  <div className={styles.senderLine} onClick={() => router.push(`/profile/${msg.sender_id}`)}>
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
                <div className={`${styles.msgRow} ${mine ? styles.mine : styles.theirs} ${highlightedMsgId === msg.id ? styles.highlight : ''}`} data-message-id={msg.id}>
                  {pinnedMessages.some((p) => p.message_id === msg.id) && (
                    <span className={styles.pinBadge} title={t('chat.pinnedMessage')}>
                      <i className="bx bx-pin" />
                    </span>
                  )}
                  {msg.deleted ? (
                    <div className={styles.bubble}>
                      <span className={styles.deletedText}>{t('chat.messageDeleted')}</span>
                      <span className={styles.msgTime}>{formatChatTime(msg.created_at, t)}</span>
                    </div>
                  ) : msg.media_id && msg.content ? (
                    <div className={styles.msgStack}>
                      <div className={`${styles.bubble} ${styles.bubblePlain}`}>
                        <div className={styles.mediaWrap}>
                          <MessageMedia message={msg} onClick={() => openLightbox([msg], 0)} />
                        </div>
                        <span className={styles.msgTime}>{formatChatTime(msg.created_at, t)}</span>
                      </div>
                      <div className={styles.bubble}>
                        {msg.reply_to && (
                          <div
                            className={styles.replySnippet}
                            onClick={() => msg.reply_to?.id && scrollToMessage(msg.reply_to.id)}
                          >
                            <div className={styles.replySnippetHeader}>
                              <i className="bx bx-reply" />
                              <span className={styles.replySnippetName}>{msg.reply_to.sender_name || t('chat.unknown')}</span>
                            </div>
                            <span className={styles.replySnippetText}>
                              {msg.decrypt_failed
                                ? t('chat.attachment')
                                : msg.reply_to.content || t('chat.attachment')}
                            </span>
                          </div>
                        )}
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
                      className={`${styles.bubble}${(plain || isSingleVideo) ? ` ${styles.bubblePlain}` : ''}`}
                    >
                      {msg.reply_to && (
                        <div
                          className={styles.replySnippet}
                          onClick={() => msg.reply_to?.id && scrollToMessage(msg.reply_to.id)}
                        >
                          <div className={styles.replySnippetHeader}>
                            <i className="bx bx-reply" />
                            <span className={styles.replySnippetName}>{msg.reply_to.sender_name || t('chat.unknown')}</span>
                          </div>
                          <span className={styles.replySnippetText}>
                            {msg.reply_to.content || t('chat.attachment')}
                          </span>
                        </div>
                      )}
                      {(msg.media_id || msg.media_uri) && (
                        <div className={styles.mediaWrap}>
                          <MessageMedia message={msg} onClick={() => openLightbox([msg], 0)} />
                        </div>
                      )}
                      {msg.emoji_id && !msg.media_id && !msg.media_uri && (
                        <EmojiBubble message={msg} emojis={emojis} />
                      )}
                      {msg.decrypt_failed ? (
                        <span className={styles.deletedText}>
                          <i className="bx bxs-lock-alt" /> {t('chat.undecryptable')}
                        </span>
                      ) : isSingleVideo ? (
                        <VideoLinkPreview url={videoUrls[0]} />
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
                      {videoUrls.length > 0 && !isSingleVideo && (
                        <div className={styles.videoPreviewStack}>
                          {videoUrls.map((vUrl) => (
                            <VideoLinkPreview key={vUrl} url={vUrl} />
                          ))}
                        </div>
                      )}
                      <span className={styles.msgTime}>{formatChatTime(msg.created_at, t)}</span>
                    </div>
                  )}
                  {!msg.deleted && (
                    <>
                      <button
                        className={styles.replyBtn}
                        onClick={() => setReplyingTo(msg)}
                        aria-label={t('chat.reply')}
                        title={t('chat.reply')}
                      >
                        <i className="bx bx-reply" />
                      </button>
                      {pinnedMessages.some((p) => p.message_id === msg.id) ? (
                        <button
                          className={`${styles.pinBtn} ${styles.pinBtnActive}`}
                          onClick={() => unpinMessage(msg.id)}
                          aria-label={t('chat.unpin')}
                          title={t('chat.unpin')}
                        >
                          <i className="bx bx-pin" />
                        </button>
                      ) : pinnedMessages.length < 2 ? (
                        <button
                          className={styles.pinBtn}
                          onClick={() => pinMessage(msg.id)}
                          aria-label={t('chat.pin')}
                          title={t('chat.pin')}
                        >
                          <i className="bx bx-pin" />
                        </button>
                      ) : null}
                      <button
                        className={styles.deleteBtn}
                        onClick={() => setDeleteTarget({ message: msg })}
                        aria-label={t('chat.delete')}
                      >
                        <i className="bx bx-trash" />
                      </button>
                    </>
                  )}
                </div>
                </>
                )}
              </Fragment>
            )
          })}
          </div>
        </div>
      )}

      {newMessagesCount > 0 && (
        <button className={styles.newMessagesBar} onClick={scrollToBottom}>
          <i className="bx bx-chevron-down" />
          {newMessagesCount} tin nhắn mới
        </button>
      )}

      <div className={styles.typingFloat}>
        {(mode === 'group' ? (typingUsers && typingUsers.size > 0) : room.partnerTyping) && (
          <>
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
          </>
        )}
      </div>

      <Composer room={room} chatId={chatId} replyingTo={replyingTo} onClearReply={() => setReplyingTo(null)} onScrollToMessage={scrollToMessage} />

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

      <GroupCallMemberSelectModal
        open={showMemberSelectModal}
        onClose={() => setShowMemberSelectModal(false)}
        members={memberNames ?? new Map()}
        myUserId={myUserId}
        onStartCall={handleStartGroupCall}
      />

      <GroupCallRequestJoinModal
        open={joinRequestState !== null}
        onClose={() => setJoinRequestState(null)}
        onConfirm={handleConfirmJoinRequest}
        callerName={
          joinRequestState
            ? (memberNames?.get(joinRequestState.callerId)?.display_name || t('chat.unknown'))
            : ''
        }
        participantCount={joinRequestState?.participantCount ?? 0}
      />

      {lightbox && (
        <ChatMediaLightbox
          msgs={lightbox.msgs}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}

interface MessageMediaProps {
  message: ChatMessage
  onClick?: () => void
}

function MessageMedia({ message, onClick }: MessageMediaProps) {
  const { t } = useTranslation()
  const { src, isVideo, failed, loading, boxRef } = useMessageMedia(message)
  const cachedRatio = mediaRatioCache.get(message.id)
  const [loaded, setLoaded] = useState(() => !message.media_uri && !!src)
  const [ratio, setRatio] = useState<{ width: number; height: number } | null>(
    cachedRatio ?? null,
  )

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true)
    const img = e.currentTarget
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      const dims = { width: img.naturalWidth, height: img.naturalHeight }
      mediaRatioCache.set(message.id, dims)
      setRatio(dims)
    }
  }

  const wrap = (node: React.ReactNode) =>
    onClick ? (
      <span className={styles.mediaClickable} onClick={onClick} role="button" tabIndex={0}>
        {node}
      </span>
    ) : (
      node
    )

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
    return wrap(
      <video
        src={src}
        controls
        muted
        playsInline
        preload="metadata"
        className={styles.mediaEl}
      />,
    )
  }
  return wrap(
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
    </span>,
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
  chatId: string | null
  replyingTo: ChatMessage | null
  onClearReply: () => void
  onScrollToMessage?: (messageId: string) => void
}

const MAX_ATTACHMENTS = 10

function Composer({ room, chatId, replyingTo, onClearReply, onScrollToMessage }: ComposerProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [value, setValue] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [emojiGroup, setEmojiGroup] = useState<EmojiGroup>('positive')
  const [gifOpen, setGifOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([])
  const attachmentUrlsRef = useRef<string[]>([])
  const inputRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const toggleEmojiRef = useRef<HTMLButtonElement>(null)
  const toggleGifRef = useRef<HTMLButtonElement>(null)
  const gifPickerRef = useRef<HTMLDivElement>(null)
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
      attachmentUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      attachmentUrlsRef.current = []
      sendTyping(false)
    }
  }, [sendTyping])

  const attachFile = (file: File) => {
    const url = URL.createObjectURL(file)
    attachmentUrlsRef.current = [...attachmentUrlsRef.current, url]
    setAttachments((prev) => [...prev, file])
    setAttachmentUrls((prev) => [...prev, url])
  }

  const removeAttachment = (index: number) => {
    const revoked = attachmentUrlsRef.current[index]
    if (revoked) URL.revokeObjectURL(revoked)
    attachmentUrlsRef.current = attachmentUrlsRef.current.filter((_, i) => i !== index)
    setAttachments((prev) => prev.filter((_, i) => i !== index))
    setAttachmentUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAttachments = () => {
    attachmentUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    attachmentUrlsRef.current = []
    setAttachments([])
    setAttachmentUrls([])
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
      replyToMessageId: replyingTo?.id || undefined,
    })
    setGifOpen(false)
    onClearReply()
  }

  const sendFile = async (file: File, caption: string): Promise<boolean> => {
    if (uploading || !chatId) return false
    setUploading(true)
    try {
      const res = await uploadChatMedia(file, chatId)
      room.sendMessage(caption, {
        mediaId: res.data.id,
        mediaUri: res.data.file_uri,
        mediaType: res.data.file_type,
        replyToMessageId: replyingTo?.id || undefined,
      })
      return true
    } catch {
      toast({ type: 'error', title: t('chat.uploadFailed') })
      return false
    } finally {
      setUploading(false)
    }
  }

  const sendAttachmentBatch = async (files: File[], caption: string) => {
    if (!chatId) return
    setUploading(true)
    try {
      const results = await Promise.allSettled(files.map((file) => uploadChatMedia(file, chatId)))
      const replyId = replyingTo?.id || undefined
      const mediaGroupId = crypto.randomUUID()
      let sentAny = false
      for (let i = 0; i < results.length; i++) {
        const res = results[i]
        if (res.status !== 'fulfilled') {
          toast({ type: 'error', title: t('chat.uploadFailed') })
          continue
        }
        const msgCaption = i === 0 ? caption : ''
        room.sendMessage(msgCaption, {
          mediaId: res.value.data.id,
          mediaUri: res.value.data.file_uri,
          mediaType: res.value.data.file_type,
          mediaGroupId,
          replyToMessageId: i === 0 ? replyId : undefined,
        })
        sentAny = true
      }
      if (sentAny) onClearReply()
    } finally {
      setUploading(false)
    }
  }

  const send = async (opts?: { emojiId?: string; mediaId?: string; mediaUri?: string; mediaType?: string }) => {
    if (!value.trim() && !opts?.emojiId && !opts?.mediaId && attachments.length === 0) return
    const text = value
    const replyId = replyingTo?.id || undefined

    if (attachments.length > 0) {
      await sendAttachmentBatch(attachments, text)
      clearAttachments()
      resetComposer()
      return
    }

    // Toàn bộ tin là một URL duy nhất → thử tải ảnh về rồi gửi dạng media.
    if (!opts && !replyId && isSingleImageUrl(text)) {
      const file = await fetchRemoteImage(text)
      if (file) {
        resetComposer()
        const ok = await sendFile(file, '')
        if (ok) {
          onClearReply()
          return
        }
        // Upload ảnh thất bại → fallback gửi URL dạng text để không mất tin nhắn.
        room.sendMessage(text, { replyToMessageId: replyId })
        onClearReply()
        return
      }
    }

    room.sendMessage(text, { ...opts, replyToMessageId: replyId })
    resetComposer()
    onClearReply()
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0 || uploading) return
    const allowed = MAX_ATTACHMENTS - attachments.length
    const toAdd = files.slice(0, Math.max(allowed, 0))
    if (files.length > allowed) {
      toast({ type: 'warning', title: t('chat.tooManyFiles') })
    }
    toAdd.forEach(attachFile)
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
      {attachments.length > 0 && (
        <div className={styles.attachmentBar}>
          <div className={styles.attachmentGrid}>
            {attachments.map((attachment, index) => {
              const attachmentUrl = attachmentUrls[index]
              return (
                <span key={index} className={styles.attachmentThumb}>
                  {attachment.type.startsWith('video/') ? (
                    <video src={attachmentUrl} muted preload="metadata" />
                  ) : (
                    <ExternalImage src={attachmentUrl} alt="" />
                  )}
                  <button
                    type="button"
                    className={styles.attachmentRemove}
                    onClick={() => removeAttachment(index)}
                    title={t('chat.removeAttachment')}
                    aria-label={t('chat.removeAttachment')}
                  >
                    <i className="bx bx-x" />
                  </button>
                </span>
              )
            })}
          </div>
          <button
            type="button"
            className={styles.attachmentClearAll}
            onClick={clearAttachments}
            title={t('chat.removeAll')}
            aria-label={t('chat.removeAll')}
          >
            {t('chat.removeAll')}
          </button>
        </div>
      )}
      {replyingTo && (
        <div className={styles.replyBar}>
          <div className={styles.replyBarContent}>
            <div className={styles.replyBarLabel}>
              <i className="bx bx-reply" />
              {replyingTo.sender_id === 'SYSTEM' ? 'System' : (replyingTo.sender_name || t('chat.unknown'))}
            </div>
            <span className={styles.replyBarSnippet}>
              {replyingTo.deleted ? t('chat.messageDeleted') : replyingTo.content || t('chat.attachment')}
            </span>
          </div>
          <button
            type="button"
            className={styles.replyBarCancel}
            onClick={onClearReply}
            title={t('chat.cancelReply')}
            aria-label={t('chat.cancelReply')}
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
          disabled={(!value.trim() && attachments.length === 0) || uploading}
          aria-label={t('chat.send')}
        >
          <i className={uploading ? 'bx bx-loader-circle bx-spin' : 'bx bx-send'} />
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={handleFile} />
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
