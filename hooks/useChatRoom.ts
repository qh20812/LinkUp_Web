'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage, HistoryCursor, PinnedMessage } from '../types'
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
  sharedPostId?: string
  replyToMessageId?: string
}

export interface ChatRoom {
  messages: ChatMessage[]
  loading: boolean
  hasMore: boolean
  loadingMore: boolean
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

// Chuyển tin E2E còn giữ bản mã hóa sang dạng "chờ giải mã": UI hiện placeholder
// (decrypt_failed) thay vì lộ ciphertext; content vẫn giữ nguyên để retry khi
// khóa sẵn sàng giải mã lại và thay bằng bản rõ.
function markPendingDecrypt(list: ChatMessage[]): ChatMessage[] {
  return list.map((msg) => {
    if (msg.e2e_version === 1 && msg.content && !msg.deleted && !msg.decrypted) {
      return { ...msg, decrypt_failed: true }
    }
    return msg
  })
}

// Thay các tin trong prev bằng phiên bản đã giải mã (theo id), chỉ khi nội
// dung thay đổi để tránh render thừa. Bỏ qua id không nằm trong prev — an toàn
// khi user đổi hội thoại giữa chừng quá trình decode.
function mergeDecrypted(prev: ChatMessage[], chunk: ChatMessage[]): ChatMessage[] {
  if (chunk.length === 0) return prev
  const byId = new Map(prev.map((m) => [m.id, m]))
  let changed = false
  for (const m of chunk) {
    const cur = byId.get(m.id)
    if (!cur) continue
    if (
      cur.content === m.content &&
      cur.decrypt_failed === m.decrypt_failed &&
      cur.decrypted === m.decrypted
    ) {
      continue
    }
    byId.set(m.id, m)
    changed = true
  }
  return changed ? sortByCreatedAt([...byId.values()]) : prev
}

// Ghép trang tin cũ hơn vào đầu danh sách hiện tại; tin trùng id ưu tiên bản
// mới (vừa tải từ server).
function prependMessages(prev: ChatMessage[], older: ChatMessage[]): ChatMessage[] {
  if (older.length === 0) return prev
  const byId = new Map(older.map((m) => [m.id, m]))
  for (const m of prev) {
    if (!byId.has(m.id)) byId.set(m.id, m)
  }
  return sortByCreatedAt([...byId.values()])
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
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [searchResults, setSearchResults] = useState<ChatMessage[] | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])

  const activeChatIdRef = useRef<string | null>(null)
  const myUserIdRef = useRef(myUserId)
  const onNewMessageRef = useRef(onNewMessage)
  const pendingIdsRef = useRef<string[]>([])
  const pendingSeqRef = useRef(0)
  const messagesRef = useRef<ChatMessage[]>([])
  const hasMoreRef = useRef(false)
  const nextCursorRef = useRef<HistoryCursor | null>(null)
  const loadingMoreRef = useRef(false)
  const e2eReadyChatRef = useRef<string | null>(null)

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
          let updated = msg
          // Chưa giải mã (còn giữ bản mã hóa) → thử giải mã. Thất bại khi khóa
          // chưa sẵn sàng: giữ nguyên content để effect retry giải mã lại.
          if (msg.e2e_version === 1 && msg.content && !msg.deleted && !msg.decrypted) {
            try {
              const plain = await encryption.decrypt(msg.content)
              updated = { ...updated, content: plain, decrypted: true, decrypt_failed: false }
            } catch {
              return { ...updated, decrypt_failed: true }
            }
          }
          if (updated.reply_to && updated.reply_to.content && updated.e2e_version === 1) {
            const rt = updated.reply_to
            try {
              const plain = await encryption.decrypt(rt.content)
              updated = { ...updated, reply_to: { ...rt, content: plain } }
            } catch {
              updated = { ...updated, reply_to: { id: rt.id, content: '', sender_id: rt.sender_id, sender_name: rt.sender_name, sender_avatar: rt.sender_avatar } }
            }
          }
          return updated
        }),
      )
    },
    [encryption],
  )

  const handleHistory = useCallback(
    async (payload: unknown) => {
      const data = payload as {
        chat_id?: string
        messages?: ChatMessage[]
        has_more?: boolean
        next_cursor?: HistoryCursor | null
      }
      if (!data || data.chat_id !== activeChatIdRef.current) return
      setLoading(false)
      setHasMore(Boolean(data.has_more))
      hasMoreRef.current = Boolean(data.has_more)
      nextCursorRef.current = data.next_cursor ?? null

      const list = data.messages ?? []
      // Render ngay lịch sử (tin E2E hiện placeholder), rồi giải mã dần từng
      // cụm nhỏ để nội dung hiện sớm thay vì chờ cả trang.
      setMessages(sortByCreatedAt(dedupeByID(markPendingDecrypt(list))))
      const size = 10
      for (let i = 0; i < list.length; i += size) {
        const batch = list.slice(i, i + size)
        const decrypted = await decryptIncoming(batch)
        if (activeChatIdRef.current !== data.chat_id) return
        setMessages((prev) => mergeDecrypted(prev, decrypted))
      }
    },
    [decryptIncoming],
  )

  const handleHistoryMore = useCallback(
    async (payload: unknown) => {
      const data = payload as {
        chat_id?: string
        messages?: ChatMessage[]
        has_more?: boolean
        next_cursor?: HistoryCursor | null
      }
      if (!data || data.chat_id !== activeChatIdRef.current) return
      setHasMore(Boolean(data.has_more))
      hasMoreRef.current = Boolean(data.has_more)
      nextCursorRef.current = data.next_cursor ?? null
      try {
        const decrypted = await decryptIncoming(data.messages ?? [])
        if (activeChatIdRef.current !== data.chat_id) return
        setMessages((prev) => prependMessages(prev, decrypted))
      } finally {
        loadingMoreRef.current = false
        setLoadingMore(false)
      }
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
      socketSubscribe('message:history_more', handleHistoryMore),
      socketSubscribe('message:new', handleNewMessage),
      socketSubscribe('typing', handleTyping),
      socketSubscribe('message:deleted', handleDeleted),
      socketSubscribe('message:search_result', handleSearchResult),
      socketSubscribe('message:pinned_list', handlePinnedList),
      socketSubscribe('message:pinned', handlePinned),
      socketSubscribe('message:unpinned', handleUnpinned),
      socketSubscribe('error', handleError),
    ]
    return () => unsubs.forEach((u) => u())
  }, [
    socketSubscribe,
    handleHistory,
    handleHistoryMore,
    handleNewMessage,
    handleTyping,
    handleDeleted,
    handleSearchResult,
    handlePinnedList,
    handlePinned,
    handleUnpinned,
    handleError,
  ])

  // Join không còn chờ khóa E2E → lịch sử có thể đến trước khi khóa setup
  // xong, nên khi khóa trở nên sẵn sàng sẽ giải mã lại các tin còn giữ bản mã
  // hóa (đang hiển thị placeholder). Giải mã một lần cho từng hội thoại.
  useEffect(() => {
    if (!encryption || e2eStatus !== 'ready') return
    const chatID = activeChatIdRef.current
    if (e2eReadyChatRef.current === chatID) return
    e2eReadyChatRef.current = chatID
    void decryptIncoming(messagesRef.current).then((decrypted) => {
      if (activeChatIdRef.current !== chatID) return
      setMessages((prev) => mergeDecrypted(prev, decrypted))
    })
  }, [e2eStatus, encryption, decryptIncoming])

  // Reset trạng thái khi chuyển hội thoại (React: adjust state during render).
  const [prevChatId, setPrevChatId] = useState<string | null>(chatId)
  if (prevChatId !== chatId) {
    setPrevChatId(chatId)
    setMessages([])
    setPartnerTyping(false)
    setSearchResults(null)
    setSearchKeyword('')
    setPinnedMessages([])
    setHasMore(false)
    setLoadingMore(false)
  }

  // Join chat ngay khi mở hội thoại hoặc socket kết nối lại (không chờ khóa
  // E2E — lịch sử render tức thì, tin mã hóa được giải mã dần khi khóa sẵn
  // sàng). Gửi limit để server chỉ trả 30 tin gần nhất, cũ hơn tải qua
  // chat:history:more khi cuộn lên đầu.
  useEffect(() => {
    activeChatIdRef.current = chatId
    pendingIdsRef.current = []
    hasMoreRef.current = false
    nextCursorRef.current = null
    loadingMoreRef.current = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMore(false)
    setLoadingMore(false)
    if (chatId && socketStatus === 'open') {
      setLoading(true)
      socketSend('chat:join', { chat_id: chatId, limit: 30 })
    }
  }, [chatId, socketStatus, socketSend])

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
            shared_post_id: opts?.sharedPostId ?? null,
            reply_to_message_id: opts?.replyToMessageId ?? null,
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
        shared_post_id: opts?.sharedPostId ?? null,
        reply_to_message_id: opts?.replyToMessageId ?? null,
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
          (m) => !m.deleted && !m.decrypt_failed && m.content.toLowerCase().includes(needle),
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

  const pinMessage = useCallback(
    (messageId: string) => {
      const chatID = activeChatIdRef.current
      if (!chatID || socket.status !== 'open') return
      socket.send('message:pin', { chat_id: chatID, message_id: messageId })
    },
    [socket],
  )

  const unpinMessage = useCallback(
    (messageId: string) => {
      const chatID = activeChatIdRef.current
      if (!chatID || socket.status !== 'open') return
      socket.send('message:unpin', { chat_id: chatID, message_id: messageId })
    },
    [socket],
  )

  const loadMoreMessages = useCallback(() => {
    const chatID = activeChatIdRef.current
    if (!chatID || socket.status !== 'open') return
    if (loadingMoreRef.current || !hasMoreRef.current || !nextCursorRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    socketSend('chat:history:more', { chat_id: chatID, cursor: nextCursorRef.current })
  }, [socket, socketSend])

  return {
    messages,
    loading,
    hasMore,
    loadingMore,
    partnerTyping,
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
    loadMoreMessages,
  }
}
