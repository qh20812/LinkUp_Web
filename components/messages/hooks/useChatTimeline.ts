'use client'

import { useMemo } from 'react'
import { groupMediaTimeline } from '../../../utils/chatMediaGroup'
import type { CallHistoryItem, ChatMessage } from '../../../types'
import type { GroupCallHistoryItem } from '../../../types/groupCall'

export interface TimelineItem {
  kind: 'message' | 'call' | 'group_call'
  msg?: ChatMessage
  item?: CallHistoryItem
  call?: GroupCallHistoryItem
  created: number
}

export type GroupedTimelineItem =
  | TimelineItem
  | { kind: 'media_group'; msgs: ChatMessage[]; created: number }

export interface UseChatTimelineOptions {
  messages: ChatMessage[]
  callHistory: CallHistoryItem[]
  groupCallHistory: GroupCallHistoryItem[]
  searchResults: ChatMessage[] | null
}

export function useChatTimeline({
  messages,
  callHistory,
  groupCallHistory,
  searchResults,
}: UseChatTimelineOptions) {
  const timeline = useMemo<TimelineItem[]>(() => {
    const msgs: TimelineItem[] = messages.map((msg) => ({
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
  }, [messages, callHistory, groupCallHistory])

  const groupedTimeline = useMemo<GroupedTimelineItem[]>(
    () => (searchResults === null ? groupMediaTimeline(timeline) : timeline.map((t) => t)),
    [timeline, searchResults],
  )

  return { timeline, groupedTimeline }
}
