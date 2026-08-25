'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'
import type { ChatSocket } from './useChatSocket'
import type { ChatE2E } from './useChatE2E'
import { useToast } from '../contexts/ToastContext'

interface UseChatRoomOptions {
  chatId: string | null
  myUserId: string
  socket: ChatSocket
  encryption?: ChatE2E
  onNewMessage?: (message: ChatMessage) => void
}

export interface SendMessageOptions {
  emojiId?: string
  mediaId?: string
  mediaUri?: string
  mediaType?: string
  gifUrl?: string
}

export interface ChatRoom {
  messages: ChatMessage[]
  loading: boolean
  partnerTyping: boolean
  searchResults: ChatMessage[] | null
  searchKeyword: string
  clearSearch: () => void
  sendMessage: (content: string, opts?: SendMessageOptions) => void
  sendTyping: (isTyping: boolean) => void
  deleteMessage: (messageId: string, mode: 'all' | 'me') => void
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
  encryption,
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
  const messagesRef = useRef<ChatMessage[]>([])

  const socketSubscribe = socket.subscribe
  const socketStatus = socket.status
  const socketSend = socket.send
  const e2eStatus = encryption?.status ?? 'unavailable'

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    myUserIdRef.current = myUserId
  }, [myUserId])

  useEffect(() => {
    onNewMessageRef.current = onNewMessage
  }, [onNewMessage])

  const decryptIncoming = useCallback(
    async (list: ChatMessage[]): Promise<ChatMessage[]> => {
      if (!encryption) return list
      return Promise.all(
        list.map(async (msg) => {
          if (msg.e2e_version === 1 && msg.content && !msg.deleted) {
            try {
              const plain = await encryption.decrypt(msg.content)
              return { ...msg, content: plain }
            } catch {
              return { ...msg, content: '', decrypt_failed: true }
            }
          }
          return msg
        }),
      )
    },
    [encryption],
  )

  const handleHistory = useCallback(
    async (payload: unknown) => {
      const data = payload as { chat_id?: string; messages?: ChatMessage[] }
      if (!data || data.chat_id !== activeChatIdRef.current) return
      setLoading(false)
      const decrypted = await decryptIncoming(data.messages ?? [])
      setMessages(sortByCreatedAt(dedupeByID(decrypted)))
    },
    [decryptIncoming],
  )

  const handleNewMessage = useCallback(
    async (payload: unknown) => {
      const msg = payload as ChatMessage
      if (!msg || !msg.id || !msg.chat_id) return
      if (msg.chat_id === activeChatIdRef.current) {
        const resolved = (await decryptIncoming([msg]))[0]
        const pending = pendingIdsRef.current
        if (pending.length > 0 && resolved.sender_id === myUserIdRef.current) {
          const tempID = pending[0]
          pendingIdsRef.current = pending.slice(1)
          setMessages((prev) =>
            sortByCreatedAt(
              dedupeByID([...prev.filter((m) => m.id !== tempID), resolved]),
            ),
          )
        } else {
          setMessages((prev) => sortByCreatedAt(dedupeByID([...prev, resolved])))
        }
      }
      onNewMessageRef.current?.(msg)
    },
    [decryptIncoming],
  )

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
    const pending = pendingIdsRef.current
    if (pending.length > 0) {
      const tempID = pending[pending.length - 1]
      pendingIdsRef.current = pending.slice(0, -1)
      setMessages((prev) => prev.filter((m) => m.id !== tempID))
    }
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

  // Join chat khi mở hội thoại, socket kết nối lại, hoặc khóa E2E sẵn sàng
  // (chờ E2E xong trước khi nhận history để có thể giải mã ngay). Không join
  // khi E2E đang loading để tránh nhận lịch sử trước khi có khóa.
  useEffect(() => {
    activeChatIdRef.current = chatId
    pendingIdsRef.current = []
    const e2eResolved = !encryption || e2eStatus === 'ready' || e2eStatus === 'legacy'
    if (chatId && socketStatus === 'open' && e2eResolved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true)
      socketSend('chat:join', { chat_id: chatId })
    }
  }, [chatId, socketStatus, socketSend, e2eStatus, encryption])

  const sendMessage = useCallback(
    async (content: string, opts?: SendMessageOptions) => {
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

      if (encryption?.ready && trimmed) {
        try {
          const cipher = await encryption.encrypt(trimmed)
          socket.send('message:send', {
            chat_id: chatID,
            content: cipher,
            e2e_version: 1,
            emoji_id: opts?.emojiId ?? null,
            media_id: opts?.mediaId ?? null,
            gif_url: opts?.gifUrl ?? null,
          })
          return
        } catch {
          toast({ type: 'error', title: 'Mã hóa tin nhắn thất bại' })
          return
        }
      }
      socket.send('message:send', {
        chat_id: chatID,
        content: trimmed,
        emoji_id: opts?.emojiId ?? null,
        media_id: opts?.mediaId ?? null,
        gif_url: opts?.gifUrl ?? null,
      })
    },
    [socket, toast, encryption],
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
    (messageId: string, mode: 'all' | 'me') => {
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

      // Chat E2E: server không đọc được nội dung → tìm kiếm client-side trên
      // danh sách tin nhắn đã giải mã ở máy.
      if (encryption?.ready) {
        const needle = trimmed.toLowerCase()
        const results = messagesRef.current.filter(
          (m) => !m.deleted && m.content.toLowerCase().includes(needle),
        )
        setSearchKeyword(trimmed)
        setSearchResults(sortByCreatedAt(results))
        return
      }

      socket.send('message:search', { chat_id: chatID, keyword: trimmed })
    },
    [socket, encryption],
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
