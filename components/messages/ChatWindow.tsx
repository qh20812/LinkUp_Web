'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ExternalImage from '../ExternalImage'
import OnlineIndicator from '../OnlineIndicator'
import Modal from '../Modal'
import { useTranslation } from '../../hooks/useTranslation'
import { useAuth } from '../../hooks/useAuth'
import { useEmojis } from '../../hooks/useEmojis'
import { formatChatDate, formatCallDuration, formatClockTime } from '../../utils/chat'
import { overlayStyle } from '../../utils/chatReadability'
import { isSingleGiphyUrl, giphyStillUrl, separateGiphyUrls } from '../../utils/giphy'
import { isSingleEmojifyiUrl } from '../../utils/emojifyi'
import { EmojiImage, renderEmojiContent } from './EmojiImage'
import GroupInviteBubble from './GroupInviteBubble'
import VideoLinkPreview from './VideoLinkPreview'
import { extractVideoUrls } from '../../utils/videoLink'
import { isVoiceMessage } from '../../utils/chatMediaGroup'
import {
  emojiByCode,
  getEmotionEmojis,
  type EmotionEmojiItem,
} from '../../utils/emojis'
import type {
  ChatConversation,
  ChatMessage,
  EmojiItem,
  PinnedMessage,
  ChatBackground,
} from '../../types'
import type { GroupCallHistoryItem, GroupCallJoinRequestState } from '../../types/groupCall'
import type { ChatRoom } from '../../hooks/useChatRoom'
import { useCall } from '../../contexts/CallContext'
import { useGroupCall } from '../../contexts/GroupCallContext'
import { usePresence } from '../../contexts/PresenceContext'
import GroupCallMemberSelectModal from '../calls/GroupCallMemberSelectModal'
import GroupCallRequestJoinModal from '../calls/GroupCallRequestJoinModal'
import ChatMediaLightbox from './ChatMediaLightbox'
import ChatDetailSidebar from './ChatDetailSidebar'
import MessageToolbar from './MessageToolbar'
import MediaStack from './MediaStack'
import MessageMedia from './MessageMedia'
import MessageTimestamp from './MessageTimestamp'
import CallHistoryBubble from './CallHistoryBubble'
import SeenIndicator from './SeenIndicator'
import ReactionsRow from './ReactionsRow'
import EmojiBubble from './EmojiBubble'
import Composer from './Composer'
import { useChatCallHistory } from './hooks/useChatCallHistory'
import { useChatTimeline, type GroupedTimelineItem } from './hooks/useChatTimeline'
import { useChatScroll } from './hooks/useChatScroll'
import { useChatSearch } from './hooks/useChatSearch'
import styles from './ChatWindow.module.css'

const EMOTION_EMOJI_MAP = emojiByCode(getEmotionEmojis())

function singleEmojiCode(content: string, map: Map<string, EmojiItem>): string | null {
  const trimmed = content.trim()
  if (!trimmed.startsWith(':') || !trimmed.endsWith(':')) return null
  if (trimmed.includes(' ') || trimmed.includes('\n')) return null
  return map.has(trimmed) ? trimmed : null
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
  initialDraft?: string | null
  autoSendReady?: boolean
  onDraftConsumed?: () => void
}

interface DeleteTarget {
  message: ChatMessage
}

function highlightKeyword(text: string, keyword: string): React.ReactNode {
  if (!keyword.trim()) return text
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i}>{part}</mark> : part,
  )
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

  // Never leak raw user ids — unknown actors render as "Unknown".
  const actorName = actorId ? (memberNames?.get(actorId)?.display_name || (t ? t('chat.unknown') : '')) : (t ? t('chat.unknown') : '')

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

// Sender identity unified across timeline kinds so consecutive text / call /
// group_call rows from the same sender form ONE visual group (DESIGN §11.5–
// §11.6): a single top-aligned avatar + a single sender-name line. System
// rows always break groups — they never merge with user rows.
function getTimelineSenderId(item: GroupedTimelineItem, myUserId: string): string | null {
  if (item.kind === 'media_group') return item.msgs[0]?.sender_id ?? null
  if (item.kind === 'call') {
    if (!item.item) return null
    return item.item.direction === 'outgoing' ? myUserId : item.item.other_user.id
  }
  if (item.kind === 'group_call') return item.call?.caller_id ?? null
  const msg = item.msg
  if (!msg) return null
  if (msg.message_category === 'system' || msg.sender_id === 'SYSTEM') return `system:${msg.id}`
  return msg.sender_id
}

// Voice notes are their own surface family (DESIGN §11.5/§11.17): a run of voice
// notes forms its own sender group, so it never shares a group with the text /
// media / call rows around it. The block's FIRST note carries the avatar (and the
// sender-name line in group chats); the rest of the block keeps the 12px
// `.voiceCont` spacing without repeating the avatar.
function isVoiceTimelineItem(item: GroupedTimelineItem): boolean {
  if (item.kind !== 'message' || !item.msg) return false
  return isVoiceMessage(item.msg)
}

// Group key for the LEADING edge only. Voice rows are keyed apart from the
// remaining rows of the same sender, so a voice block always starts (and ends) a
// visual group, while consecutive voice notes still merge into one block.
function getTimelineGroupKey(item: GroupedTimelineItem, myUserId: string): string | null {
  const sender = getTimelineSenderId(item, myUserId)
  if (sender === null) return null
  return isVoiceTimelineItem(item) ? `${sender}::voice` : sender
}

function isSystemTimelineItem(item: GroupedTimelineItem): boolean {
  if (item.kind !== 'message' || !item.msg) return false
  const msg = item.msg
  return (
    msg.message_category === 'system' ||
    msg.sender_id === 'SYSTEM' ||
    msg.type === 'member_invited' ||
    msg.type === 'member_joined' ||
    msg.type === 'member_left' ||
    msg.type === 'admin_transferred' ||
    msg.type === 'group_settings_updated'
  )
}

// True when this item starts a new visual sender group: sender (or surface
// family — voice vs the rest) changed, a system row interrupts, or the previous
// item is a system row.
function isFirstInSenderGroup(
  item: GroupedTimelineItem,
  prev: GroupedTimelineItem | undefined,
  myUserId: string,
): boolean {
  if (!prev) return true
  if (isSystemTimelineItem(item) || isSystemTimelineItem(prev)) return true
  return getTimelineGroupKey(prev, myUserId) !== getTimelineGroupKey(item, myUserId)
}

// Trailing edge — deliberately sender-only, so it is NOT the exact mirror of
// isFirstInSenderGroup: read receipts (seen ticks) mark the end of the whole
// sender run, not the end of each surface block. A run like
// [text, voice, voice] therefore keeps a single ticks row, and
// [voice, voice, text] puts it under the text rather than under the last voice.
function isLastInSenderGroup(
  item: GroupedTimelineItem,
  next: GroupedTimelineItem | undefined,
  myUserId: string,
): boolean {
  if (!next) return true
  if (isSystemTimelineItem(item) || isSystemTimelineItem(next)) return true
  return getTimelineSenderId(item, myUserId) !== getTimelineSenderId(next, myUserId)
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
  initialDraft = null,
  autoSendReady = false,
  onDraftConsumed,
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
    expand: expandGroupCall,
  } = useGroupCall()
  const { isOnline, prefetchPresence } = usePresence()
  const { emojis } = useEmojis()
  const emojiCodeMap = useMemo(() => {
    // Backend trước, EMOTION ghi đè — render text ưu tiên ảnh emojifyi thay twemoji CDN của server.
    const map = new Map<string, EmojiItem>()
    for (const e of emojis.values()) map.set(e.code, e)
    for (const [code, e] of EMOTION_EMOJI_MAP) map.set(code, e)
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

  // Adaptive readability scrim (luminance-driven) × user strength.
  // Busy image backgrounds additionally arm the bubbles with contrast.
  const chatBgOverlayStyle = useMemo(
    () => overlayStyle(chatBackground, chatBackground?.strength),
    [chatBackground],
  )
  const isBusyBg = chatBackground?.type === 'preset' || chatBackground?.type === 'custom'

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
  const [showMemberSelectModal, setShowMemberSelectModal] = useState(false)
  const [joinRequestState, setJoinRequestState] = useState<GroupCallJoinRequestState | null>(null)
  const [lightbox, setLightbox] = useState<{ msgs: ChatMessage[]; index: number } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Guard against a second click landing before the optimistic message
  // unmounts the chips (state updates are async).
  const starterSendLockRef = useRef(false)
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)
  const [toolbarHoveredId, setToolbarHoveredId] = useState<string | null>(null)

  // Hover grace period for the floating message toolbar: leaving the row
  // (or toolbar) only schedules a hide, so the cursor can cross the gap
  // between bubble and toolbar without losing it. Any enter cancels it.
  const toolbarHideTimer = useRef<number | null>(null)

  const clearToolbarHideTimer = useCallback(() => {
    if (toolbarHideTimer.current !== null) {
      window.clearTimeout(toolbarHideTimer.current)
      toolbarHideTimer.current = null
    }
  }, [])

  const handleRowEnter = useCallback((messageId: string) => {
    clearToolbarHideTimer()
    setHoveredMsgId(messageId)
  }, [clearToolbarHideTimer])

  const handleToolbarEnter = useCallback((messageId: string) => {
    clearToolbarHideTimer()
    setToolbarHoveredId(messageId)
  }, [clearToolbarHideTimer])

  const scheduleToolbarHide = useCallback(() => {
    clearToolbarHideTimer()
    toolbarHideTimer.current = window.setTimeout(() => {
      toolbarHideTimer.current = null
      setHoveredMsgId(null)
      setToolbarHoveredId(null)
    }, 220)
  }, [clearToolbarHideTimer])

  useEffect(() => () => {
    if (toolbarHideTimer.current !== null) window.clearTimeout(toolbarHideTimer.current)
  }, [])
  const [pinnedCollapsed, setPinnedCollapsed] = useState(true)
  const openLightbox = useCallback((msgs: ChatMessage[], index: number) => {
    setLightbox({ msgs, index })
  }, [])

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

  // A history item is live while the server hasn't stamped ended_at
  // (terminal statuses excluded defensively). Independent of my own call
  // state — drives the bystander "Tham gia" banner + bubble action.
  const ongoingGroupCall = useMemo(
    () =>
      groupCallHistory.find(
        (gc) => !gc.ended_at && gc.status !== 'ended' && gc.status !== 'missed',
      ) ?? null,
    [groupCallHistory],
  )

  // Bystander join affordance: an ongoing call I'm not part of, while I'm
  // free (no direct call, no group call of my own running in parallel).
  const canJoinOngoingCall =
    mode === 'group' &&
    ongoingGroupCall !== null &&
    !isInCall &&
    !isInGroupCall &&
    !ongoingGroupCall.participants.includes(myUserId)

  useEffect(() => {
    if (partnerUserId) prefetchPresence([partnerUserId])
  }, [partnerUserId, prefetchPresence])

  const callHistory = useChatCallHistory({
    partnerUserId,
    callPhase,
    activeCall,
  })

  const { timeline, groupedTimeline } = useChatTimeline({
    messages: room.messages,
    callHistory,
    groupCallHistory,
    searchResults: room.searchResults,
  })

  const { searchActive, searchInput, setSearchActive, setSearchInput, toggleSearch } = useChatSearch({
    searchMessages: room.searchMessages,
    clearSearch: room.clearSearch,
  })

  const chatId = conversation?.chat_id ?? groupChatId ?? null

  const {
    scrollRef,
    timelineRef,
    newMessagesCount,
    atBottom,
    scrollToBottom,
    scrollToMessage: scrollToMessageFn,
    highlightedMsgId,
    setHighlightedMsgId,
    handleMessagesScroll,
  } = useChatScroll({
    chatId,
    messages: room.messages,
    callHistory,
    searchResults: room.searchResults,
    loading: room.loading,
    loadingMore: room.loadingMore,
    hasMore: room.hasMore,
    myUserId,
    loadMoreMessages: room.loadMoreMessages,
  })

  // Reset hover state when switching conversations so a pending hide timer
  // from the previous chat can never kill the new chat's toolbar.
  useEffect(() => {
    if (chatId) scrollToBottom()
    clearToolbarHideTimer()
  }, [chatId, scrollToBottom, clearToolbarHideTimer])

  const handleStartGroupCall = useCallback(
    (selectedIds: string[]) => {
      if (chatId) {
        void startGroupCall(chatId, selectedIds)
      }
    },
    [chatId, startGroupCall],
  )

  const scrollToMessage = useCallback((messageId: string) => {
    scrollToMessageFn(messageId)
  }, [scrollToMessageFn])

  // Starter prompt clicked in the empty state — send it right away. The guard
  // stops a second click landing before the optimistic message unmounts the
  // chips; the short release keeps blocked sends (offline / E2E init) retryable.
  const handleSendStarter = useCallback(
    (text: string) => {
      if (starterSendLockRef.current) return
      starterSendLockRef.current = true
      room.sendMessage(text)
      window.setTimeout(() => {
        starterSendLockRef.current = false
      }, 600)
    },
    [room],
  )

  if (!conversation && mode !== 'group') {
    return (
      <div className={`${styles.empty} ${styles.emptyPane}`}>
        <span className={styles.emptyIcon}><i className="bx bx-message-rounded-dots" /></span>
        <p className={styles.emptyTitle}>{t('chat.selectHint')}</p>
      </div>
    )
  }

  const confirmDelete = (mode: 'all' | 'me') => {
    if (deleteTarget) {
      room.deleteMessage(deleteTarget.message.id, mode)
    }
    setDeleteTarget(null)
  }

  // Recall-for-everyone is sender-only (enforced server-side too) —
  // other people's messages can only be hidden locally.
  const isOwnDeleteTarget = deleteTarget?.message.sender_id === myUserId

  const searchResults = room.searchResults
  const inSearch = searchResults !== null
  const newMessagesLabel =
    newMessagesCount === 1
      ? t('chat.newMessage')
      : t('chat.newMessages', { count: String(newMessagesCount) })
  const pinnedMessages = room.pinnedMessages
  const pinMessage = room.pinMessage
  const unpinMessage = room.unpinMessage

  // Starter prompts for the empty state — clicking one sends it right away.
  // Groups get a single neutral opener.
  const starterSuggestions =
    mode === 'group'
      ? [t('chat.starterGroup')]
      : [t('chat.starter1'), t('chat.starter2'), t('chat.starter3')]

  const itemDate = (item: GroupedTimelineItem) =>
    formatChatDate(
      item.kind === 'message'
        ? (item.msg?.created_at ?? new Date(item.created).toISOString())
        : item.kind === 'media_group'
          ? item.msgs[0].created_at
          : new Date(item.created).toISOString(),
      t,
    )

  return (
    <div className={`${styles.window}${isBusyBg ? ` ${styles.busyBg}` : ''}`}>
      {chatBackground && (
        <div className={styles.chatBgLayer} style={chatBgStyle}>
          <div className={styles.chatBgLayerOverlay} style={chatBgOverlayStyle} />
        </div>
      )}
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
          <span className={styles.liveDot} aria-hidden />
          <i className="bx bx-video" />
          <span>{t('groupCall.inCall')}</span>
          <button
            className={styles.callBannerBtn}
            onClick={() => expandGroupCall()}
          >
            {t('groupCall.expand')}
          </button>
        </div>
      )}

      {canJoinOngoingCall && ongoingGroupCall && (
        <div className={styles.callBanner} role="status">
          <span className={styles.liveDot} aria-hidden />
          <i className="bx bx-video" />
          <span>{t('groupCall.inCall')} <span className={styles.callBannerMeta}>· {ongoingGroupCall.participants.length}</span></span>
          <button
            className={styles.callBannerJoin}
            onClick={() => handleRequestJoin(ongoingGroupCall.call_id)}
            aria-label={t('groupCall.requestToJoin')}
          >
            {t('groupCall.requestToJoin')}
          </button>
        </div>
      )}

      {pinnedMessages.length > 0 && !inSearch && (
        <div className={styles.pinnedBar}>
          <div className={styles.pinnedBarHeader}>
            <i className="bx bx-pin" />
            <span>{t('chat.pinnedMessages')} ({pinnedMessages.length})</span>
            {pinnedMessages.length > 2 && (
              <button
                className={styles.pinnedBarToggle}
                onClick={() => setPinnedCollapsed((prev) => !prev)}
                aria-label={pinnedCollapsed ? t('chat.showAll') : t('chat.collapse')}
              >
                <i className={`bx ${pinnedCollapsed ? 'bx-chevron-down' : 'bx-chevron-up'}`} />
              </button>
            )}
          </div>
          {(pinnedCollapsed ? pinnedMessages.slice(0, 2) : pinnedMessages).map((pin) => (
            <div
              key={pin.message_id}
              className={styles.pinnedBarItem}
              onClick={() => scrollToMessage(pin.message_id)}
            >
              <div className={styles.pinnedBarItemContent}>
                <span className={styles.pinnedBarItemSender}>{pin.sender_name || t('chat.unknown')}</span>
                <span className={styles.pinnedBarItemText}>
                {pin.decrypt_failed
                  ? t('chat.undecryptable')
                  : pin.decrypted || !pin.e2e_version
                    ? pin.content.length > 60
                      ? pin.content.slice(0, 60) + '...'
                      : pin.content || t('chat.attachment')
                    : t('chat.decrypting')}
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
          {pinnedCollapsed && pinnedMessages.length > 2 && (
            <div className={styles.pinnedBarMore}>
              {t('chat.morePinned', { count: String(pinnedMessages.length - 2) })}
            </div>
          )}
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
        <div className={styles.messages} ref={scrollRef} onScroll={handleMessagesScroll}>
          {room.loading && (
            <div className={styles.center} role="status" aria-label={t('chat.loadingConversations')}>
              <span className={styles.loadMoreDots} aria-hidden><span /><span /><span /></span>
            </div>
          )}

          {!room.loading && timeline.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyCard}>
                <span className={styles.emptyIcon}><i className="bx bx-message-rounded" /></span>
                <p className={styles.emptyTitle}>{t('chat.noMessages')}</p>
                <p className={styles.emptyHint}>{t('chat.e2eTitle')}</p>
                <div className={styles.sampleStack} aria-hidden="true">
                  <span className={`${styles.sampleBubble} ${styles.sampleTheirs}`}>
                    {t('chat.emptySampleTheirs')}
                  </span>
                  <span className={`${styles.sampleBubble} ${styles.sampleMine}`}>
                    {t('chat.emptySampleMine')}
                  </span>
                </div>
              </div>
              <div className={styles.starterRow}>
                {starterSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={styles.starterChip}
                    onClick={() => handleSendStarter(suggestion)}
                    aria-label={t('chat.sendStarter', { text: suggestion })}
                  >
                    <i className="bx bx-send" aria-hidden="true" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!room.loading && timeline.length > 0 && (room.hasMore || room.loadingMore) && (
            <div className={styles.loadMore} role="status">
              {room.loadingMore && (
                <span className={styles.loadMoreDots} aria-hidden><span /><span /><span /></span>
              )}
              <span>{room.loadingMore ? t('chat.loadingOlder') : t('chat.scrollForOlder')}</span>
            </div>
          )}

          <div ref={timelineRef} className={styles.timelineContent}>
            {groupedTimeline.map((item, i) => {
            const prev = groupedTimeline[i - 1]
            const showDate = !prev || itemDate(prev) !== itemDate(item)
            const next = groupedTimeline[i + 1]
            const isLastInGroup = isLastInSenderGroup(item, next, myUserId)

            if (item.kind === 'media_group') {
              const mine = item.msgs[0].sender_id === myUserId
              const first = item.msgs[0]
              const isFirstInGroup = isFirstInSenderGroup(item, prev, myUserId)
              const showSenderName = mode === 'group' && !mine && isFirstInGroup
              const mapMember = mode === 'group' && !mine ? memberNames?.get(first.sender_id) : null
              const senderDisplayName = first.sender_name || mapMember?.display_name || null
              const partnerAvatar = !mine && mode === 'direct' ? conversation?.partner?.avatar_uri : null
              const senderAvatarUri = first.sender_avatar || mapMember?.avatar_uri || partnerAvatar || null
              return (
                <Fragment key={`mg-${item.msgs.map((m) => m.id).join('-')}`}>
                  {showDate && (
                    <div className={styles.dateSep}>{itemDate(item)}</div>
                  )}
                  {showSenderName && (
                    <div className={`${styles.senderLine} ${styles.groupFirst}`} onClick={() => router.push(`/profile/${first.sender_id}`)}>
                      <span className={styles.senderName}>{senderDisplayName || t('chat.unknown')}</span>
                    </div>
                  )}
                  <div
                    className={`${styles.msgRow} ${mine ? styles.mine : styles.theirs}${isFirstInGroup && !showSenderName ? ` ${styles.groupFirst}` : ''}`}
                    data-message-id={first.id}
                    data-sending={first.id.startsWith('temp-') || undefined}
                    onMouseEnter={() => handleRowEnter(first.id)}
                    onMouseLeave={scheduleToolbarHide}
                  >
                    {!mine && isFirstInGroup && (
                      <button
                        className={styles.msgAvatar}
                        onClick={() => router.push(`/profile/${first.sender_id}`)}
                        title={senderDisplayName || t('chat.unknown')}
                      >
                        <ExternalImage
                          src={senderAvatarUri || '/default-avatar.svg'}
                          alt=""
                          className={styles.msgAvatarImg}
                        />
                      </button>
                    )}
                    {!mine && !isFirstInGroup && (
                      <div className={styles.avatarSpacer} />
                    )}
                    {item.msgs[0].content?.trim() ? (
                      <div className={styles.msgStack}>
                        <div className={`${styles.bubble} ${styles.bubblePlain}`}>
                          <MediaStack msgs={item.msgs} onOpen={openLightbox} mine={mine} />
                          <div className={styles.msgLine}>
                            {item.msgs[0].content?.trim() && (
                              <div className={styles.msgText}>
                                {!item.msgs[0].decrypt_failed &&
                                  renderEmojiContent(item.msgs[0].content ?? '', emojiCodeMap, `mg-${first.id}`, styles.emojiInline)}
                              </div>
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
                        {mine && isLastInGroup && (
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
                    ) : (
                      <MediaStack msgs={item.msgs} onOpen={openLightbox} mine={mine} />
                    )}
                    <MessageTimestamp msg={first} mine={mine} visible={hoveredMsgId === first.id || toolbarHoveredId === first.id} />
                  </div>
                </Fragment>
              )
            }

            if (item.kind === 'call') {
              const callItem = item.item
              if (!callItem) return null
              const isFirstInGroup = isFirstInSenderGroup(item, prev, myUserId)
              const callMine = callItem.direction === 'outgoing'
              const isVideo = callItem.call_type === 'video'
              const missed = callItem.is_missed
              const callTone = missed ? 'missed' : callMine ? 'outgoing' : 'incoming'
              const callLabel = missed
                ? t('call.historyMissed')
                : isVideo
                  ? t('call.videoCall')
                  : t('call.voiceCall')
              const callCreatedIso = new Date(callItem.created_at).toISOString()
              return (
                <Fragment key={`call-${callItem.id}`}>
                  {showDate && <div className={styles.dateSep}>{itemDate(item)}</div>}
                  <div className={`${styles.msgRow} ${callMine ? styles.mine : styles.theirs}${isFirstInGroup ? ` ${styles.groupFirst}` : ''}`}>
                    {!callMine && isFirstInGroup && (
                      <button className={styles.msgAvatar} title={callItem.other_user.display_name}>
                        <ExternalImage
                          src={callItem.other_user.avatar_uri || '/default-avatar.svg'}
                          alt=""
                          className={styles.msgAvatarImg}
                        />
                      </button>
                    )}
                    {!callMine && !isFirstInGroup && (
                      <div className={styles.avatarSpacer} />
                    )}
                    <CallHistoryBubble
                      tone={callTone}
                      mine={callMine}
                      isVideo={isVideo}
                      title={callLabel}
                      durationText={callItem.duration > 0 ? formatCallDuration(callItem.duration) : null}
                      timeText={formatClockTime(callCreatedIso)}
                      showAction={!callMine && !isInCall}
                      actionLabel={t('call.callback')}
                      onAction={() => {
                        if (isInCall) return
                        void startCall({
                          user_id: callItem.other_user.id,
                          display_name: callItem.other_user.display_name,
                          avatar_uri: callItem.other_user.avatar_uri,
                        }, callItem.call_type)
                      }}
                    />
                  </div>
                </Fragment>
              )
            }

            if (item.kind === 'group_call') {
              const gc = item.call
              if (!gc) return null
              const isFirstInGroup = isFirstInSenderGroup(item, prev, myUserId)
              const gcMine = gc.caller_id === myUserId
              const gcCallerName = memberNames?.get(gc.caller_id)?.display_name || t('chat.unknown')
              const gcDuration = gc.ended_at && gc.created_at
                ? Math.floor((new Date(gc.ended_at).getTime() - new Date(gc.created_at).getTime()) / 1000)
                : 0
              const gcMissed = gc.status === 'missed'
              const gcIsVideo = gc.is_video
              const gcTone = gcMissed ? 'missed' : gcMine ? 'outgoing' : 'incoming'
              const gcLabel = gcMissed
                ? t('call.historyMissed')
                : gcIsVideo
                  ? t('call.videoCallGroup')
                  : t('call.voiceCallGroup')
              const gcShowDuration = !gcMissed && !(activeGroupCallId === gc.call_id) && gcDuration > 0
              // Bystander join: ongoing call I'm not part of while I'm free —
              // independent of activeGroupCallId (which only exists once I've
              // already joined a call).
              const gcIsOngoing = !gc.ended_at && gc.status !== 'ended' && gc.status !== 'missed'
              const gcShowJoin = gcIsOngoing && !gcMine && !gc.participants.includes(myUserId) && !isInCall && !isInGroupCall
              return (
                <Fragment key={`gc-${gc.call_id}`}>
                  {showDate && <div className={styles.dateSep}>{itemDate(item)}</div>}
                  <div className={`${styles.msgRow} ${gcMine ? styles.mine : styles.theirs}${isFirstInGroup ? ` ${styles.groupFirst}` : ''}`}>
                    {!gcMine && isFirstInGroup && (
                      <button className={styles.msgAvatar} title={gcCallerName}>
                        <ExternalImage
                          src={memberNames?.get(gc.caller_id)?.avatar_uri || '/default-avatar.svg'}
                          alt=""
                          className={styles.msgAvatarImg}
                        />
                      </button>
                    )}
                    {!gcMine && !isFirstInGroup && (
                      <div className={styles.avatarSpacer} />
                    )}
                    <CallHistoryBubble
                      tone={gcTone}
                      mine={gcMine}
                      isVideo={gcIsVideo === true}
                      title={gcLabel}
                      durationText={gcShowDuration ? formatCallDuration(gcDuration) : null}
                      timeText={formatClockTime(new Date(gc.created_at).toISOString())}
                      showAction={gcShowJoin}
                      actionLabel={t('groupCall.requestToJoin')}
                      onAction={() => handleRequestJoin(gc.call_id)}
                    />
                  </div>
                </Fragment>
              )
            }

            const msg = item.msg
            if (!msg) return null
            const mine = msg.sender_id === myUserId
            const singleEmoji =
              !msg.deleted && !msg.decrypt_failed
                ? singleEmojiCode(msg.content ?? '', emojiCodeMap)
                : null
            const singleGiphy =
              !msg.deleted && !msg.decrypt_failed && !singleEmoji
                ? isSingleGiphyUrl(separateGiphyUrls(msg.content ?? ''))
                : false
            const singleEmojifyi =
              !msg.deleted && !msg.decrypt_failed && !singleEmoji
                ? isSingleEmojifyiUrl(msg.content ?? '')
                : false
            const plain =
              !msg.deleted &&
              !msg.decrypt_failed &&
              ((!msg.content && Boolean(msg.media_id || msg.media_uri || msg.emoji_id)) ||
                (!msg.media_id &&
                  !msg.media_uri &&
                  !msg.emoji_id &&
                  (singleEmoji !== null || singleGiphy || singleEmojifyi)))
            // Voice rows ignore content for layout — the player is the sole
            // surface (duration display built-in), so server-side stray text
            // must never spawn a caption/outer text bubble behind it.
            const isVoice = isVoiceMessage(msg)
            // Standalone audio row: media-only audio (or typeless media-only
            // leftover) with no reply context renders the player with NO outer
            // bubble — making a stray white wrapper structurally impossible.
            // Voice replies keep the legacy wrapped path (quote needs a bubble).
            const isAudioRow = !msg.deleted &&
              !msg.decrypt_failed &&
              !msg.reply_to &&
              (isVoice ||
                (Boolean(msg.media_id || msg.media_uri) &&
                  !msg.content?.trim() &&
                  !msg.emoji_id &&
                  !msg.shared_post_id &&
                  (msg.media_type == null || msg.media_type.startsWith('audio/'))))
            const isFirstInGroup = isFirstInSenderGroup(item, prev, myUserId)
            const showSenderName = mode === 'group' && !mine && isFirstInGroup
            const mapMember = mode === 'group' && !mine ? memberNames?.get(msg.sender_id) : null
            const senderDisplayName = msg.sender_name || mapMember?.display_name || null
            const partnerAvatar = !mine && mode === 'direct' ? conversation?.partner?.avatar_uri : null
            const senderAvatarUri = msg.sender_avatar || mapMember?.avatar_uri || partnerAvatar || null
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
                <>
                  {showSenderName && (
                    <div className={`${styles.senderLine} ${styles.groupFirst}`} onClick={() => router.push(`/profile/${msg.sender_id}`)}>
                      <span className={styles.senderName}>{senderDisplayName || t('chat.unknown')}</span>
                    </div>
                  )}
                  <div
                    className={`${styles.msgRow} ${mine ? styles.mine : styles.theirs}${isFirstInGroup && !showSenderName ? ` ${styles.groupFirst}` : ''}`}
                    data-message-id={msg.id}
                  >
                    {!mine && isFirstInGroup && (
                      <button
                        className={styles.msgAvatar}
                        onClick={() => router.push(`/profile/${msg.sender_id}`)}
                        title={senderDisplayName || t('chat.unknown')}
                      >
                        <ExternalImage
                          src={senderAvatarUri || '/default-avatar.svg'}
                          alt=""
                          className={styles.msgAvatarImg}
                        />
                      </button>
                    )}
                    {!mine && !isFirstInGroup && (
                      <div className={styles.avatarSpacer} />
                    )}
                    <div className={styles.msgStack}>
                      <GroupInviteBubble
                        message={msg}
                        myUserId={myUserId}
                        onAccepted={onGroupInviteAccepted}
                      />
                    </div>
                  </div>
                </>
                ) : msg.type === 'shared_post' ? (
                <div
                  className={`${styles.msgRow} ${mine ? styles.mine : styles.theirs}${isFirstInGroup ? ` ${styles.groupFirst}` : ''}`}
                  data-sending={msg.id.startsWith('temp-') || undefined}
                  onMouseEnter={() => handleRowEnter(msg.id)}
                  onMouseLeave={scheduleToolbarHide}
                >
                  {!mine && isFirstInGroup && (
                    <button
                      className={styles.msgAvatar}
                      onClick={() => router.push(`/profile/${msg.sender_id}`)}
                      title={senderDisplayName || t('chat.unknown')}
                    >
                      <ExternalImage
                        src={senderAvatarUri || '/default-avatar.svg'}
                        alt=""
                        className={styles.msgAvatarImg}
                      />
                    </button>
                  )}
                  {!mine && !isFirstInGroup && (
                    <div className={styles.avatarSpacer} />
                  )}
                  <div className={styles.msgStack}>
                  <div className={`${styles.bubble}${!isFirstInGroup ? ` ${styles.bubbleCont}` : ''}`}>
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
                    <ReactionsRow
                      msg={msg}
                      myUserId={myUserId}
                      emojis={emojis}
                      onReact={onReact}
                      t={t}

                    />
                  </div>
                    {mine && isLastInGroup && (
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
                  <MessageTimestamp msg={msg} mine={mine} visible={hoveredMsgId === msg.id || toolbarHoveredId === msg.id} />
                </div>
                ) : isAudioRow ? (
                <>
                {showSenderName && (
                  <div className={`${styles.senderLine} ${styles.groupFirst}`} onClick={() => router.push(`/profile/${msg.sender_id}`)}>
                    <span className={styles.senderName}>{senderDisplayName || t('chat.unknown')}</span>
                  </div>
                )}
                <div
                  className={`${styles.msgRow} ${mine ? styles.mine : styles.theirs} ${highlightedMsgId === msg.id ? styles.highlight : ''}${isFirstInGroup && !showSenderName ? ` ${styles.groupFirst}` : ''}${!isFirstInGroup ? ` ${styles.voiceCont}` : ''}`}
                  data-message-id={msg.id}
                  data-sending={msg.id.startsWith('temp-') || undefined}
                  onMouseEnter={() => handleRowEnter(msg.id)}
                  onMouseLeave={scheduleToolbarHide}
                >
                  {pinnedMessages.some((p) => p.message_id === msg.id) && (
                    <span className={styles.pinBadge} title={t('chat.pinnedMessage')}>
                      <i className="bx bx-pin" />
                    </span>
                  )}
                  {!mine && isFirstInGroup && (
                    <button
                      className={styles.msgAvatar}
                      onClick={() => router.push(`/profile/${msg.sender_id}`)}
                      title={senderDisplayName || t('chat.unknown')}
                    >
                      <ExternalImage
                        src={senderAvatarUri || '/default-avatar.svg'}
                        alt=""
                        className={styles.msgAvatarImg}
                      />
                    </button>
                  )}
                  {!mine && !isFirstInGroup && (
                    <div className={styles.avatarSpacer} />
                  )}
                  <div className={styles.msgStack}>
                    <MessageMedia message={msg} mine={mine} />
                    {mine && isLastInGroup && (
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
                      onToolbarMouseEnter={() => handleToolbarEnter(msg.id)}
                      onToolbarMouseLeave={scheduleToolbarHide}
                    />
                  )}
                  <MessageTimestamp msg={msg} mine={mine} visible={hoveredMsgId === msg.id || toolbarHoveredId === msg.id} />
                </div>
                </>
                ) : (
                <>
                {showSenderName && (
                  <div className={`${styles.senderLine} ${styles.groupFirst}`} onClick={() => router.push(`/profile/${msg.sender_id}`)}>
                    <span className={styles.senderName}>{senderDisplayName || t('chat.unknown')}</span>
                  </div>
                )}
                <div
                  className={`${styles.msgRow} ${mine ? styles.mine : styles.theirs} ${highlightedMsgId === msg.id ? styles.highlight : ''}${isFirstInGroup && !showSenderName ? ` ${styles.groupFirst}` : ''}`}
                  data-message-id={msg.id}
                  data-sending={msg.id.startsWith('temp-') || undefined}
                  onMouseEnter={() => handleRowEnter(msg.id)}
                  onMouseLeave={scheduleToolbarHide}
                  onTouchStart={() => {
                    const timer = setTimeout(() => {
                      setHoveredMsgId(msg.id)
                    }, 500)
                    const handleTouchEnd = () => {
                      clearTimeout(timer)
                      document.removeEventListener('touchend', handleTouchEnd)
                    }
                    document.addEventListener('touchend', handleTouchEnd)
                  }}
                >
                  {pinnedMessages.some((p) => p.message_id === msg.id) && (
                    <span className={styles.pinBadge} title={t('chat.pinnedMessage')}>
                      <i className="bx bx-pin" />
                    </span>
                  )}
                  {!mine && isFirstInGroup && (
                    <button
                      className={styles.msgAvatar}
                      onClick={() => router.push(`/profile/${msg.sender_id}`)}
                      title={senderDisplayName || t('chat.unknown')}
                    >
                      <ExternalImage
                        src={senderAvatarUri || '/default-avatar.svg'}
                        alt=""
                        className={styles.msgAvatarImg}
                      />
                    </button>
                  )}
                  {!mine && !isFirstInGroup && (
                    <div className={styles.avatarSpacer} />
                  )}
                  {msg.deleted ? (
                    <div className={`${styles.bubble}${!isFirstInGroup ? ` ${styles.bubbleCont}` : ''}`}>
                      <div className={styles.msgLine}>
                        <span className={styles.deletedText}>{t('chat.messageDeleted')}</span>
                      </div>
                    </div>
                  ) : msg.media_id && msg.content && !isVoice ? (
                    <div className={styles.msgStack}>
                      <div className={`${styles.bubble} ${styles.bubblePlain}`}>
                        <div className={styles.mediaWrap}>
                          <MessageMedia message={msg} onClick={() => openLightbox([msg], 0)} mine={mine} />
                        </div>
                      </div>
                      <div className={`${styles.bubble}${!isFirstInGroup ? ` ${styles.bubbleCont}` : ''}`}>
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
                                : msg.reply_to.decrypt_failed
                                  ? t('chat.undecryptable')
                                  : msg.reply_to.decrypting
                                    ? t('chat.decrypting')
                                    : msg.reply_to.content || t('chat.attachment')}
                            </span>
                          </div>
                        )}
                        <div className={styles.msgLine}>
                          {msg.decrypt_failed ? (
                            room.retryDecrypt ? (
                              <button
                                type="button"
                                className={styles.retryDecrypt}
                                onClick={() => room.retryDecrypt?.(msg.id)}
                                title={t('chat.retryDecrypt')}
                                aria-label={t('chat.retryDecrypt')}
                              >
                                <i className="bx bxs-lock-alt" /> {t('chat.undecryptable')}
                              </button>
                            ) : (
                              <span className={styles.deletedText}>
                                <i className="bx bxs-lock-alt" /> {t('chat.undecryptable')}
                              </span>
                            )
                          ) : (
                            <span className={styles.msgText}>
                              {renderEmojiContent(msg.content, emojiCodeMap, msg.id, styles.emojiInline)}
                            </span>
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
                        {mine && isLastInGroup && (
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
                    <div className={styles.msgStack}>
                    <div
                      className={`${styles.bubble}${(plain || isSingleVideo || isVoice) ? ` ${styles.bubblePlain}` : ''}${!isFirstInGroup && !plain && !isSingleVideo && !isVoice ? ` ${styles.bubbleCont}` : ''}`}
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
                            {msg.reply_to.decrypt_failed
                              ? t('chat.undecryptable')
                              : msg.reply_to.decrypting
                                ? t('chat.decrypting')
                                : msg.reply_to.content || t('chat.attachment')}
                          </span>
                        </div>
                      )}
                      {(msg.media_id || msg.media_uri) && (
                        <div className={styles.mediaWrap}>
                          <MessageMedia message={msg} onClick={() => openLightbox([msg], 0)} mine={mine} />
                        </div>
                      )}
                      {msg.emoji_id && !msg.media_id && !msg.media_uri && (
                        <EmojiBubble message={msg} emojis={emojis} />
                      )}
                      {msg.decrypt_failed ||
                      (!isVoice && msg.content && !isSingleVideo && !singleEmoji && !singleGiphy && !singleEmojifyi) ? (
                        <div className={styles.msgLine}>
                          {msg.decrypt_failed ? (
                            room.retryDecrypt ? (
                              <button
                                type="button"
                                className={styles.retryDecrypt}
                                onClick={() => room.retryDecrypt?.(msg.id)}
                                title={t('chat.retryDecrypt')}
                                aria-label={t('chat.retryDecrypt')}
                              >
                                <i className="bx bxs-lock-alt" /> {t('chat.undecryptable')}
                              </button>
                            ) : (
                              <span className={styles.deletedText}>
                                <i className="bx bxs-lock-alt" /> {t('chat.undecryptable')}
                              </span>
                            )
                          ) : (
                            <span className={styles.msgText}>
                              {renderEmojiContent(msg.content, emojiCodeMap, msg.id, styles.emojiInline)}
                            </span>
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
                          {(singleGiphy || singleEmojifyi) && msg.content && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={singleEmojifyi ? msg.content.trim() : giphyStillUrl(msg.content.trim())}
                              alt="emoji"
                              className={styles.emojiMsg}
                              loading="lazy"
                              decoding="async"
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
                      {mine && isLastInGroup && (
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
                      onToolbarMouseEnter={() => handleToolbarEnter(msg.id)}
                      onToolbarMouseLeave={scheduleToolbarHide}
                    />
                  )}
                  <MessageTimestamp msg={msg} mine={mine} visible={hoveredMsgId === msg.id || toolbarHoveredId === msg.id} />
                </div>
                </>
                )}
              </Fragment>
            )
          })}
          </div>
        </div>
      )}

      {/* Zero-height flow anchor: the pill floats over the message list, just
          above the typing indicator / composer, without shifting the scroll
          area. Floating Actions layer — DESIGN §11.23. */}
      <div className={styles.bottomFloat}>
        {!inSearch && (newMessagesCount > 0 || !atBottom) && (
          <button
            type="button"
            className={`${styles.newMessagesBar}${newMessagesCount === 0 ? ` ${styles.newMessagesCompact}` : ''}`}
            onClick={scrollToBottom}
            aria-label={newMessagesCount > 0 ? newMessagesLabel : t('chat.scrollToLatest')}
          >
            <i className="bx bx-chevron-down" aria-hidden />
            {newMessagesCount > 0 && (
              <>
                <span className={styles.newMessagesText}>{newMessagesLabel}</span>
                <span className={styles.newMessagesCount} aria-hidden>{newMessagesCount}</span>
              </>
            )}
          </button>
        )}
        <span className={styles.srOnly} role="status" aria-live="polite">
          {!inSearch && newMessagesCount > 0 ? newMessagesLabel : ''}
        </span>
      </div>

      <div className={styles.typingFloat}>
        {(mode === 'group' ? (typingUsers && typingUsers.size > 0) : room.partnerTyping) && (
          <>
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
          </>
        )}
      </div>

      <Composer
        room={room}
        chatId={chatId}
        replyingTo={replyingTo}
        forwarding={forwarding ?? null}
        onClearReply={() => setReplyingTo(null)}
        onClearForward={onClearForward ?? (() => {})}
        onScrollToMessage={scrollToMessage}
        initialDraft={initialDraft}
        autoSendReady={autoSendReady}
        onDraftConsumed={onDraftConsumed}
      />

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
        <p className={styles.deleteText}>
          {isOwnDeleteTarget ? t('chat.recallConfirm') : t('chat.deleteConfirm')}
        </p>
        <div className={styles.deleteActions}>
          {isOwnDeleteTarget && (
            <button className={styles.dangerBtn} onClick={() => confirmDelete('all')}>
              <i className="bx bx-undo" />
              {t('chat.deleteForAll')}
            </button>
          )}
          <button
            className={isOwnDeleteTarget ? styles.ghostBtn : styles.dangerBtn}
            onClick={() => confirmDelete('me')}
          >
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

