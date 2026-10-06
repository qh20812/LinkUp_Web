'use client'

import { useTranslation } from '../../hooks/useTranslation'
import { emojiChar } from '../../utils/emojis'
import type { ChatMessage, EmojiItem } from '../../types'
import styles from './ChatWindow.module.css'

interface EmojiBubbleProps {
  message: ChatMessage
  emojis: Map<string, EmojiItem>
}

export default function EmojiBubble({ message, emojis }: EmojiBubbleProps) {
  const { t } = useTranslation()
  const emoji = message.emoji_id ? emojis.get(message.emoji_id) : undefined
  if (!emoji) {
    return <span className={styles.deletedText}>{t('chat.emojiUnavailable')}</span>
  }
  return (
    <span className={styles.emojiMsg} role="img" aria-label={emoji.code}>
      {emojiChar(emoji)}
    </span>
  )
}
