import { getSystemPreviewText, isInvitePreviewContent, isSystemPreviewMessage } from '../utils/chatPreview'

// Minimal t() stub: returns the key with interpolated params rendered inline.
const t = (key: string, params?: Record<string, string>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key

describe('isSystemPreviewMessage', () => {
  it('detects system category, SYSTEM sender, and member event types', () => {
    expect(isSystemPreviewMessage({ message_category: 'system', sender_id: 'u1', type: 'text', content: 'hi' })).toBe(true)
    expect(isSystemPreviewMessage({ sender_id: 'SYSTEM', type: 'text', content: 'hi' })).toBe(true)
    expect(isSystemPreviewMessage({ sender_id: 'u1', type: 'member_joined', content: 'hi' })).toBe(true)
    expect(isSystemPreviewMessage({ sender_id: 'u1', type: 'group_invite', content: 'hi' })).toBe(false)
    expect(isSystemPreviewMessage({ sender_id: 'u1', type: 'text', content: 'hi' })).toBe(false)
  })
})

describe('getSystemPreviewText', () => {
  it('translates member_joined without leaking the raw user id', () => {
    const text = getSystemPreviewText('member_joined|user-123', t)
    expect(text).toContain('chat.systemMemberJoined')
    expect(text).not.toContain('user-123')
  })

  it('falls back to chat.unknown for every actor id', () => {
    const text = getSystemPreviewText('member_left|abc-xyz|', t)
    expect(text).toContain('chat.unknown')
    expect(text).not.toContain('abc-xyz')
  })

  it('passes through legacy content without a pipe separator', () => {
    expect(getSystemPreviewText('plain legacy text', t)).toBe('plain legacy text')
  })

  it('translates call_ended|uuid without leaking the id (trimmed list payload)', () => {
    const msg = { sender_id: 'u1', content: 'call_ended|1ad0b019-34d1-40ac-acd5-8f9c391824a2' } as const
    expect(isSystemPreviewMessage(msg)).toBe(true)
    const text = getSystemPreviewText(msg.content, t)
    expect(text).toContain('chat.callEnded')
    expect(text).not.toContain('1ad0b019')
  })

  it('detects member_joined by content even when type/category are missing', () => {
    const msg = { sender_id: 'u9', content: 'member_joined|user-7' } as const
    expect(isSystemPreviewMessage(msg)).toBe(true)
    expect(getSystemPreviewText(msg.content, t)).not.toContain('user-7')
  })
})

describe('isInvitePreviewContent', () => {
  it('detects serialized group invites regardless of msg.type', () => {
    const json = JSON.stringify({ request_id: 'ahnnfbu14x', chat_id: 'c1', status: 'pending', group_name: 'G' })
    expect(isInvitePreviewContent(json)).toBe(true)
    expect(isInvitePreviewContent('{"request_id":"x"}')).toBe(false)
    expect(isInvitePreviewContent('hello world')).toBe(false)
    expect(isInvitePreviewContent('')).toBe(false)
  })
})
