'use client'

import { useEffect, useState } from 'react'
import type { EmojiItem } from '../types'
import { getEmojiMap } from '../utils/emojis'

export function useEmojis(): { emojis: Map<string, EmojiItem>; loading: boolean } {
  const [emojis, setEmojis] = useState<Map<string, EmojiItem>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    getEmojiMap().then((map) => {
      if (!mounted) return
      setEmojis(map)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  return { emojis, loading }
}
