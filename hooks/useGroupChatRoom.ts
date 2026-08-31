'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage, PinnedMessage } from '../types'
import type { GroupChatSocket } from './useGroupChatSocket'
import { useToast } from '../contexts/ToastContext'

interface UseGroupChatRoomOptions {
  chatId: string | null
  myUserId: string
  socket: GroupChatSocket
  onNewMessage?: (message: ChatMessage) => void
}

export interface SendMessageOptions {
  emojiId?: string
  mediaId?: string
  mediaUri?: string
  mediaType?: string
  mediaGroupId?: string
  gifUrl?: string
  sharedPostId?: string
  replyToMessageId?: string
}

export interface GroupChatRoom {
  messages: ChatMessage[]
  loading: boolean
  hasMore: boolean
  loadingMore: boolean
  typingUsers: Set<string>
  partnerTyping: boolean
  searchResults: ChatMessage[] | null
  searchKeyword: string
  pinnedMessages: PinnedMessage[]
  clearSearch: () => void
  sendMessage: (content: string, opts?: SendMessageOptions) => void
  sendTyping: (isTyping: boolean) => void
  deleteMessage: (messageId: string, mode: 'all' | 'me') => void
  searchMessages: (keyword: string) => void
  pinMessage: (messageId: string) => void
  unpinMessage: (messageId: string) => void
  loadMoreMessages: () => void
  callHistory: Array<{
    call_id: string
    chat_id: string
    caller_id: string
    participants: string[]
    status: string
    created_at: string
    ended_at?: string
  }>
}

function dedupeByID(list: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>()
  const out: ChatMessage[] = []
  for (const msg of list) {
    if (seen.has(msg.id)) continue
    seen.add(msg.id)
    out.push(msg)
  }
  return out
}

function sortByCreatedAt(list: ChatMessage[]): ChatMessage[] {
  return [...list].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

export function useGroupChatRoom({
  chatId,
  myUserId,
  socket,
  onNewMessage,
}: UseGroupChatRoomOptions): GroupChatRoom {
  const { toast } = useToast()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [searchResults, setSearchResults] = useState<ChatMessage[] | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])
  const [callHistory, setCallHistory] = useState<
    Array<{
      call_id: string
      chat_id: string
      caller_id: string
      participants: string[]
      status: string
      created_at: string
      ended_at?: string
    }>
  >([])

  const activeChatIdRef = useRef<string | null>(null)
  const myUserIdRef = useRef(myUserId)
  const onNewMessageRef = useRef(onNewMessage)
  const pendingIdsRef = useRef<string[]>([])
  const pendingSeqRef = useRef(0)
  const messagesRef = useRef<ChatMessage[]>([])

  const socketSubscribe = socket.subscribe
  const socketStatus = socket.status
  const socketSend = socket.send

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    myUserIdRef.current = myUserId
  }, [myUserId])

  useEffect(() => {
    onNewMessageRef.current = onNewMessage
  }, [onNewMessage])

  const handleHistory = useCallback((payload: unknown) => {
    const data = payload as {
      chat_id?: string
      messages?: ChatMessage[]
      calls?: Array<{
        call_id: string
        chat_id: string
        caller_id: string
        participants: string[]
        status: string
        created_at: string
        ended_at?: string
      }>
    }
    if (!data || data.chat_id !== activeChatIdRef.current) return
    setLoading(false)
    setMessages(sortByCreatedAt(dedupeByID(data.messages ?? [])))
    setCallHistory(data.calls ?? [])
  }, [])

  const handleNewMessage = useCallback(
    (payload: unknown) => {
      const msg = payload as ChatMessage
      if (!msg || !msg.id || !msg.chat_id) return
      if (msg.chat_id === activeChatIdRef.current) {
        const pending = pendingIdsRef.current
        if (pending.length > 0 && msg.sender_id === myUserIdRef.current) {
          const tempID = pending[0]
          pendingIdsRef.current = pending.slice(1)
          setMessages((prev) =>
            sortByCreatedAt(
              dedupeByID([...prev.filter((m) => m.id !== tempID), msg]),
            ),
          )
        } else {
          setMessages((prev) => sortByCreatedAt(dedupeByID([...prev, msg])))
        }
      }
      onNewMessageRef.current?.(msg)
    },
    [],
  )

  const handleTyping = useCallback((payload: unknown) => {
    const data = payload as { chat_id?: string; user_id?: string; is_typing?: boolean }
    if (!data || data.chat_id !== activeChatIdRef.current) return
    if (data.user_id === myUserIdRef.current) return
    setTypingUsers((prev) => {
      const next = new Set(prev)
      if (data.is_typing) {
        next.add(data.user_id!)
      } else {
        next.delete(data.user_id!)
      }
      return next
    })
  }, [])

  const handleSearchResult = useCallback((payload: unknown) => {
    const data = payload as { chat_id?: string; keyword?: string; messages?: ChatMessage[] }
    if (!data || data.chat_id !== activeChatIdRef.current) return
    setSearchKeyword(data.keyword ?? '')
    setSearchResults(sortByCreatedAt(dedupeByID(data.messages ?? [])))
  }, [])

  const handlePinnedList = useCallback((payload: unknown) => {
    const data = payload as { pinned_messages?: PinnedMessage[] }
    if (!data) return
    setPinnedMessages(data.pinned_messages ?? [])
  }, [])

  const handlePinned = useCallback((payload: unknown) => {
    const pin = payload as PinnedMessage
    if (!pin || !pin.message_id) return
    setPinnedMessages((prev) => {
      const exists = prev.some((p) => p.message_id === pin.message_id)
      if (exists) return prev
      return [pin, ...prev].slice(0, 2)
    })
  }, [])

  const handleUnpinned = useCallback((payload: unknown) => {
    const data = payload as { chat_id?: string; message_id?: string }
    if (!data || !data.message_id) return
    setPinnedMessages((prev) => prev.filter((p) => p.message_id !== data.message_id))
  }, [])

  const handleDeleted = useCallback((payload: unknown) => {
    const data = payload as { chat_id?: string; message_id?: string }
    if (!data || data.chat_id !== activeChatIdRef.current || !data.message_id) return
    setMessages((prev) =>
      prev.map((m) => (m.id === data.message_id ? { ...m, deleted: true, content: '' } : m)),
    )
    setSearchResults((prev) =>
      prev
        ? prev.map((m) =>
            m.id === data.message_id ? { ...m, deleted: true, content: '' } : m,
          )
        : prev,
    )
  }, [])

  const handleError = useCallback((payload: unknown) => {
    const data = payload as { message?: string }
    if (!data || !data.message) return
    toast({ type: 'error', title: data.message })
    const pending = pendingIdsRef.current
    if (pending.length > 0) {
      const tempID = pending[pending.length - 1]
      pendingIdsRef.current = pending.slice(0, -1)
      setMessages((prev) => prev.filter((m) => m.id !== tempID))
    }
  }, [toast])

  const handleMemberLeft = useCallback((payload: unknown) => {
    const data = payload as { chat_id?: string; user_id?: string; leave_mode?: string }
    if (!data || data.chat_id !== activeChatIdRef.current) return
    if (data.leave_mode !== 'public') return
    const sysMsg: ChatMessage = {
      id: `sys-left-${data.user_id}-${Date.now()}`,
      chat_id: data.chat_id!,
      sender_id: data.user_id || '',
      content: `member_left|${data.user_id || ''}`,
      type: 'member_left',
      message_category: 'system',
      is_anonymized: false,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => sortByCreatedAt(dedupeByID([...prev, sysMsg])))
  }, [])

  const handleMemberAdded = useCallback((payload: unknown) => {
    const data = payload as {
      chat_id?: string
      user_id?: string
      user_name?: string
      by?: string
      member_name?: string
    }
    if (!data || data.chat_id !== activeChatIdRef.current) return
    const sysMsg: ChatMessage = {
      id: `sys-joined-${data.user_id}-${Date.now()}`,
      chat_id: data.chat_id!,
      sender_id: data.user_id || '',
      content: `member_joined|${data.user_id || ''}`,
      type: 'member_joined',
      message_category: 'system',
      is_anonymized: false,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => sortByCreatedAt(dedupeByID([...prev, sysMsg])))
  }, [])

  const handleAdminTransferred = useCallback((payload: unknown) => {
    const data = payload as { chat_id?: string; target_user_id?: string; by?: string }
    if (!data || data.chat_id !== activeChatIdRef.current) return
    const sysMsg: ChatMessage = {
      id: `sys-admin-${data.target_user_id}-${Date.now()}`,
      chat_id: data.chat_id!,
      sender_id: data.target_user_id || '',
      content: `admin_transferred|${data.target_user_id || ''}`,
      type: 'admin_transferred',
      message_category: 'system',
      is_anonymized: false,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => sortByCreatedAt(dedupeByID([...prev, sysMsg])))
  }, [])

  const handleSettingsUpdated = useCallback((payload: unknown) => {
    const data = payload as {
      chat_id?: string
      name?: string
      avatar_uri?: string
      by?: string
      actor_name?: string
      detail?: string
      text?: string
    }
    if (!data || data.chat_id !== activeChatIdRef.current) return
    let content = ''
    if (data.detail === 'name_changed') {
      content = `group_name_changed|${data.by || ''}|${data.name || ''}`
    } else if (data.detail === 'avatar_changed') {
      content = `group_avatar_changed|${data.by || ''}`
    }
    const sysMsg: ChatMessage = {
      id: `sys-settings-${Date.now()}`,
      chat_id: data.chat_id!,
      sender_id: data.by || '',
      content,
      type: data.detail === 'name_changed' ? 'group_name_changed' : 'group_avatar_changed',
      message_category: 'system',
      is_anonymized: false,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => sortByCreatedAt(dedupeByID([...prev, sysMsg])))
  }, [])

  useEffect(() => {
    const unsubs = [
      socketSubscribe('group:history', handleHistory),
      socketSubscribe('group:message:new', handleNewMessage),
      socketSubscribe('group:typing', handleTyping),
      socketSubscribe('group:message:search_result', handleSearchResult),
      socketSubscribe('group:message:deleted', handleDeleted),
      socketSubscribe('group:message:pinned_list', handlePinnedList),
      socketSubscribe('group:message:pinned', handlePinned),
      socketSubscribe('group:message:unpinned', handleUnpinned),
      socketSubscribe('group:member:left', handleMemberLeft),
      socketSubscribe('group:member:added', handleMemberAdded),
      socketSubscribe('group:admin:transferred', handleAdminTransferred),
      socketSubscribe('group:settings:updated', handleSettingsUpdated),
      socketSubscribe('error', handleError),
    ]
    return () => unsubs.forEach((u) => u())
  }, [
    socketSubscribe,
    handleHistory,
    handleNewMessage,
    handleTyping,
    handleSearchResult,
    handleDeleted,
    handlePinnedList,
    handlePinned,
    handleUnpinned,
    handleMemberLeft,
    handleMemberAdded,
    handleAdminTransferred,
    handleSettingsUpdated,
    handleError,
  ])

  // Reset when switching chats
  const [prevChatId, setPrevChatId] = useState<string | null>(chatId)
  if (prevChatId !== chatId) {
    setPrevChatId(chatId)
    setMessages([])
    setTypingUsers(new Set())
    setSearchResults(null)
    setSearchKeyword('')
    setPinnedMessages([])
    setCallHistory([])
  }

  // Join group chat when opened, socket reconnects
  useEffect(() => {
    activeChatIdRef.current = chatId
    pendingIdsRef.current = []
    if (chatId && socketStatus === 'open') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true)
      socketSend('group:join', { chat_id: chatId })
    }
  }, [chatId, socketStatus, socketSend])

  const sendMessage = useCallback(
    (content: string, opts?: SendMessageOptions) => {
      const chatID = activeChatIdRef.current
      const trimmed = content.trim()
      const hasAttachment = Boolean(opts?.emojiId || opts?.mediaId || opts?.gifUrl)
      if (!chatID || (!trimmed && !hasAttachment)) return
      if (socket.status !== 'open') {
        toast({ type: 'error', title: 'Không thể gửi tin nhắn. Đang kết nối lại...' })
        return
      }

      const tempID = `temp-${++pendingSeqRef.current}`
      pendingIdsRef.current.push(tempID)
      setMessages((prev) =>
        sortByCreatedAt([
          ...prev,
          {
            id: tempID,
            chat_id: chatID,
            sender_id: myUserIdRef.current,
            content: trimmed,
            emoji_id: opts?.emojiId ?? null,
            media_id: opts?.mediaId ?? null,
            media_group_id: opts?.mediaGroupId ?? null,
            media_uri: opts?.mediaUri ?? null,
            media_type: opts?.mediaType ?? null,
            is_anonymized: false,
            created_at: new Date().toISOString(),
          },
        ]),
      )

      // Group chat uses server-side AES encryption, no E2E
      socket.send('group:message:send', {
        chat_id: chatID,
        content: trimmed,
        emoji_id: opts?.emojiId ?? null,
        media_id: opts?.mediaId ?? null,
        media_group_id: opts?.mediaGroupId ?? null,
        gif_url: opts?.gifUrl ?? null,
        shared_post_id: opts?.sharedPostId ?? null,
        reply_to_message_id: opts?.replyToMessageId ?? null,
      })
    },
    [socket, toast],
  )

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const chatID = activeChatIdRef.current
      if (!chatID || socket.status !== 'open') return
      socket.send(isTyping ? 'group:typing:start' : 'group:typing:stop', { chat_id: chatID })
    },
    [socket],
  )

  const searchMessages = useCallback(
    (keyword: string) => {
      const chatID = activeChatIdRef.current
      if (!chatID || socket.status !== 'open') return
      const trimmed = keyword.trim()
      if (!trimmed) {
        setSearchResults(null)
        setSearchKeyword('')
        return
      }
      // Group chat: server decrypts and searches
      socket.send('group:message:search', { chat_id: chatID, keyword: trimmed })
    },
    [socket],
  )

  const clearSearch = useCallback(() => {
    setSearchResults(null)
    setSearchKeyword('')
  }, [])

  const deleteMessage = useCallback(
    (messageId: string, mode: 'all' | 'me') => {
      const chatID = activeChatIdRef.current
      if (!chatID || socket.status !== 'open') return
      socket.send('group:message:delete', { chat_id: chatID, message_id: messageId, mode })
    },
    [socket],
  )

  const pinMessage = useCallback(
    (messageId: string) => {
      const chatID = activeChatIdRef.current
      if (!chatID || socket.status !== 'open') return
      socket.send('group:message:pin', { chat_id: chatID, message_id: messageId })
    },
    [socket],
  )

  const unpinMessage = useCallback(
    (messageId: string) => {
      const chatID = activeChatIdRef.current
      if (!chatID || socket.status !== 'open') return
      socket.send('group:message:unpin', { chat_id: chatID, message_id: messageId })
    },
    [socket],
  )

  return {
    messages,
    loading,
    hasMore: false,
    loadingMore: false,
    typingUsers,
    partnerTyping: false,
    searchResults,
    searchKeyword,
    pinnedMessages,
    clearSearch,
    sendMessage,
    sendTyping,
    deleteMessage,
    searchMessages,
    pinMessage,
    unpinMessage,
    loadMoreMessages: () => {},
    callHistory,
  }
}
