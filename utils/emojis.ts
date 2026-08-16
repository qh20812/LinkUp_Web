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

// ===== Bộ biểu cảm khuôn mặt (client-side, dùng cho picker chat) =====

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
  { code: ':grinning:', emoji: '\u{1F600}', label: 'Grinning face', group: 'positive' },
  { code: ':smile:', emoji: '\u{1F604}', label: 'Smile', group: 'positive' },
  { code: ':laughing:', emoji: '\u{1F606}', label: 'Laughing', group: 'positive' },
  { code: ':joy:', emoji: '\u{1F602}', label: 'Joy', group: 'positive' },
  { code: ':heart_eyes:', emoji: '\u{1F60D}', label: 'Heart eyes', group: 'positive' },
  { code: ':kiss:', emoji: '\u{1F618}', label: 'Kiss', group: 'positive' },
  { code: ':blush:', emoji: '\u{1F60A}', label: 'Blush', group: 'positive' },
  { code: ':wink:', emoji: '\u{1F609}', label: 'Wink', group: 'positive' },
  { code: ':cool:', emoji: '\u{1F60E}', label: 'Cool', group: 'positive' },
  { code: ':smirk:', emoji: '\u{1F60F}', label: 'Smirk', group: 'positive' },
  { code: ':relieved:', emoji: '\u{1F60C}', label: 'Relieved', group: 'positive' },
  { code: ':hug:', emoji: '\u{1F917}', label: 'Hug', group: 'positive' },
  { code: ':star_eyes:', emoji: '\u{1F929}', label: 'Star eyes', group: 'positive' },
  { code: ':partying:', emoji: '\u{1F973}', label: 'Partying', group: 'positive' },
  { code: ':thumbsup:', emoji: '\u{1F44D}', label: 'Thumbs up', group: 'positive' },
  { code: ':clap:', emoji: '\u{1F44F}', label: 'Clap', group: 'positive' },
  { code: ':fire:', emoji: '\u{1F525}', label: 'Fire', group: 'positive' },
  { code: ':heart:', emoji: '\u2764', label: 'Heart', group: 'positive' },
  { code: ':love:', emoji: '\u{1F496}', label: 'Sparkling heart', group: 'positive' },
  // Trung tính
  { code: ':thinking:', emoji: '\u{1F914}', label: 'Thinking', group: 'neutral' },
  { code: ':neutral:', emoji: '\u{1F610}', label: 'Neutral face', group: 'neutral' },
  { code: ':expressionless:', emoji: '\u{1F611}', label: 'Expressionless', group: 'neutral' },
  { code: ':hmm:', emoji: '\u{1F9D0}', label: 'Monocle', group: 'neutral' },
  { code: ':shrug:', emoji: '\u{1F937}', label: 'Shrug', group: 'neutral' },
  { code: ':sleepy:', emoji: '\u{1F62A}', label: 'Sleepy', group: 'neutral' },
  { code: ':yawning:', emoji: '\u{1F971}', label: 'Yawning', group: 'neutral' },
  { code: ':tired:', emoji: '\u{1F62B}', label: 'Tired face', group: 'neutral' },
  // Tiêu cực
  { code: ':sad:', emoji: '\u{1F622}', label: 'Sad', group: 'negative' },
  { code: ':cry:', emoji: '\u{1F62D}', label: 'Crying', group: 'negative' },
  { code: ':angry:', emoji: '\u{1F621}', label: 'Angry', group: 'negative' },
  { code: ':rage:', emoji: '\u{1F620}', label: 'Rage', group: 'negative' },
  { code: ':wow:', emoji: '\u{1F62E}', label: 'Wow', group: 'negative' },
  { code: ':fear:', emoji: '\u{1F631}', label: 'Screaming', group: 'negative' },
  { code: ':disappointed:', emoji: '\u{1F61E}', label: 'Disappointed', group: 'negative' },
  { code: ':worried:', emoji: '\u{1F61F}', label: 'Worried', group: 'negative' },
  { code: ':confused:', emoji: '\u{1F615}', label: 'Confused', group: 'negative' },
  { code: ':sick:', emoji: '\u{1F922}', label: 'Sick', group: 'negative' },
]

function twemojiUrl(emoji: string): string {
  const cps = [...emoji]
    .map((ch) => ch.codePointAt(0)!.toString(16))
    .filter((cp) => cp !== 'fe0f')
    .join('-')
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/${cps}.png`
}

export type EmotionEmojiItem = EmojiItem & { group: EmojiGroup; label: string }

export function getEmotionEmojis(): EmotionEmojiItem[] {
  return EMOTION_EMOJIS.map((e) => ({
    id: `emotion-${e.code.slice(1, -1)}`,
    code: e.code,
    image_uri: twemojiUrl(e.emoji),
    group: e.group,
    label: e.label,
  }))
}

export function emojiByCode(items: Iterable<EmojiItem>): Map<string, EmojiItem> {
  const map = new Map<string, EmojiItem>()
  for (const e of items) map.set(e.code, e)
  return map
}
