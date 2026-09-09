import {
  isMediaMessage,
  groupMediaTimeline,
  MEDIA_GROUP_WINDOW_MS,
} from '../utils/chatMediaGroup'
import type { ChatMessage } from '../types'

function mediaMsg(overrides: Partial<ChatMessage> & { media_group_id?: string | null }): ChatMessage {
  return {
    id: 'm1',
    chat_id: 'c1',
    sender_id: 'u1',
    content: '',
    media_id: 'media-1',
    media_group_id: null,
    is_anonymized: false,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('isMediaMessage', () => {
  it('accepts a media-only message without type', () => {
    expect(isMediaMessage(mediaMsg({}))).toBe(true)
  })

  it('accepts a message with media_id and type "text"', () => {
    expect(isMediaMessage(mediaMsg({ type: 'text' }))).toBe(true)
  })

  it('rejects a message with a special type (shared_post)', () => {
    expect(isMediaMessage(mediaMsg({ type: 'shared_post', shared_post_id: 'sp1' }))).toBe(false)
  })

  it('rejects emoji-only messages', () => {
    expect(isMediaMessage(mediaMsg({ emoji_id: 'e1', media_id: null }))).toBe(false)
  })

  it('rejects deleted and decrypt_failed messages', () => {
    expect(isMediaMessage(mediaMsg({ deleted: true }))).toBe(false)
    expect(isMediaMessage(mediaMsg({ decrypt_failed: true }))).toBe(false)
  })

  it('rejects raw video URL content', () => {
    expect(isMediaMessage(mediaMsg({ content: 'https://example.com/v.mp4', media_id: null, media_uri: 'https://example.com/v.mp4' }))).toBe(false)
  })
})

describe('groupMediaTimeline', () => {
  function toItems(msgs: ChatMessage[]) {
    return msgs.map((m) => ({
      kind: 'message' as const,
      msg: m,
      created: new Date(m.created_at).getTime(),
    }))
  }

  it('groups 3 media messages sharing media_group_id', () => {
    const gid = 'group-1'
    const msgs = [
      mediaMsg({ id: 'a', media_group_id: gid, created_at: '2026-01-01T00:00:01.000Z' }),
      mediaMsg({ id: 'b', media_group_id: gid, created_at: '2026-01-01T00:00:01.100Z' }),
      mediaMsg({ id: 'c', media_group_id: gid, created_at: '2026-01-01T00:00:01.200Z' }),
    ]
    const out = groupMediaTimeline(toItems(msgs))
    expect(out).toHaveLength(1)
    expect(out[0].kind).toBe('media_group')
    expect((out[0] as { msgs: ChatMessage[] }).msgs).toHaveLength(3)
  })

  it('groups media messages with type "text" (server-loaded)', () => {
    const gid = 'group-2'
    const msgs = [
      mediaMsg({ id: 'a', type: 'text', media_group_id: gid }),
      mediaMsg({ id: 'b', type: 'text', media_group_id: gid }),
    ]
    const out = groupMediaTimeline(toItems(msgs))
    expect(out).toHaveLength(1)
    expect(out[0].kind).toBe('media_group')
  })

  it('groups media messages without media_group_id when within time window', () => {
    const msgs = [
      mediaMsg({ id: 'a', created_at: '2026-01-01T00:00:00.000Z' }),
      mediaMsg({ id: 'b', created_at: '2026-01-01T00:00:00.100Z' }),
      mediaMsg({ id: 'c', created_at: '2026-01-01T00:00:00.200Z' }),
    ]
    const out = groupMediaTimeline(toItems(msgs))
    expect(out).toHaveLength(1)
    expect(out[0].kind).toBe('media_group')
  })

  it('does not group media messages outside the time window', () => {
    const msgs = [
      mediaMsg({ id: 'a', created_at: '2026-01-01T00:00:00.000Z' }),
      mediaMsg({ id: 'b', created_at: new Date(new Date('2026-01-01T00:00:00.000Z').getTime() + MEDIA_GROUP_WINDOW_MS + 1000).toISOString() }),
    ]
    const out = groupMediaTimeline(toItems(msgs))
    expect(out).toHaveLength(2)
    expect(out[0].kind).toBe('message')
    expect(out[1].kind).toBe('message')
  })

  it('does not group messages from different senders even with same media_group_id', () => {
    const gid = 'group-3'
    const msgs = [
      mediaMsg({ id: 'a', sender_id: 'u1', media_group_id: gid }),
      mediaMsg({ id: 'b', sender_id: 'u2', media_group_id: gid }),
    ]
    const out = groupMediaTimeline(toItems(msgs))
    expect(out).toHaveLength(2)
  })

  it('does not group a single media message', () => {
    const out = groupMediaTimeline(toItems([mediaMsg({ id: 'a' })]))
    expect(out).toHaveLength(1)
    expect(out[0].kind).toBe('message')
  })
})
