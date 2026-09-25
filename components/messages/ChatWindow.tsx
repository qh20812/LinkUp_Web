'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ExternalImage from '../ExternalImage'
import OnlineIndicator from '../OnlineIndicator'
import Modal from '../Modal'
import { useTranslation } from '../../hooks/useTranslation'
import { useAuth } from '../../hooks/useAuth'
import { useEmojis } from '../../hooks/useEmojis'
import { formatChatDate, formatCallDuration } from '../../utils/chat'
import { isSingleGiphyUrl } from '../../utils/giphy'
import { EmojiImage, renderEmojiContent } from './EmojiImage'
import GroupInviteBubble from './GroupInviteBubble'
import VideoLinkPreview from './VideoLinkPreview'
import { extractVideoUrls } from '../../utils/videoLink'
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
    expand: expandGroupCall,
  } = useGroupCall()
  const { isOnline, prefetchPresence } = usePresence()
  const { emojis } = useEmojis()
  const emojiCodeMap = useMemo(() => {
    // Backend trước, EMOTION (GIPHY) ghi đè — render text ưu tiên GIPHY thay twemoji CDN.
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
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)
  const [toolbarHoveredId, setToolbarHoveredId] = useState<string | null>(null)
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

  const {
    scrollRef,
    timelineRef,
    newMessagesCount,
    scrollToBottom,
    scrollToMessage: scrollToMessageFn,
    highlightedMsgId,
    setHighlightedMsgId,
    handleMessagesScroll,
  } = useChatScroll({
    messagesLength: room.messages.length,
    callHistoryLength: callHistory.length,
    searchResults: room.searchResults,
    loading: room.loading,
    loadingMore: room.loadingMore,
    hasMore: room.hasMore,
    loadMoreMessages: room.loadMoreMessages,
  })

  const chatId = conversation?.chat_id ?? groupChatId ?? null
  useEffect(() => {
    if (chatId) scrollToBottom()
  }, [chatId, scrollToBottom])

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
        ? (item.msg?.created_at ?? new Date(item.created).toISOString())
        : item.kind === 'media_group'
          ? item.msgs[0].created_at
          : new Date(item.created).toISOString(),
      t,
    )

  return (
    <div className={styles.window}>
      {chatBackground && (
        <div className={styles.chatBgLayer} style={chatBgStyle}>
          <div className={styles.chatBgLayerOverlay} />
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
              const partnerAvatar = !mine && mode === 'direct' ? conversation?.partner?.avatar_uri : null
              const senderAvatarUri = first.sender_avatar || mapMember?.avatar_uri || partnerAvatar || null
              const senderMember = showSenderName ? { display_name: senderDisplayName || '', avatar_uri: senderAvatarUri || '' } : null
              const isFirstInGroup = !prev || prev.kind !== 'message' || !prev.msg || prev.msg.sender_id !== first.sender_id
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
                    onMouseEnter={() => setHoveredMsgId(first.id)}
                    onMouseLeave={() => setHoveredMsgId(null)}
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
                          <MediaStack msgs={item.msgs} onOpen={openLightbox} />
                          <div className={styles.msgLine}>
                            {item.msgs[0].content?.trim() && (
                              <div className={styles.msgText}>
                                {!item.msgs[0].decrypt_failed &&
                                  renderEmojiContent(item.msgs[0].content ?? '', emojiCodeMap, `mg-${first.id}`, styles.emojiInline)}
                              </div>
                            )}
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
                    <MessageTimestamp msg={first} mine={mine} visible={hoveredMsgId === first.id || toolbarHoveredId === first.id} />
                  </div>
                </Fragment>
              )
            }

            if (item.kind === 'call') {
              const callItem = item.item
              if (!callItem) return null
              const isFirstInGroup = !prev || prev.kind !== 'call' || !prev.item || prev.item.other_user.id !== callItem.other_user.id
              const callMine = callItem.direction === 'outgoing'
              const isVideo = callItem.call_type === 'video'
              const missed = callItem.is_missed
              const callIcon = callMine ? 'bx-phone-call' : 'bx-phone-incoming'
              const callDirection = missed ? 'missed' : callMine ? 'outgoing' : 'incoming'
              const callLabel = missed
                ? t('call.historyMissed')
                : isVideo
                  ? t('call.videoCall')
                  : t('call.voiceCall')
              const showDuration = callItem.duration > 0
              return (
                <Fragment key={`call-${callItem.id}`}>
                  {showDate && <div className={styles.dateSep}>{itemDate(item)}</div>}
                  <div className={`${styles.msgRow} ${callMine ? styles.mine : styles.theirs}`}>
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
                    <div className={`${styles.bubble} ${styles.callBubble} ${styles[callDirection]}`}>
                      <i className={`bx ${callIcon}`} />
                      <div className={styles.callContent}>
                        <span className={styles.callLabel}>{callLabel}</span>
                        {showDuration && (
                          <span className={styles.callDuration}>{formatCallDuration(callItem.duration)}</span>
                        )}
                        {!callMine && !isInCall && (
                          <button
                            className={styles.callBackBtn}
                            onClick={() => {
                              if (isInCall) return
                              void startCall({
                                user_id: callItem.other_user.id,
                                display_name: callItem.other_user.display_name,
                                avatar_uri: callItem.other_user.avatar_uri,
                              }, callItem.call_type)
                            }}
                          >
                            <i className="bx bx-phone" />
                            <span>{t('call.callback')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <MessageTimestamp
                      msg={{ id: callItem.id, created_at: new Date(callItem.created_at).toISOString(), sender_id: '' } as ChatMessage}
                      mine={callMine}
                      visible={false}
                    />
                  </div>
                </Fragment>
              )
            }

            if (item.kind === 'group_call') {
              const gc = item.call
              if (!gc) return null
              const isFirstInGroup = !prev || prev.kind !== 'group_call' || !prev.call || prev.call.caller_id !== gc.caller_id
              const gcMine = gc.caller_id === myUserId
              const gcCallerName = memberNames?.get(gc.caller_id)?.display_name || t('chat.unknown')
              const gcDuration = gc.ended_at && gc.created_at
                ? Math.floor((new Date(gc.ended_at).getTime() - new Date(gc.created_at).getTime()) / 1000)
                : 0
              const gcMissed = gc.status === 'missed'
              const gcIsVideo = gc.is_video
              const gcIcon = gcMine ? 'bx-phone-call' : 'bx-phone-incoming'
              const gcDirection = gcMissed ? 'missed' : gcMine ? 'outgoing' : 'incoming'
              const gcLabel = gcMissed
                ? t('call.historyMissed')
                : gcIsVideo
                  ? t('call.videoCallGroup')
                  : t('call.voiceCallGroup')
              const gcShowDuration = !gcMissed && !(activeGroupCallId === gc.call_id) && gcDuration > 0
              const gcShowJoin = activeGroupCallId === gc.call_id && !gcMine && !gc.participants.includes(myUserId)
              return (
                <Fragment key={`gc-${gc.call_id}`}>
                  {showDate && <div className={styles.dateSep}>{itemDate(item)}</div>}
                  <div className={`${styles.msgRow} ${gcMine ? styles.mine : styles.theirs}`}>
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
                    <div className={`${styles.bubble} ${styles.callBubble} ${styles[gcDirection]}`}>
                      <i className={`bx ${gcIcon}`} />
                      <div className={styles.callContent}>
                        <span className={styles.callLabel}>{gcLabel}</span>
                        {gcShowDuration && (
                          <span className={styles.callDuration}>
                            {String(Math.floor(gcDuration / 60)).padStart(2, '0')}:{String(gcDuration % 60).padStart(2, '0')}
                          </span>
                        )}
                        {gcShowJoin && (
                          <button
                            className={styles.callBackBtn}
                            onClick={() => handleRequestJoin(gc.call_id)}
                          >
                            <i className="bx bx-phone" />
                            {t('groupCall.requestToJoin')}
                          </button>
                        )}
                      </div>
                    </div>
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
                ? isSingleGiphyUrl(msg.content ?? '')
                : false
            const plain =
              !msg.deleted &&
              !msg.decrypt_failed &&
              ((!msg.content && Boolean(msg.media_id || msg.media_uri || msg.emoji_id)) ||
                (!msg.media_id && !msg.media_uri && !msg.emoji_id && (singleEmoji !== null || singleGiphy)))
            const showSenderName = mode === 'group' && !mine
            const mapMember = showSenderName ? memberNames?.get(msg.sender_id) : null
            const senderDisplayName = msg.sender_name || mapMember?.display_name || null
            const partnerAvatar = !mine && mode === 'direct' ? conversation?.partner?.avatar_uri : null
            const senderAvatarUri = msg.sender_avatar || mapMember?.avatar_uri || partnerAvatar || null
            const senderMember = showSenderName ? { display_name: senderDisplayName || '', avatar_uri: senderAvatarUri || '' } : null
            const videoUrls = !msg.deleted && !msg.decrypt_failed && msg.content
              ? extractVideoUrls(msg.content)
              : []
            const isSingleVideo = videoUrls.length === 1 && videoUrls[0] === msg.content?.trim()
            const isFirstInGroup = !prev || prev.kind !== 'message' || !prev.msg || prev.msg.sender_id !== msg.sender_id
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
                <div
                  className={`${styles.msgRow} ${mine ? styles.mine : styles.theirs}`}
                  onMouseEnter={() => setHoveredMsgId(msg.id)}
                  onMouseLeave={() => setHoveredMsgId(null)}
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
                  <MessageTimestamp msg={msg} mine={mine} visible={hoveredMsgId === msg.id || toolbarHoveredId === msg.id} />
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
                    <div className={styles.bubble}>
                      <div className={styles.msgLine}>
                        <span className={styles.deletedText}>{t('chat.messageDeleted')}</span>
                      </div>
                    </div>
                  ) : msg.media_id && msg.content ? (
                    <div className={styles.msgStack}>
                      <div className={`${styles.bubble} ${styles.bubblePlain}`}>
                        <div className={styles.mediaWrap}>
                          <MessageMedia message={msg} onClick={() => openLightbox([msg], 0)} />
                        </div>
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
                            <span className={styles.deletedText}>
                              <i className="bx bxs-lock-alt" /> {t('chat.undecryptable')}
                            </span>
                          ) : (
                            <span className={styles.msgText}>
                              {renderEmojiContent(msg.content, emojiCodeMap, msg.id, styles.emojiInline)}
                            </span>
                          )}
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
                          <MessageMedia message={msg} onClick={() => openLightbox([msg], 0)} />
                        </div>
                      )}
                      {msg.emoji_id && !msg.media_id && !msg.media_uri && (
                        <EmojiBubble message={msg} emojis={emojis} />
                      )}
                      {msg.decrypt_failed || (msg.content && !isSingleVideo && !singleEmoji && !singleGiphy) ? (
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
                          {msg.content && singleGiphy && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={msg.content.trim()}
                              alt="emoji"
                              className={styles.emojiMsg}
                              loading="lazy"
                              decoding="async"
                            />
                          )}
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

      {newMessagesCount > 0 && (
        <button className={styles.newMessagesBar} onClick={scrollToBottom}>
          <i className="bx bx-chevron-down" />
          {t('chat.newMessages', { count: String(newMessagesCount) })}
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

