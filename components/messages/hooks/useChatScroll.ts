'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../../../types'

export interface UseChatScrollOptions {
  messagesLength: number
  callHistoryLength: number
  searchResults: ChatMessage[] | null
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  loadMoreMessages: () => void
}

export interface UseChatScrollReturn {
  scrollRef: React.RefObject<HTMLDivElement | null>
  timelineRef: React.RefObject<HTMLDivElement | null>
  newMessagesCount: number
  scrollToBottom: () => void
  scrollToMessage: (messageId: string) => void
  highlightedMsgId: string | null
  setHighlightedMsgId: (id: string | null) => void
  handleMessagesScroll: () => void
}

export function useChatScroll({
  messagesLength,
  callHistoryLength,
  searchResults,
  loading,
  loadingMore,
  hasMore,
  loadMoreMessages,
}: UseChatScrollOptions): UseChatScrollReturn {
  const scrollRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const pinToBottomRef = useRef(true)
  const prevTimelineLenRef = useRef(0)
  const programmaticScrollRef = useRef(false)

  const [newMessagesCount, setNewMessagesCount] = useState(0)
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null)

  const scrollToBottom = useCallback(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    programmaticScrollRef.current = true
    scroller.scrollTop = scroller.scrollHeight
  }, [])

  useEffect(() => {
    const el = timelineRef.current
    if (!el) return

    const totalLen = messagesLength + callHistoryLength
    if (totalLen !== prevTimelineLenRef.current && searchResults === null) {
      if (pinToBottomRef.current) {
        scrollToBottom()
      } else {
        setNewMessagesCount((prev) => prev + (totalLen - prevTimelineLenRef.current))
      }
    }
    prevTimelineLenRef.current = totalLen

    const observer = new ResizeObserver(() => {
      if (pinToBottomRef.current && searchResults === null) {
        scrollToBottom()
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [messagesLength, callHistoryLength, searchResults, scrollToBottom])

  const handleMessagesScroll = useCallback(() => {
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
    scrollToBottom,
    scrollToMessage,
    highlightedMsgId,
    setHighlightedMsgId,
    handleMessagesScroll,
  }
}
