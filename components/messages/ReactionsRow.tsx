'use client'

import { EmojiImage } from './EmojiImage'
import type { ChatMessage, EmojiItem } from '../../types'
import styles from './ChatWindow.module.css'

interface ReactionsRowProps {
  msg: ChatMessage
  myUserId: string
  emojis: Map<string, EmojiItem>
  onReact?: (messageId: string, emojiId: string) => void
  t: (key: string, params?: Record<string, string>) => string
}

export default function ReactionsRow({ msg, myUserId, emojis, onReact, t }: ReactionsRowProps) {
  const isBlocked = msg.deleted || msg.decrypt_failed
  const showBadge = !!msg.forwarded_from && !isBlocked

  if (isBlocked || !emojis || (!onReact && !showBadge)) return null

  const reactions = msg.reactions ?? []
  const mineReactions = reactions.filter((r) => r.user_id === myUserId)

  const chips: Array<{ emoji: EmojiItem; count: number; mine: boolean }> = []
  for (const r of reactions) {
    const item = emojis.get(r.emoji_id)
    if (!item) continue
    const existing = chips.find((c) => c.emoji.id === r.emoji_id)
    if (existing) {
      existing.count += 1
      if (r.user_id === myUserId) existing.mine = true
    } else {
      chips.push({ emoji: item, count: 1, mine: r.user_id === myUserId })
    }
  }
  // Ưu tiên emoji mình đã chọn lên đầu.
  chips.sort((a, b) => Number(b.mine) - Number(a.mine))

  const react = (emojiId: string) => {
    if (onReact) onReact(msg.id, emojiId)
  }

  const myNames = mineReactions.length
    ? reactions
        .filter((r) => r.user_id === myUserId)
        .map((r) => emojis.get(r.emoji_id)?.code || r.emoji_id)
        .join(', ')
    : t('chat.noReactionYet')

  return (
    <div className={styles.reactionsRow}>
      {showBadge && (
        <span className={styles.forwardBadge} title={t('chat.forwarded')}>
          <i className="bx bx-arrow-forward" />
          {t('chat.forwarded')}
          {msg.forwards_count && msg.forwards_count > 1 ? ` · ${msg.forwards_count}` : ''}
        </span>
      )}
      {onReact && chips.map((chip) => (
        <button
          key={chip.emoji.id}
          className={chip.mine ? `${styles.reactionChip} ${styles.reactionChipMine}` : styles.reactionChip}
          onClick={() => react(chip.emoji.id)}
          title={`${myNames}`}
        >
          <EmojiImage emoji={chip.emoji} className={styles.reactionChipEmoji} />
          <span className={styles.reactionChipCount}>{chip.count}</span>
        </button>
      ))}
    </div>
  )
}
