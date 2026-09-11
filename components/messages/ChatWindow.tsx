'use client'

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ExternalImage from '../ExternalImage'
import OnlineIndicator from '../OnlineIndicator'
import Modal from '../Modal'
import GifPicker from '../GifPicker'
import { useTranslation } from '../../hooks/useTranslation'
import { useAuth } from '../../hooks/useAuth'
import { useEmojis } from '../../hooks/useEmojis'
import { useToast } from '../../contexts/ToastContext'
import { uploadChatMedia } from '../../api/chats'
import { useAudioRecorder, type VoiceRecording } from '../../hooks/useAudioRecorder'
import { getCallHistory } from '../../api/calls'
import { formatChatDate, formatChatTime, formatClockTime } from '../../utils/chat'
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
  ChatBackground,
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
import ChatDetailSidebar from './ChatDetailSidebar'
import styles from './ChatWindow.module.css'

const EMOTION_EMOJI_MAP = emojiByCode(getEmotionEmojis())

// ── Voice waveform helpers ──────────────────────────────────────────────
const WAVEFORM_BAR_COUNT = 35

function generateHashWaveform(seed: string): number[] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  const bars: number[] = []
  for (let i = 0; i < WAVEFORM_BAR_COUNT; i++) {
    hash = ((hash * 16807) + 12345) | 0
    const h = 0.2 + (Math.abs(hash) % 80) / 100
    bars.push(h)
  }
  return bars
}

function useWaveform(src: string): number[] {
  const [heights, setHeights] = useState<number[]>(() =>
    generateHashWaveform(src || 'default'),
  )

  useEffect(() => {
    if (!src) return
    let cancelled = false
    const ctx = new AudioContext()
    fetch(src)
      .then((res) => res.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((audioBuffer) => {
        if (cancelled) return
        const raw = audioBuffer.getChannelData(0)
        const step = Math.floor(raw.length / WAVEFORM_BAR_COUNT)
        const bars: number[] = []
        for (let i = 0; i < WAVEFORM_BAR_COUNT; i++) {
          let sum = 0
          const start = i * step
          for (let j = 0; j < step; j++) {
            sum += Math.abs(raw[start + j])
          }
          bars.push(sum / step)
        }
        const max = Math.max(...bars)
        setHeights(bars.map((b) => Math.max(0.2, max > 0 ? b / max : 0.5)))
      })
      .catch(() => {
        if (!cancelled) setHeights(generateHashWaveform(src))
      })
    return () => {
      cancelled = true
      void ctx.close()
    }
  }, [src])

  return heights
}
// ─────────────────────────────────────────────────────────────────────────

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

// ── Floating action toolbar (Messenger-style, appears on hover) ────────────
const QUICK_REACT_EMOJI_IDS = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥']

interface MessageToolbarProps {
  msg: ChatMessage
  mine: boolean
  visible: boolean
  emojis: Map<string, EmojiItem>
  onReact?: (messageId: string, emojiId: string) => void
  onReply: () => void
  onForward?: () => void
  onPin: () => void
  onUnpin: () => void
  onDelete: () => void
  isPinned: boolean
  canForward: boolean
  onToolbarMouseEnter: () => void
  onToolbarMouseLeave: () => void
}

function MessageToolbar({
  msg,
  mine,
  visible,
  emojis,
  onReact,
  onReply,
  onForward,
  onPin,
  onUnpin,
  onDelete,
  isPinned,
  canForward,
  onToolbarMouseEnter,
  onToolbarMouseLeave,
}: MessageToolbarProps) {
  const { t } = useTranslation()
  const [moreOpen, setMoreOpen] = useState(false)
  const [reactionOpen, setReactionOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const reactionRef = useRef<HTMLDivElement>(null)
  const reactionBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!moreOpen && !reactionOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (moreRef.current?.contains(target) || moreBtnRef.current?.contains(target)) return
      if (reactionRef.current?.contains(target) || reactionBtnRef.current?.contains(target)) return
      setMoreOpen(false)
      setReactionOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moreOpen, reactionOpen])

  const quickEmojis = useMemo(() => {
    const result: EmojiItem[] = []
    for (const code of QUICK_REACT_EMOJI_IDS) {
      const item = emojis.get(code)
      if (item) result.push(item)
    }
    return result
  }, [emojis])

  const handleReact = (emojiId: string) => {
    setReactionOpen(false)
    onReact?.(msg.id, emojiId)
  }

  return (
    <div
      className={`${styles.messageToolbar} ${mine ? styles.toolbarMine : styles.toolbarTheirs} ${visible ? styles.toolbarVisible : ''}`}
      onMouseEnter={onToolbarMouseEnter}
      onMouseLeave={onToolbarMouseLeave}
    >
      {onReact && (
        <div className={styles.toolbarReactWrap} ref={reactionRef}>
          <button
            ref={reactionBtnRef}
            className={`${styles.toolbarActionBtn} ${reactionOpen ? styles.toolbarActionBtnActive : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              setReactionOpen((v) => !v)
              setMoreOpen(false)
            }}
            aria-label={t('chat.addReaction')}
            title={t('chat.addReaction')}
          >
            <i className="bx bx-smile" />
          </button>
          {reactionOpen && (
            <div className={styles.toolbarReactionPicker}>
              {quickEmojis.map((item) => (
                <button
                  key={item.id}
                  className={styles.toolbarReactionPickBtn}
                  onClick={() => handleReact(item.id)}
                  title={item.code}
                >
                  <EmojiImage emoji={item} className={styles.toolbarReactionPickEmoji} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <button
        className={styles.toolbarActionBtn}
        onClick={onReply}
        aria-label={t('chat.reply')}
        title={t('chat.reply')}
      >
        <i className="bx bx-reply" />
      </button>
      <div className={styles.toolbarMoreWrap} ref={moreRef}>
        <button
          ref={moreBtnRef}
          className={`${styles.toolbarActionBtn} ${moreOpen ? styles.toolbarActionBtnActive : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            setMoreOpen((v) => !v)
            setReactionOpen(false)
          }}
          aria-label={t('chat.more')}
          title={t('chat.more')}
        >
          <i className="bx bx-dots-horizontal-rounded" />
        </button>
        {moreOpen && (
          <div className={styles.toolbarMoreMenu} onClick={(e) => e.stopPropagation()}>
            {isPinned ? (
              <button onClick={() => { onUnpin(); setMoreOpen(false) }}>
                <i className="bx bx-pin" /> {t('chat.unpin')}
              </button>
            ) : (
              <button onClick={() => { onPin(); setMoreOpen(false) }}>
                <i className="bx bx-pin" /> {t('chat.pin')}
              </button>
            )}
            {canForward && (
              <button onClick={() => { onForward?.(); setMoreOpen(false) }}>
                <i className="bx bx-arrow-forward" /> {t('chat.forward')}
              </button>
            )}
            <button
              className={styles.moreMenuDanger}
              onClick={() => { onDelete(); setMoreOpen(false) }}
            >
              <i className="bx bx-trash" /> {t('chat.deleteForMe')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface ChatWindowProps {
  conversation: ChatConversation | null
  myUserId: string
  room: ChatRoom
  isEncrypted?: boolean
  onReact?: (messageId: string, emojiId: string) => void
  onForward?: (message: ChatMessage) => void
  forwarding?: ChatMessage | null
  onClearForward?: () => void
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
  onBack?: () => void
  chatBackground?: ChatBackground | null
  onOpenBackgroundPicker?: () => void
}

interface DeleteTarget {
  message: ChatMessage
}

type TimelineItem =
  | { kind: 'message'; msg: ChatMessage; created: number }
  | { kind: 'call'; item: CallHistoryItem; created: number }
  | { kind: 'group_call'; call: GroupCallHistoryItem; created: number }

const EMPTY_CALL_HISTORY: CallHistoryItem[] = []

function highlightKeyword(text: string, keyword: string): React.ReactNode {
  if (!keyword.trim()) return text
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i}>{part}</mark> : part,
  )
}

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
  onReact,
  onForward,
  forwarding,
  onClearForward,
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
  onBack,
  chatBackground,
  onOpenBackgroundPicker,
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

  const chatBgStyle = useMemo(() => {
    if (!chatBackground) return {}
    switch (chatBackground.type) {
      case 'solid':
        return { backgroundColor: chatBackground.value }
      case 'gradient':
        return { backgroundImage: chatBackground.value }
      case 'preset':
        return {
          backgroundImage: `url(/presets/chat-bg/${chatBackground.value})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      case 'custom':
        return {
          backgroundImage: `url(${chatBackground.value})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      default:
        return {}
    }
  }, [chatBackground])

  const chatHeaderStyle = useMemo(() => {
    if (!chatBackground) return {}
    switch (chatBackground.type) {
      case 'solid':
        return {
          backgroundColor: chatBackground.value,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }
      case 'gradient':
        return {
          backgroundImage: chatBackground.value,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }
      case 'preset':
      case 'custom': {
        const url = chatBackground.type === 'preset'
          ? `/presets/chat-bg/${chatBackground.value}`
          : chatBackground.value
        return {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }
      }
      default:
        return {}
    }
  }, [chatBackground])

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null)
  const [searchActive, setSearchActive] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [newMessagesCount, setNewMessagesCount] = useState(0)
  const [showMemberSelectModal, setShowMemberSelectModal] = useState(false)
  const [joinRequestState, setJoinRequestState] = useState<GroupCallJoinRequestState | null>(null)
  const [lightbox, setLightbox] = useState<{ msgs: ChatMessage[]; index: number } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)
  const [toolbarHoveredId, setToolbarHoveredId] = useState<string | null>(null)
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

  const confirmDelete = () => {
    if (deleteTarget) {
      room.deleteMessage(deleteTarget.message.id, 'me')
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
      <div
        className={`${styles.header}${chatBackground ? ` ${styles.headerWithBg}` : ''}`}
        style={chatHeaderStyle}
      >
        {onBack && (
          <button type="button" className={styles.backBtn} onClick={onBack} aria-label={t('chat.back')}>
            <i className="bx bx-arrow-back" />
          </button>
        )}
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
          </>
        ) : null}
        <button
          className={styles.iconBtn}
          onClick={() => setSidebarOpen(true)}
          title={t('chat.chatDetail')}
        >
          <i className="bx bx-info-circle" />
        </button>
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
        <div className={styles.searchResults} style={chatBgStyle}>
          <div className={styles.searchResultsHeader}>
            <span>
              {searchResults.length === 0
                ? t('chat.noResults')
                : t('chat.searchResultCount', { count: searchResults.length, keyword: room.searchKeyword })}
            </span>
            <button className={styles.clearBtn} onClick={room.clearSearch}>
              <i className="bx bx-x" />
            </button>
          </div>
          {searchResults.length === 0 ? (
            <div className={styles.center}>{t('chat.noResults')}</div>
          ) : (
            searchResults.map((msg) => (
              <div
                key={msg.id}
                className={styles.searchResultItem}
                onClick={() => {
                  room.clearSearch()
                  setSearchActive(false)
                  scrollToMessage(msg.id)
                  setHighlightedMsgId(msg.id)
                }}
              >
                <span className={styles.searchResultSender}>
                  {msg.sender_id === myUserId
                    ? t('chat.you')
                    : mode === 'group'
                      ? (memberNames?.get(msg.sender_id)?.display_name || t('chat.unknown'))
                      : (conversation?.partner.display_name || t('chat.unknown'))}
                  <span className={styles.searchResultTime}>
                    · {formatChatDate(msg.created_at, t)}
                  </span>
                </span>
                <span className={styles.searchResultContent}>
                  {msg.media_id
                    ? t('chat.mediaMessage')
                    : msg.emoji_id
                      ? emojis.get(msg.emoji_id)?.code || t('chat.emojiMessage')
                      : highlightKeyword(msg.content, room.searchKeyword)}
                </span>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className={styles.messages} ref={scrollRef} onScroll={handleMessagesScroll} style={chatBgStyle}>
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
                          <div className={styles.msgLine}>
                            {item.msgs[0].content?.trim() && (
                              <div className={styles.msgText}>
                                {!item.msgs[0].decrypt_failed &&
                                  renderEmojiContent(item.msgs[0].content ?? '', emojiCodeMap, `mg-${first.id}`, styles.emojiInline)}
                              </div>
                            )}
                            <span className={styles.msgTime}>{formatClockTime(first.created_at)}</span>
                            {mine && (
                              <SeenIndicator
                                msg={first}
                                myUserId={myUserId}
                                mode={mode}
                                conversation={conversation}
                                memberNames={memberNames}
                                t={t}
                              />
                            )}
                          </div>
                          <ReactionsRow
                            msg={first}
                            myUserId={myUserId}
                            emojis={emojis}
                            onReact={onReact}
                            t={t}
                            
                          />
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
                    <span className={styles.msgTime}>{formatClockTime(msg.created_at)}</span>
                    {mine && (
                      <SeenIndicator
                        msg={msg}
                        myUserId={myUserId}
                        mode={mode}
                        conversation={conversation}
                        memberNames={memberNames}
                        t={t}
                      />
                    )}
                    <ReactionsRow
                      msg={msg}
                      myUserId={myUserId}
                      emojis={emojis}
                      onReact={onReact}
                      t={t}
                      
                    />
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
                <div
                  className={`${styles.msgRow} ${mine ? styles.mine : styles.theirs} ${highlightedMsgId === msg.id ? styles.highlight : ''}`}
                  data-message-id={msg.id}
                  onMouseEnter={() => setHoveredMsgId(msg.id)}
                  onMouseLeave={() => setHoveredMsgId(null)}
                >
                  {pinnedMessages.some((p) => p.message_id === msg.id) && (
                    <span className={styles.pinBadge} title={t('chat.pinnedMessage')}>
                      <i className="bx bx-pin" />
                    </span>
                  )}
                  {msg.deleted ? (
                    <div className={styles.bubble}>
                      <div className={styles.msgLine}>
                        <span className={styles.deletedText}>{t('chat.messageDeleted')}</span>
                        <span className={styles.msgTime}>{formatClockTime(msg.created_at)}</span>
                      </div>
                    </div>
                  ) : msg.media_id && msg.content ? (
                    <div className={styles.msgStack}>
                      <div className={`${styles.bubble} ${styles.bubblePlain}`}>
                        <div className={styles.mediaWrap}>
                          <MessageMedia message={msg} onClick={() => openLightbox([msg], 0)} />
                        </div>
                        <span className={styles.msgTime}>{formatClockTime(msg.created_at)}</span>
                        {mine && (
                          <SeenIndicator
                            msg={msg}
                            myUserId={myUserId}
                            mode={mode}
                            conversation={conversation}
                            memberNames={memberNames}
                            t={t}
                          />
                        )}
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
                        <div className={styles.msgLine}>
                          {msg.decrypt_failed ? (
                            <span className={styles.deletedText}>
                              <i className="bx bxs-lock-alt" /> {t('chat.undecryptable')}
                            </span>
                          ) : (
                            <span className={styles.msgText}>
                              {renderEmojiContent(msg.content, emojiCodeMap, msg.id, styles.emojiInline)}
                            </span>
                          )}
                        <span className={styles.msgTime}>{formatClockTime(msg.created_at)}</span>
                        {mine && (
                          <SeenIndicator
                            msg={msg}
                            myUserId={myUserId}
                            mode={mode}
                            conversation={conversation}
                            memberNames={memberNames}
                            t={t}
                          />
                        )}
                      </div>
                        <ReactionsRow
                          msg={msg}
                          myUserId={myUserId}
                          emojis={emojis}
                          onReact={onReact}
                          t={t}
                          
                        />
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
                      {msg.decrypt_failed || (msg.content && !isSingleVideo && !singleEmoji) ? (
                        <div className={styles.msgLine}>
                          {msg.decrypt_failed ? (
                            <span className={styles.deletedText}>
                              <i className="bx bxs-lock-alt" /> {t('chat.undecryptable')}
                            </span>
                          ) : (
                            <span className={styles.msgText}>
                              {renderEmojiContent(msg.content, emojiCodeMap, msg.id, styles.emojiInline)}
                            </span>
                          )}
                          <span className={styles.msgTime}>{formatClockTime(msg.created_at)}</span>
                          {mine && (
                            <SeenIndicator
                              msg={msg}
                              myUserId={myUserId}
                              mode={mode}
                              conversation={conversation}
                              memberNames={memberNames}
                              t={t}
                            />
                          )}
                        </div>
                      ) : (
                        <>
                          {isSingleVideo && <VideoLinkPreview url={videoUrls[0]} />}
                          {msg.content && singleEmoji && (
                            <EmojiImage
                              emoji={emojiCodeMap.get(singleEmoji)!}
                              className={styles.emojiMsg}
                            />
                          )}
                          <span className={styles.msgTime}>{formatClockTime(msg.created_at)}</span>
                          {mine && (
                            <SeenIndicator
                              msg={msg}
                              myUserId={myUserId}
                              mode={mode}
                              conversation={conversation}
                              memberNames={memberNames}
                              t={t}
                            />
                          )}
                        </>
                      )}
                      {videoUrls.length > 0 && !isSingleVideo && (
                        <div className={styles.videoPreviewStack}>
                          {videoUrls.map((vUrl) => (
                            <VideoLinkPreview key={vUrl} url={vUrl} />
                          ))}
                        </div>
                      )}
                      <ReactionsRow
                        msg={msg}
                        myUserId={myUserId}
                        emojis={emojis}
                        onReact={onReact}
                        t={t}
                        
                      />
                    </div>
                  )}
                   {!msg.deleted && (
                    <MessageToolbar
                      msg={msg}
                      mine={mine}
                      visible={hoveredMsgId === msg.id || toolbarHoveredId === msg.id}
                      emojis={emojis}
                      onReact={onReact}
                      onReply={() => setReplyingTo(msg)}
                      onForward={onForward ? () => onForward(msg) : undefined}
                      onPin={() => pinMessage(msg.id)}
                      onUnpin={() => unpinMessage(msg.id)}
                      onDelete={() => setDeleteTarget({ message: msg })}
                      isPinned={pinnedMessages.some((p) => p.message_id === msg.id)}
                      canForward={Boolean(onForward && msg.message_category !== 'system' && !msg.is_anonymized)}
                      onToolbarMouseEnter={() => setToolbarHoveredId(msg.id)}
                      onToolbarMouseLeave={() => setToolbarHoveredId(null)}
                    />
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

      <Composer room={room} chatId={chatId} replyingTo={replyingTo} forwarding={forwarding ?? null} onClearReply={() => setReplyingTo(null)} onClearForward={onClearForward ?? (() => {})} onScrollToMessage={scrollToMessage} />

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
          <button className={styles.dangerBtn} onClick={confirmDelete}>
            <i className="bx bx-trash" />
            {t('chat.deleteForMe')}
          </button>
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

      <ChatDetailSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chatId={chatId}
        mode={mode}
        partner={mode === 'direct' ? conversation?.partner ?? null : null}
        groupName={groupName}
        groupAvatarUri={groupAvatarUri}
        memberCount={memberCount}
        members={memberNames}
        onSearch={toggleSearch}
        onBackground={onOpenBackgroundPicker}
        onGroupSettings={onOpenGroupSettings}
        onDeleteChat={onDeleteChat}
      />
    </div>
  )
}

interface MessageMediaProps {
  message: ChatMessage
  onClick?: () => void
}

// VoicePlayer — thành phần play/pause, waveform bars và thời lượng chung cho
// tin nhắn thoại (message) lẫn preview trong khung soạn (composer).
function VoicePlayer({ src, duration, mine }: { src: string; duration?: number; mine?: boolean }) {
  const { t } = useTranslation()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const waveformHeights = useWaveform(src)

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      void audio.play().catch(() => setPlaying(false))
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      const d = audio.duration || 0
      setElapsed(audio.currentTime)
      setProgress(d > 0 ? audio.currentTime / d : 0)
    }
    const onEnd = () => {
      setPlaying(false)
      setElapsed(0)
      setProgress(0)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('play', () => setPlaying(true))
    audio.addEventListener('pause', () => setPlaying(false))
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('play', () => setPlaying(true))
      audio.removeEventListener('pause', () => setPlaying(false))
    }
  }, [])

  const shown = duration && duration > 0
    ? Math.max(Math.round(elapsed), duration)
    : Math.round(elapsed)

  return (
    <span
      className={`${styles.voiceBubble} ${mine ? styles.voiceMine : ''}`}
      role="group"
      aria-label={t('chat.voiceMessage')}
    >
      <button
        type="button"
        className={styles.voicePlayBtn}
        onClick={toggle}
        aria-label={playing ? t('chat.pause') : t('chat.play')}
        title={playing ? t('chat.pause') : t('chat.play')}
      >
        <i className={playing ? 'bx bx-pause' : 'bx bx-play'} />
      </button>
      <span className={styles.voiceWaveform}>
        {waveformHeights.map((h, i) => {
          const played = i / waveformHeights.length <= progress
          return (
            <span
              key={i}
              className={`${styles.voiceWaveBar} ${played ? styles.voiceWaveBarPlayed : ''}`}
              style={{ height: `${h * 100}%` }}
            />
          )
        })}
      </span>
      <span className={styles.voiceDuration}>{formatCallDuration(shown)}</span>
      <audio ref={audioRef} src={src} preload="metadata" />
    </span>
  )
}

// VoiceBubble — tin nhắn thoại trong hội thoại.
function VoiceBubble({ message, src }: { message: ChatMessage; src: string | null }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  if (!src) {
    return <span className={styles.deletedText}>{t('chat.mediaFailed')}</span>
  }
  const duration = message.duration_seconds && message.duration_seconds > 0
    ? message.duration_seconds
    : undefined
  return <VoicePlayer src={src} duration={duration} mine={message.sender_id === user?.user_id} />
}

interface SeenIndicatorProps {
  msg: ChatMessage
  myUserId: string
  mode?: string
  conversation?: ChatConversation | null
  memberNames?: Map<string, { display_name?: string; avatar_uri?: string }>
  t: (key: string, params?: Record<string, string>) => string
}

function SeenIndicator({
  msg,
  myUserId,
  mode,
  conversation,
  memberNames,
  t,
}: SeenIndicatorProps) {
  if (msg.sender_id !== myUserId || msg.deleted) return null
  const seen = msg.seen_by ?? []
  if (mode === 'group') {
    const isGroupSeen = seen.length > 0
    const names = seen
      .slice(0, 3)
      .map((id) => memberNames?.get(id)?.display_name || t('chat.unknown'))
      .join(', ')
    return (
      <span
        className={isGroupSeen ? `${styles.seenTicks} ${styles.seenOn}` : styles.seenTicks}
        title={isGroupSeen ? t('chat.seenBy', { names }) : t('chat.sent')}
      >
        {isGroupSeen ? `✓✓ ${seen.length}` : '✓'}
      </span>
    )
  }
  const isSeen = Boolean(conversation?.partner.user_id && seen.includes(conversation.partner.user_id))
  return (
    <span
      className={isSeen ? `${styles.seenTicks} ${styles.seenOn}` : styles.seenTicks}
      title={isSeen ? t('chat.seen') : t('chat.sent')}
    >
      {isSeen ? '✓✓' : '✓'}
    </span>
  )
}

// ── Message reactions: chips bày tỏ cảm xúc (hiển thị bên dưới bubble) ─────
interface ReactionsRowProps {
  msg: ChatMessage
  myUserId: string
  emojis: Map<string, EmojiItem>
  onReact?: (messageId: string, emojiId: string) => void
  t: (key: string, params?: Record<string, string>) => string
}

function ReactionsRow({ msg, myUserId, emojis, onReact, t }: ReactionsRowProps) {
  const isBlocked = msg.deleted || msg.decrypt_failed
  const showBadge = !!msg.forwarded_from && !isBlocked

  if (isBlocked || !emojis || (!onReact && !showBadge)) return null

  const reactions = msg.reactions ?? []
  const mineReactions = reactions.filter((r) => r.user_id === myUserId)

  const chips: Array<{ emoji: EmojiItem; count: number; mine: boolean }> = []
  for (const r of reactions) {
    const item = emojis.get(r.emoji_id)
    if (!item) continue
    const existing = chips.find((c) => c.emoji.id === r.emoji_id)
    if (existing) {
      existing.count += 1
      if (r.user_id === myUserId) existing.mine = true
    } else {
      chips.push({ emoji: item, count: 1, mine: r.user_id === myUserId })
    }
  }
  // Ưu tiên emoji mình đã chọn lên đầu.
  chips.sort((a, b) => Number(b.mine) - Number(a.mine))

  const react = (emojiId: string) => {
    if (onReact) onReact(msg.id, emojiId)
  }

  const myNames = mineReactions.length
    ? reactions
        .filter((r) => r.user_id === myUserId)
        .map((r) => emojis.get(r.emoji_id)?.code || r.emoji_id)
        .join(', ')
    : t('chat.noReactionYet')

  return (
    <div className={styles.reactionsRow}>
      {showBadge && (
        <span className={styles.forwardBadge} title={t('chat.forwarded')}>
          <i className="bx bx-arrow-forward" />
          {t('chat.forwarded')}
          {msg.forwards_count && msg.forwards_count > 1 ? ` · ${msg.forwards_count}` : ''}
        </span>
      )}
      {onReact && chips.map((chip) => (
        <button
          key={chip.emoji.id}
          className={chip.mine ? `${styles.reactionChip} ${styles.reactionChipMine}` : styles.reactionChip}
          onClick={() => react(chip.emoji.id)}
          title={`${myNames}`}
        >
          <EmojiImage emoji={chip.emoji} className={styles.reactionChipEmoji} />
          <span className={styles.reactionChipCount}>{chip.count}</span>
        </button>
      ))}
    </div>
  )
}

function MessageMedia({ message, onClick }: MessageMediaProps) {
  const { t } = useTranslation()
  const { src, isVideo, isAudio, failed, loading, boxRef } = useMessageMedia(message)
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
  if (isAudio) {
    return <VoiceBubble message={message} src={src} />
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
  forwarding: ChatMessage | null
  onClearReply: () => void
  onClearForward: () => void
  onScrollToMessage?: (messageId: string) => void
}

const MAX_ATTACHMENTS = 10

function Composer({ room, chatId, replyingTo, forwarding, onClearReply, onClearForward, onScrollToMessage }: ComposerProps) {
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
  const {
    supported: voiceSupported,
    recording: voiceRecording,
    elapsed: voiceElapsed,
    error: voiceError,
    start: startVoice,
    stop: stopVoice,
    cancel: cancelVoice,
  } = useAudioRecorder()
  const [pendingVoice, setPendingVoice] = useState<VoiceRecording | null>(null)
  const [voiceUploading, setVoiceUploading] = useState(false)

  const emotions = useMemo(() => getEmotionEmojis(), [])
  const emotionGroups = useMemo(() => {
    const map = new Map<EmojiGroup, EmotionEmojiItem[]>()
    for (const g of EMOTION_GROUPS) {
      map.set(g, emotions.filter((e) => e.group === g))
    }
    return map
  }, [emotions])

  const sendTyping = room.sendTyping

  const hasContent = Boolean(value.trim())

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
      attachmentUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      attachmentUrlsRef.current = []
      sendTyping(false)
    }
  }, [sendTyping])

  // Forward: khi có tin chuyển tiếp được chọn, điền sẵn nội dung vào khung soạn
  // để người dùng có thể sửa trước khi gửi. Gắn forwarded_from khi click gửi.
  useEffect(() => {
    if (!forwarding || !inputRef.current) return
    const el = inputRef.current
    el.innerHTML = ''
    if (forwarding.content) {
      el.appendChild(document.createTextNode(forwarding.content))
      el.focus()
      const sel = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    setValue(forwarding.content || '')
  }, [forwarding])

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

  const handleVoiceMic = async () => {
    if (voiceRecording) {
      const rec = await stopVoice()
      if (rec) setPendingVoice(rec)
      return
    }
    if (pendingVoice) {
      URL.revokeObjectURL(pendingVoice.url)
      setPendingVoice(null)
    }
    await startVoice()
    if (voiceError) {
      toast({ type: 'error', title: t(`chat.${voiceError}`) })
    }
  }

  const handleVoiceCancel = () => {
    cancelVoice()
    if (pendingVoice) {
      URL.revokeObjectURL(pendingVoice.url)
      setPendingVoice(null)
    }
  }

  const sendVoice = async () => {
    if (!pendingVoice || voiceUploading || !chatId) return
    setVoiceUploading(true)
    const { blob, url, duration } = pendingVoice
    try {
      const ext = blob.type.includes('mp4') || blob.type.includes('aac') ? 'm4a' : 'webm'
      const file = new File([blob], `voice.${ext}`, { type: blob.type })
      const res = await uploadChatMedia(file, chatId, duration)
      room.sendMessage('', {
        mediaId: res.data.id,
        mediaUri: res.data.file_uri,
        mediaType: res.data.file_type,
        durationSeconds: res.data.duration_seconds ?? duration,
        replyToMessageId: replyingTo?.id || undefined,
      })
      URL.revokeObjectURL(url)
      setPendingVoice(null)
      onClearReply()
    } catch {
      toast({ type: 'error', title: t('chat.uploadFailed') })
    } finally {
      setVoiceUploading(false)
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
    const canAutoEmoji = Boolean(!value.trim() && forwarding?.emoji_id)
    if (!value.trim() && !canAutoEmoji && !opts?.emojiId && !opts?.mediaId && attachments.length === 0) return
    const text = value
    const replyId = replyingTo?.id || undefined
    const forwardedId = forwarding?.id

    if (attachments.length > 0) {
      await sendAttachmentBatch(attachments, text)
      clearAttachments()
      resetComposer()
      onClearForward()
      return
    }

    // Toàn bộ tin là một URL duy nhất → thử tải ảnh về rồi gửi dạng media.
    if (!opts && !replyId && !forwardedId && isSingleImageUrl(text)) {
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

    room.sendMessage(text, {
      ...opts,
      replyToMessageId: replyId,
      forwardedFrom: forwardedId,
      emojiId: opts?.emojiId ?? (canAutoEmoji ? (forwarding?.emoji_id ?? undefined) : undefined),
    })
    resetComposer()
    onClearReply()
    onClearForward()
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
      {forwarding && (
        <div className={styles.forwardBar}>
          <div className={styles.forwardBarContent}>
            <div className={styles.forwardBarLabel}>
              <i className="bx bx-arrow-forward" />
              {t('chat.forwarding')}
            </div>
            <span className={styles.forwardBarSnippet}>
              {forwarding.content || t('chat.attachment')}
            </span>
          </div>
          <button
            type="button"
            className={styles.forwardBarCancel}
            onClick={onClearForward}
            title={t('chat.cancelForward')}
            aria-label={t('chat.cancelForward')}
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
          <button
            className={`${styles.iconBtn} ${voiceRecording ? styles.iconBtnActive : ''}`}
            onClick={() => void handleVoiceMic()}
            disabled={voiceUploading || !voiceSupported || uploading}
            aria-label={t('chat.recordVoice')}
            title={t('chat.recordVoice')}
          >
            <i className="bx bx-microphone" />
          </button>
        </div>
        {voiceRecording ? (
          <div className={styles.voiceInput}>
            <span className={styles.recordingPulse} />
            <span className={styles.recordingTimer}>{formatCallDuration(voiceElapsed)}</span>
          </div>
        ) : pendingVoice ? (
          <div className={styles.voiceInput}>
            <VoicePlayer src={pendingVoice.url} duration={pendingVoice.duration} />
          </div>
        ) : (
          <div className={styles.composerWrap}>
            <div
              ref={inputRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label={t('chat.placeholder')}
              className={styles.composerInput}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
            />
            {!hasContent && (
              <span className={styles.composerPlaceholder}>{t('chat.placeholder')}</span>
            )}
          </div>
        )}
        {voiceRecording ? (
          <button
            type="button"
            className={styles.voiceStopBtn}
            onClick={() => void handleVoiceMic()}
            aria-label={t('chat.recordingStopped')}
            title={t('chat.recordingStopped')}
          >
            <i className="bx bx-stop" />
          </button>
        ) : pendingVoice ? (
          <>
            <button
              type="button"
              className={styles.voiceCancelBtn}
              onClick={handleVoiceCancel}
              aria-label={t('chat.cancelVoice')}
              title={t('chat.cancelVoice')}
            >
              <i className="bx bx-x" />
            </button>
            <button
              type="button"
              className={styles.voiceSendBtn}
              onClick={() => void sendVoice()}
              disabled={voiceUploading}
              aria-label={t('chat.sendVoice')}
              title={t('chat.sendVoice')}
            >
              <i className={voiceUploading ? 'bx bx-loader-circle bx-spin' : 'bx bx-send'} />
            </button>
          </>
        ) : (
          <button
            className={styles.sendBtn}
            onClick={() => send()}
            disabled={(!value.trim() && !forwarding?.emoji_id && attachments.length === 0) || uploading}
            aria-label={t('chat.send')}
          >
            <i className={uploading ? 'bx bx-loader-circle bx-spin' : 'bx bx-send'} />
          </button>
        )}
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
