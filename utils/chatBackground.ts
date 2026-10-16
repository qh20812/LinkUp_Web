import type { CSSProperties } from 'react'
import type { ChatBackground } from '../types'

/**
 * Base layer style for a conversation background (solid / gradient /
 * preset image / custom upload). Shared by the workspace backdrop layer
 * (behind the conversation list) and the ChatWindow backdrop layer so both
 * render the active conversation's theme identically.
 */
export function chatBackgroundStyle(bg: ChatBackground | null | undefined): CSSProperties {
  if (!bg) return {}
  switch (bg.type) {
    case 'solid':
      return { backgroundColor: bg.value }
    case 'gradient':
      return { backgroundImage: bg.value }
    case 'preset':
      return {
        backgroundImage: `url(/presets/chat-bg/${bg.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    case 'custom':
      return {
        backgroundImage: `url(${bg.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    default:
      return {}
  }
}
