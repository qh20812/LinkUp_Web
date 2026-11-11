import { getSystemPreviewText, getCallPreviewText, isInvitePreviewContent, isSystemPreviewMessage, isVoicePreviewMessage } from '../utils/chatPreview'

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

  it('uses the last-message sender name when the server provides it', () => {
    const text = getSystemPreviewText('member_joined|user-123', t, 'Alice')
    expect(text).toContain('Alice')
    expect(text).not.toContain('user-123')
    expect(text).not.toContain('chat.unknown')
  })

  it('falls back to chat.unknown when the sender name is blank', () => {
    const text = getSystemPreviewText('member_joined|user-123', t, '   ')
    expect(text).toContain('chat.unknown')
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

describe('isVoicePreviewMessage', () => {
  it('detects voice notes by audio media_type', () => {
    expect(isVoicePreviewMessage({ media_type: 'audio/webm' })).toBe(true)
    expect(isVoicePreviewMessage({ media_type: 'audio/mp4' })).toBe(true)
  })

  it('rejects non-audio and missing types', () => {
    expect(isVoicePreviewMessage({ media_type: 'image/png' })).toBe(false)
    expect(isVoicePreviewMessage({ media_type: 'video/mp4' })).toBe(false)
    expect(isVoicePreviewMessage({})).toBe(false)
  })
})

describe('getCallPreviewText', () => {
  const call = (patch: Partial<Parameters<typeof getCallPreviewText>[0]>) => ({
    call_id: 'c1',
    call_type: 'voice' as const,
    status: 'ended' as const,
    is_missed: false,
    direction: 'incoming' as const,
    duration: 0,
    created_at: new Date().toISOString(),
    ...patch,
  })

  it('ưu tiên cuộc gọi nhỡ', () => {
    expect(getCallPreviewText(call({ is_missed: true, status: 'missed' }), t)).toBe('call.historyMissed')
  })

  it('phân biệt cuộc gọi đến/đi', () => {
    expect(getCallPreviewText(call({ direction: 'incoming' }), t)).toBe('call.historyIncoming')
    expect(getCallPreviewText(call({ direction: 'outgoing' }), t)).toBe('call.historyOutgoing')
  })

  it('map trạng thái từ chối/huỷ/bận', () => {
    expect(getCallPreviewText(call({ status: 'rejected' }), t)).toBe('call.statusRejected')
    expect(getCallPreviewText(call({ status: 'cancelled' }), t)).toBe('call.statusCancelled')
    expect(getCallPreviewText(call({ status: 'busy' }), t)).toBe('call.statusBusy')
  })
})
