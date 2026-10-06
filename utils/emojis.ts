import { getReactionEmojis } from '../api/posts'
import type { EmojiItem } from '../types'

let cache: Map<string, EmojiItem> | null = null
let inflight: Promise<Map<string, EmojiItem>> | null = null

/** Map emoji reaction của server (scope=reactions, 10 dòng) — nguồn cho chips/toolbars. */
export function getEmojiMap(): Promise<Map<string, EmojiItem>> {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = getReactionEmojis()
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

/** Ký tự render cho 1 EmojiItem: ưu tiên character native, rồi image_uri cũ, cuối là code. */
export function emojiChar(item: EmojiItem): string {
  if (item.character) return item.character
  const legacy = charForCode(item.code)
  if (legacy) return legacy
  return item.code
}

// ===== Fallback cho token :code: cũ trong nội dung đã lưu =====
// Nội dung cũ có thể chứa code client (vd :smile:) không còn trong bảng server.
// Map ký tự unicode cứng (không CDN) để render, không dùng cho picker mới.

export type EmojiGroup = 'positive' | 'neutral' | 'negative'

export const EMOTION_GROUPS: EmojiGroup[] = ['positive', 'neutral', 'negative']

export interface EmotionEmoji {
  code: string
  emoji: string
  label: string
  group: EmojiGroup
}

export const EMOTION_EMOJIS: EmotionEmoji[] = [
  // Tích cực
  { code: ':grinning:', emoji: '😀', label: 'Grinning face', group: 'positive' },
  { code: ':smile:', emoji: '😄', label: 'Smile', group: 'positive' },
  { code: ':laughing:', emoji: '😆', label: 'Laughing', group: 'positive' },
  { code: ':joy:', emoji: '😂', label: 'Joy', group: 'positive' },
  { code: ':heart_eyes:', emoji: '😍', label: 'Heart eyes', group: 'positive' },
  { code: ':kiss:', emoji: '😘', label: 'Kiss', group: 'positive' },
  { code: ':blush:', emoji: '😊', label: 'Blush', group: 'positive' },
  { code: ':wink:', emoji: '😉', label: 'Wink', group: 'positive' },
  { code: ':cool:', emoji: '😎', label: 'Cool', group: 'positive' },
  { code: ':smirk:', emoji: '😏', label: 'Smirk', group: 'positive' },
  { code: ':relieved:', emoji: '😌', label: 'Relieved', group: 'positive' },
  { code: ':hug:', emoji: '🤗', label: 'Hug', group: 'positive' },
  { code: ':star_eyes:', emoji: '🤩', label: 'Star eyes', group: 'positive' },
  { code: ':partying:', emoji: '🥳', label: 'Partying', group: 'positive' },
  { code: ':thumbsup:', emoji: '👍', label: 'Thumbs up', group: 'positive' },
  { code: ':clap:', emoji: '👏', label: 'Clap', group: 'positive' },
  { code: ':fire:', emoji: '🔥', label: 'Fire', group: 'positive' },
  { code: ':heart:', emoji: '❤', label: 'Heart', group: 'positive' },
  { code: ':love:', emoji: '💖', label: 'Sparkling heart', group: 'positive' },
  // Trung tính
  { code: ':thinking:', emoji: '🤔', label: 'Thinking', group: 'neutral' },
  { code: ':neutral:', emoji: '😐', label: 'Neutral face', group: 'neutral' },
  { code: ':expressionless:', emoji: '😑', label: 'Expressionless', group: 'neutral' },
  { code: ':hmm:', emoji: '🧐', label: 'Monocle', group: 'neutral' },
  { code: ':shrug:', emoji: '🤷', label: 'Shrug', group: 'neutral' },
  { code: ':sleepy:', emoji: '😪', label: 'Sleepy', group: 'neutral' },
  { code: ':yawning:', emoji: '🥱', label: 'Yawning', group: 'neutral' },
  { code: ':tired:', emoji: '😫', label: 'Tired face', group: 'neutral' },
  // Tiêu cực
  { code: ':sad:', emoji: '😢', label: 'Sad', group: 'negative' },
  { code: ':cry:', emoji: '😭', label: 'Crying', group: 'negative' },
  { code: ':angry:', emoji: '😡', label: 'Angry', group: 'negative' },
  { code: ':rage:', emoji: '😤', label: 'Rage', group: 'negative' },
  { code: ':wow:', emoji: '😮', label: 'Wow', group: 'negative' },
  { code: ':fear:', emoji: '😱', label: 'Screaming', group: 'negative' },
  { code: ':disappointed:', emoji: '😞', label: 'Disappointed', group: 'negative' },
  { code: ':worried:', emoji: '😟', label: 'Worried', group: 'negative' },
  { code: ':confused:', emoji: '😕', label: 'Confused', group: 'negative' },
  { code: ':sick:', emoji: '🤢', label: 'Sick', group: 'negative' },
]

// Code của backend seed cũ không có trong EMOTION_EMOJIS.
const EXTRA_CODE_TO_CHAR: Record<string, string> = {
  ':like:': '👍',
  ':haha:': '😂',
  ':rocket:': '🚀',
}

function charForCode(code: string): string | null {
  const extra = EXTRA_CODE_TO_CHAR[code]
  if (extra) return extra
  return EMOTION_EMOJIS.find((e) => e.code === code)?.emoji ?? null
}

export type EmotionEmojiItem = EmojiItem & { group: EmojiGroup; label: string }

/** @deprecated Chỉ dùng fallback render token :code: cũ. Picker mới lấy từ server. */
export function getEmotionEmojis(): EmotionEmojiItem[] {
  return EMOTION_EMOJIS.map((e) => ({
    id: `emotion-${e.code.slice(1, -1)}`,
    code: e.code,
    image_uri: '',
    character: e.emoji,
    name: e.label,
    keywords: '',
    category: e.group,
    sort_order: 0,
    is_reaction: false,
    group: e.group,
    label: e.label,
  }))
}

export function emojiByCode(items: Iterable<EmojiItem>): Map<string, EmojiItem> {
  const map = new Map<string, EmojiItem>()
  for (const e of items) map.set(e.code, e)
  return map
}

/** Map code -> ký tự native cho token :code: cũ (sync, không gọi API). */
export function legacyCodeCharMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const e of EMOTION_EMOJIS) map.set(e.code, e.emoji)
  for (const [code, ch] of Object.entries(EXTRA_CODE_TO_CHAR)) map.set(code, ch)
  return map
}
