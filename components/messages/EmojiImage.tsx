'use client'

import { useState, type ReactNode } from 'react'
import ExternalImage from '../ExternalImage'
import type { EmojiItem } from '../../types'
import styles from './EmojiImage.module.css'

interface EmojiImageProps {
  emoji: EmojiItem
  className?: string
}

export function EmojiImage({ emoji, className }: EmojiImageProps) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return <span className={styles.emojiFallback}>{emoji.code}</span>
  }
  return (
    <ExternalImage
      src={emoji.image_uri}
      alt={emoji.code}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

const EMOJI_RE = /(:[a-z0-9+_-]+:)/gi

export function renderEmojiContent(
  content: string,
  map: Map<string, EmojiItem>,
  keyPrefix: string,
  emojiClassName = '',
): ReactNode[] {
  const parts = content.split(EMOJI_RE)
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`
    if (part.startsWith(':') && part.endsWith(':')) {
      const emoji = map.get(part)
      if (emoji) {
        return <EmojiImage key={key} emoji={emoji} className={emojiClassName} />
      }
    }
    return part
  })
}
