'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CallHistoryItem, ChatMessage } from '../../../types'

export interface UseChatScrollOptions {
  /** Conversation key — switching chats resets the arrival tracker. */
  chatId: string | null
  messages: ChatMessage[]
  callHistory: CallHistoryItem[]
  searchResults: ChatMessage[] | null
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  myUserId: string
  loadMoreMessages: () => void
}

export interface UseChatScrollReturn {
  scrollRef: React.RefObject<HTMLDivElement | null>
  timelineRef: React.RefObject<HTMLDivElement | null>
  newMessagesCount: number
  /** True when the viewport sits (near) the newest row — drives the compact
   *  "scroll to latest" chevron when no new message is waiting. */
  atBottom: boolean
  scrollToBottom: () => void
  scrollToMessage: (messageId: string) => void
  highlightedMsgId: string | null
  setHighlightedMsgId: (id: string | null) => void
  handleMessagesScroll: () => void
}

/** Distance from the bottom edge still considered "at the bottom". */
const BOTTOM_THRESHOLD = 24

export function useChatScroll({
  chatId,
  messages,
  callHistory,
  searchResults,
  loading,
  loadingMore,
  hasMore,
  myUserId,
  loadMoreMessages,
}: UseChatScrollOptions): UseChatScrollReturn {
  const scrollRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const pinToBottomRef = useRef(true)
  const programmaticScrollRef = useRef(false)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const newestAtRef = useRef<number | null>(null)
  const trackerChatRef = useRef<string | null>(null)

  const [newMessagesCount, setNewMessagesCount] = useState(0)
  const [atBottom, setAtBottom] = useState(true)
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null)

  const scrollToBottom = useCallback(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    programmaticScrollRef.current = true
    scroller.scrollTop = scroller.scrollHeight
    // Setting scrollTop to the current position fires no scroll event — clear
    // the badge and the pin state here so both stay correct either way.
    setNewMessagesCount(0)
    setAtBottom(true)
  }, [])

  // Reset the tracker when the conversation changes: ids and the newest
  // timestamp of the previous chat must never count as arrivals in the new one.
  // State resets via adjust-during-render (never setState inside an effect);
  // the refs are reset by the counting effect below.
  const [trackedChatId, setTrackedChatId] = useState(chatId)
  if (trackedChatId !== chatId) {
    setTrackedChatId(chatId)
    setNewMessagesCount(0)
    setAtBottom(true)
  }

  // Count only genuine arrivals: rows that were absent from the previous
  // snapshot, newer than the previous newest row, and not sent by me. A
  // length-based counter used to read loaded history (scroll up) and the
  // user's own messages as "new".
  useEffect(() => {
    const chatChanged = trackerChatRef.current !== chatId
    if (chatChanged) {
      trackerChatRef.current = chatId
      seenIdsRef.current = new Set()
      newestAtRef.current = null
      pinToBottomRef.current = true
    }

    const prevNewest = newestAtRef.current
    const seen = seenIdsRef.current
    const nextSeen = new Set<string>()
    let newest = prevNewest ?? Number.NEGATIVE_INFINITY
    let arrivals = 0

    const consider = (id: string, at: number, mine: boolean) => {
      nextSeen.add(id)
      if (!Number.isFinite(at)) return
      if (at > newest) newest = at
      if (prevNewest === null || searchResults !== null) return
      if (seen.has(id) || at <= prevNewest || mine) return
      arrivals += 1
    }

    for (const msg of messages) {
      consider(msg.id, new Date(msg.created_at).getTime(), msg.sender_id === myUserId)
    }
    for (const call of callHistory) {
      consider(`call:${call.id}`, call.created_at, call.direction === 'outgoing')
    }

    seenIdsRef.current = nextSeen
    newestAtRef.current = Number.isFinite(newest) ? newest : null

    if (arrivals === 0) return
    if (pinToBottomRef.current) {
      scrollToBottom()
    } else {
      setNewMessagesCount((prev) => prev + arrivals)
    }
  }, [chatId, messages, callHistory, myUserId, searchResults, scrollToBottom])

  useEffect(() => {
    const el = timelineRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      if (pinToBottomRef.current && searchResults === null) {
        scrollToBottom()
      }
    })
    observer.observe(el)
    // Khung cuộn cũng co lại khi bàn phím ảo mở. Nếu chỉ theo dõi nội dung thì
    // scrollTop giữ nguyên trong khi vùng nhìn thấy ngắn đi → tin mới nhất bị
    // đẩy xuống dưới bàn phím. Chỉ bám đáy khi người dùng đang ở đáy.
    const scroller = scrollRef.current
    if (scroller) observer.observe(scroller)
    return () => observer.disconnect()
  }, [searchResults, scrollToBottom])

  const handleMessagesScroll = useCallback(() => {
    if (programmaticScrollRef.current) {
      programmaticScrollRef.current = false
      setNewMessagesCount(0)
      setAtBottom(true)
      return
    }
    const el = scrollRef.current
    if (!el) return
    const atBottomNow = el.scrollTop + el.clientHeight >= el.scrollHeight - BOTTOM_THRESHOLD
    pinToBottomRef.current = atBottomNow
    setAtBottom(atBottomNow)
    if (atBottomNow) setNewMessagesCount(0)
    if (!loading && !loadingMore && hasMore && el.scrollTop <= 48) {
      loadMoreMessages()
    }
  }, [loading, loadingMore, hasMore, loadMoreMessages])

  const scrollToMessage = useCallback((messageId: string) => {
    const el = timelineRef.current?.querySelector(`[data-message-id="${messageId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedMsgId(messageId)
      setTimeout(() => setHighlightedMsgId(null), 1500)
    }
  }, [])

  return {
    scrollRef,
    timelineRef,
    newMessagesCount,
    atBottom,
    scrollToBottom,
    scrollToMessage,
    highlightedMsgId,
    setHighlightedMsgId,
    handleMessagesScroll,
  }
}
