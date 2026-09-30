'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import ExternalImage from '../ExternalImage'
import { isGiphyUrl, giphyStillUrl, separateGiphyUrls } from '../../utils/giphy'
import { isEmojifyiUrl } from '../../utils/emojifyi'
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
  // Nội dung cũ có thể dính nhiều URL GIPHY (`url1url2`) → tách trước khi split.
  const parts = separateGiphyUrls(content).split(EMOJI_RE)
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
    // Trong text thường, URL ảnh emoji (GIPHY cũ / emojifyi mới) render thành ảnh inline.
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
      } else if (j % 2 === 1 && isEmojifyiUrl(seg)) {
        out.push(
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${key}-e${j}`}
            src={seg}
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

const POST_TOKEN_RE = /(:[a-z0-9+_-]+:)|((?<![\p{L}\p{N}])#[\p{L}\p{N}_]+)/giu

export function renderPostContent(
  content: string,
  map: Map<string, EmojiItem>,
  keyPrefix: string,
  emojiClassName = '',
  hashtagClassName = '',
): ReactNode[] {
  const parts = content.split(POST_TOKEN_RE)
  return parts.map((part, i) => {
    if (!part) return null
    const key = `${keyPrefix}-${i}`
    if (part.startsWith(':') && part.endsWith(':')) {
      const emoji = map.get(part)
      if (emoji) return <EmojiImage key={key} emoji={emoji} className={emojiClassName} />
      return part
    }
    if (part.startsWith('#') && part.length > 1) {
      return (
        <Link
          key={key}
          href={`/search?q=${encodeURIComponent(part)}`}
          className={hashtagClassName}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      )
    }
    return part
  })
}
