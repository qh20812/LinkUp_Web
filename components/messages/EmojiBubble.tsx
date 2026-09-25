'use client'

import { useTranslation } from '../../hooks/useTranslation'
import { giphyEmojiSrc } from '../../utils/emojis'
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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={giphyEmojiSrc(emoji)}
      alt={emoji.code}
      className={styles.emojiMsg}
      loading="lazy"
      decoding="async"
    />
  )
}
