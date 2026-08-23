'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'
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
  gifUrl?: string
}

export interface GroupChatRoom {
  messages: ChatMessage[]
  loading: boolean
  typingUsers: Set<string>
  partnerTyping: boolean
  searchResults: ChatMessage[] | null
  searchKeyword: string
  clearSearch: () => void
  sendMessage: (content: string, opts?: SendMessageOptions) => void
  sendTyping: (isTyping: boolean) => void
  deleteMessage: (messageId: string, mode: 'all' | 'me') => void
  searchMessages: (keyword: string) => void
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

  const handleError = useCallback((payload: unknown) => {
    const data = payload as { message?: string }
    if (!data || !data.message) return
    toast({ type: 'error', title: data.message })
  }, [toast])

  useEffect(() => {
    const unsubs = [
      socketSubscribe('group:history', handleHistory),
      socketSubscribe('group:message:new', handleNewMessage),
      socketSubscribe('group:typing', handleTyping),
      socketSubscribe('group:message:search_result', handleSearchResult),
      socketSubscribe('error', handleError),
    ]
    return () => unsubs.forEach((u) => u())
  }, [
    socketSubscribe,
    handleHistory,
    handleNewMessage,
    handleTyping,
    handleSearchResult,
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

  return {
    messages,
    loading,
    typingUsers,
    partnerTyping: false,
    searchResults,
    searchKeyword,
    clearSearch,
    sendMessage,
    sendTyping,
    deleteMessage: () => {},
    searchMessages,
    callHistory,
  }
}
