import React from 'react'
import { render, screen } from '@testing-library/react'
import SeenIndicator from '@/components/messages/SeenIndicator'
import type { ChatMessage } from '@/types'

const t = (key: string) => key

function makeMsg(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: 'm1',
    chat_id: 'c1',
    sender_id: 'me',
    content: 'hello',
    is_anonymized: false,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('SeenIndicator sending state', () => {
  it('shows sending label for optimistic temp messages, never sent/seen', () => {
    render(<SeenIndicator msg={makeMsg({ id: 'temp-1' })} myUserId="me" t={t} />)
    expect(screen.getByText('chat.sending')).toBeTruthy()
    expect(screen.queryByText('chat.sent')).toBeNull()
    expect(screen.queryByText('chat.seen')).toBeNull()
  })

  it('shows sent for confirmed unseed messages', () => {
    render(
      <SeenIndicator
        msg={makeMsg({ id: 'm1', seen_by: [] })}
        myUserId="me"
        mode="direct"
        conversation={{ chat_id: 'c1', partner: { user_id: 'u2', display_name: 'B', avatar_uri: '' }, updated_at: '' }}
        t={t}
      />,
    )
    expect(screen.getByText('chat.sent')).toBeTruthy()
  })

  it('shows seen once the partner has read it', () => {
    render(
      <SeenIndicator
        msg={makeMsg({ id: 'm1', seen_by: ['u2'] })}
        myUserId="me"
        mode="direct"
        conversation={{ chat_id: 'c1', partner: { user_id: 'u2', display_name: 'B', avatar_uri: '' }, updated_at: '' }}
        t={t}
      />,
    )
    expect(screen.getByText('chat.seen')).toBeTruthy()
  })
})
