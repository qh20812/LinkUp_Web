'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'
import type { ChatSocket } from './useChatSocket'
import { useToast } from '../contexts/ToastContext'

interface UseChatRoomOptions {
  chatId: string | null
  myUserId: string
  socket: ChatSocket
  onNewMessage?: (message: ChatMessage) => void
}

export interface ChatRoom {
  messages: ChatMessage[]
  loading: boolean
  partnerTyping: boolean
  searchResults: ChatMessage[] | null
  searchKeyword: string
  clearSearch: () => void
  sendMessage: (content: string) => void
  sendTyping: (isTyping: boolean) => void
  deleteMessage: (messageId: string, mode: 'all' | 'one') => void
  searchMessages: (keyword: string) => void
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

export function useChatRoom({
  chatId,
  myUserId,
  socket,
  onNewMessage,
}: UseChatRoomOptions): ChatRoom {
  const { toast } = useToast()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [searchResults, setSearchResults] = useState<ChatMessage[] | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')

  const activeChatIdRef = useRef<string | null>(null)
  const myUserIdRef = useRef(myUserId)
  const onNewMessageRef = useRef(onNewMessage)
  const pendingIdsRef = useRef<string[]>([])
  const pendingSeqRef = useRef(0)

  const socketSubscribe = socket.subscribe
  const socketStatus = socket.status
  const socketSend = socket.send

  useEffect(() => {
    myUserIdRef.current = myUserId
  }, [myUserId])

  useEffect(() => {
    onNewMessageRef.current = onNewMessage
  }, [onNewMessage])

  const handleHistory = useCallback((payload: unknown) => {
    const data = payload as { chat_id?: string; messages?: ChatMessage[] }
    if (!data || data.chat_id !== activeChatIdRef.current) return
    setLoading(false)
    setMessages(sortByCreatedAt(dedupeByID(data.messages ?? [])))
  }, [])

  const handleNewMessage = useCallback((payload: unknown) => {
    const msg = payload as ChatMessage
    if (!msg || !msg.id || !msg.chat_id) return
    if (msg.chat_id === activeChatIdRef.current) {
      const pending = pendingIdsRef.current
      if (pending.length > 0 && msg.sender_id === myUserIdRef.current) {
        pendingIdsRef.current = pending.slice(1)
      }
      setMessages((prev) => sortByCreatedAt(dedupeByID([...prev, msg])))
    }
    onNewMessageRef.current?.(msg)
  }, [])

  const handleTyping = useCallback((payload: unknown) => {
    const data = payload as { chat_id?: string; user_id?: string; is_typing?: boolean }
    if (!data || data.chat_id !== activeChatIdRef.current) return
    if (data.user_id === myUserIdRef.current) return
    setPartnerTyping(Boolean(data.is_typing))
  }, [])

  const handleDeleted = useCallback((payload: unknown) => {
    const data = payload as {
      chat_id?: string
      message_id?: string
      deleted_by?: string
      mode?: string
    }
    if (!data || data.chat_id !== activeChatIdRef.current || !data.message_id) return
    setMessages((prev) => prev.filter((m) => m.id !== data.message_id))
    setSearchResults((prev) =>
      prev ? prev.filter((m) => m.id !== data.message_id) : prev,
    )
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
      socketSubscribe('message:history', handleHistory),
      socketSubscribe('message:new', handleNewMessage),
      socketSubscribe('typing', handleTyping),
      socketSubscribe('message:deleted', handleDeleted),
      socketSubscribe('message:search_result', handleSearchResult),
      socketSubscribe('error', handleError),
    ]
    return () => unsubs.forEach((u) => u())
  }, [
    socketSubscribe,
    handleHistory,
    handleNewMessage,
    handleTyping,
    handleDeleted,
    handleSearchResult,
    handleError,
  ])

  // Reset trạng thái khi chuyển hội thoại (React: adjust state during render).
  const [prevChatId, setPrevChatId] = useState<string | null>(chatId)
  if (prevChatId !== chatId) {
    setPrevChatId(chatId)
    setMessages([])
    setPartnerTyping(false)
    setSearchResults(null)
    setSearchKeyword('')
  }

  // Join chat khi mở hội thoại hoặc khi socket kết nối lại.
  useEffect(() => {
    activeChatIdRef.current = chatId
    pendingIdsRef.current = []
    if (chatId && socketStatus === 'open') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true)
      socketSend('chat:join', { chat_id: chatId })
    }
  }, [chatId, socketStatus, socketSend])

  const sendMessage = useCallback(
    (content: string) => {
      const chatID = activeChatIdRef.current
      const trimmed = content.trim()
      if (!chatID || !trimmed) return
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
            is_anonymized: false,
            created_at: new Date().toISOString(),
          },
        ]),
      )
      socket.send('message:send', { chat_id: chatID, content: trimmed })
    },
    [socket, toast],
  )

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const chatID = activeChatIdRef.current
      if (!chatID || socket.status !== 'open') return
      socket.send(isTyping ? 'typing:start' : 'typing:stop', { chat_id: chatID })
    },
    [socket],
  )

  const deleteMessage = useCallback(
    (messageId: string, mode: 'all' | 'one') => {
      const chatID = activeChatIdRef.current
      if (!chatID || socket.status !== 'open') return
      socket.send('message:delete', { chat_id: chatID, message_id: messageId, mode })
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
      socket.send('message:search', { chat_id: chatID, keyword: trimmed })
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
    partnerTyping,
    searchResults,
    searchKeyword,
    clearSearch,
    sendMessage,
    sendTyping,
    deleteMessage,
    searchMessages,
  }
}
