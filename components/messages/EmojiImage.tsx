'use client'

import { useState, type ReactNode } from 'react'
import ExternalImage from '../ExternalImage'
import { isGiphyUrl, giphyStillUrl } from '../../utils/giphy'
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
const URL_RE = /(https?:\/\/[^\s]+)/gi

export function renderEmojiContent(
  content: string,
  map: Map<string, EmojiItem>,
  keyPrefix: string,
  emojiClassName = '',
): ReactNode[] {
  const parts = content.split(EMOJI_RE)
  const out: ReactNode[] = []
  parts.forEach((part, i) => {
    const key = `${keyPrefix}-${i}`
    if (part.startsWith(':') && part.endsWith(':')) {
      const emoji = map.get(part)
      if (emoji) {
        out.push(<EmojiImage key={key} emoji={emoji} className={emojiClassName} />)
        return
      }
    }
    // Trong text thường, URL GIPHY được chèn từ emoji picker render thành ảnh inline (rewrite sang bản still tĩnh).
    const segs = part.split(URL_RE)
    segs.forEach((seg, j) => {
      if (!seg) return
      if (j % 2 === 1 && isGiphyUrl(seg)) {
        out.push(
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${key}-g${j}`}
            src={giphyStillUrl(seg)}
            alt="emoji"
            className={emojiClassName || styles.inlineGiphy}
            loading="lazy"
            decoding="async"
          />,
        )
      } else {
        out.push(seg)
      }
    })
  })
  return out
}
