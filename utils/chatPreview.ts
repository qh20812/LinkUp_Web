// Preview + system-text helpers shared by ConversationList (sidebar preview)
// and ChatWindow (system rows). Sidebar has no member-name map, so the actor
// name ALWAYS falls back to t('chat.unknown') — raw user ids must never leak
// into preview text (content wire format is `key|actorId|extra`).
//
// IMPORTANT: the chat-list endpoints return a TRIMMED last_message (server
// builds it from a hand-written SELECT — no `type`, no `message_category`,
// see repository/chat.repository.go + group_chat.repository.go). Detection
// below is therefore CONTENT-based (JSON sniff / `key|...` prefix) and works
// regardless of which metadata fields the payload carries.

import type { ChatMessage, GroupChatInviteContent } from '../types'

type TFn = (key: string, params?: Record<string, string>) => string

const SYSTEM_TYPES = new Set([
  'member_invited',
  'member_joined',
  'member_left',
  'admin_transferred',
  'group_settings_updated',
])

// Every `key|actorId|extra` wire key the client can translate. Mirrors
// getSystemMessageText in ChatWindow + getSystemPreviewText below.
const SYSTEM_CONTENT_KEYS = new Set([
  'member_left',
  'member_joined',
  'member_invited',
  'admin_transferred',
  'group_settings_updated',
  'group_name_changed',
  'group_avatar_changed',
  'call_started',
  'call_ended',
  'call_timeout',
])

/** First `key|...` segment of a pipe-encoded system content, or null. */
function systemContentKey(content: string): string | null {
  if (!content.includes('|')) return null
  const key = content.split('|')[0]
  return SYSTEM_CONTENT_KEYS.has(key) ? key : null
}

/**
 * True when the content is a serialized group-chat invite
 * (`{request_id, chat_id, status, ...}`) — independent of `msg.type`,
 * which list payloads do not carry.
 */
export function isInvitePreviewContent(content: string): boolean {
  if (!content) return false
  const trimmed = content.trim()
  if (!trimmed.startsWith('{')) return false
  try {
    const parsed = JSON.parse(trimmed) as Partial<GroupChatInviteContent>
    return Boolean(parsed.request_id && parsed.chat_id && parsed.status)
  } catch {
    return false
  }
}

/**
 * True for voice-note messages. List payloads carry `media_type` but no
 * dedicated voice flag — and voice content is empty, so without this check
 * E2E voice previews fall through to the encrypted placeholder.
 */
export function isVoicePreviewMessage(msg: Pick<ChatMessage, 'media_type'>): boolean {
  return msg.media_type?.startsWith('audio/') === true
}

export function isSystemPreviewMessage(
  msg: Pick<ChatMessage, 'message_category' | 'sender_id' | 'type' | 'content'>,
): boolean {
  if (
    msg.message_category === 'system' ||
    msg.sender_id === 'SYSTEM' ||
    (msg.type != null && SYSTEM_TYPES.has(msg.type))
  ) {
    return true
  }
  // List payloads lack type/category — fall back to content sniffing.
  return systemContentKey(msg.content) !== null
}

/** Translated system text with the actor resolved to "unknown" — never an id. */
export function getSystemPreviewText(content: string, t: TFn): string {
  const unknown = t('chat.unknown')
  const key = systemContentKey(content)
  if (key === null) return content
  const extra = content.split('|')[2] || ''
  switch (key) {
    case 'member_left':
      return t('chat.systemMemberLeft', { name: unknown })
    case 'member_joined':
      return t('chat.systemMemberJoined', { name: unknown })
    case 'member_invited':
      return t('chat.systemMemberInvited', { name: unknown })
    case 'admin_transferred':
      return t('chat.systemAdminTransferred', { name: unknown })
    case 'group_settings_updated':
    case 'group_name_changed':
      return t('chat.systemGroupNameChanged', { name: unknown, groupName: extra })
    case 'group_avatar_changed':
      return t('chat.systemGroupAvatarChanged', { name: unknown })
    case 'call_started':
      return t('chat.callStarted')
    case 'call_ended':
      return t('chat.callEnded', { name: unknown })
    case 'call_timeout':
      return t('chat.callTimeout')
    default:
      return content
  }
}
