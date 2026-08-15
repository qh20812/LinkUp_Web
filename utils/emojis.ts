import { getEmojis } from '../api/posts'
import type { EmojiItem } from '../types'

let cache: Map<string, EmojiItem> | null = null
let inflight: Promise<Map<string, EmojiItem>> | null = null

export function getEmojiMap(): Promise<Map<string, EmojiItem>> {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = getEmojis()
      .then((res) => {
        const map = new Map<string, EmojiItem>()
        for (const e of res.data) map.set(e.id, e)
        cache = map
        return map
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}
