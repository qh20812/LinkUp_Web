'use client'

import type { ChatConversation, ChatMessage } from '../../types'
import styles from './ChatWindow.module.css'

interface SeenIndicatorProps {
  msg: ChatMessage
  myUserId: string
  mode?: string
  conversation?: ChatConversation | null
  memberNames?: Map<string, { display_name?: string; avatar_uri?: string }>
  t: (key: string, params?: Record<string, string>) => string
}

export default function SeenIndicator({
  msg,
  myUserId,
  mode,
  conversation,
  memberNames,
  t,
}: SeenIndicatorProps) {
  if (msg.sender_id !== myUserId || msg.deleted) return null
  const seen = msg.seen_by ?? []
  if (mode === 'group') {
    const isGroupSeen = seen.length > 0
    const names = seen
      .slice(0, 3)
      .map((id) => memberNames?.get(id)?.display_name || t('chat.unknown'))
      .join(', ')
    return (
      <span
        className={isGroupSeen ? `${styles.seenTicks} ${styles.seenOn}` : styles.seenTicks}
        title={isGroupSeen ? t('chat.seenBy', { names }) : t('chat.sent')}
      >
        {isGroupSeen ? `✓✓ ${seen.length}` : '✓'}
      </span>
    )
  }
  const isSeen = Boolean(conversation?.partner.user_id && seen.includes(conversation.partner.user_id))
  return (
    <span
      className={isSeen ? `${styles.seenTicks} ${styles.seenOn}` : styles.seenTicks}
      title={isSeen ? t('chat.seen') : t('chat.sent')}
    >
      {isSeen ? '✓✓' : '✓'}
    </span>
  )
}
