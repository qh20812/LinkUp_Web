import React from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ForwardPickerModal, { type ForwardPickTarget } from '@/components/messages/ForwardPickerModal'
import { renderWithProviders } from './test-utils'
import type { ChatConversation, ChatMessage, GroupChatConversation } from '@/types'

function makeDirect(chatId: string, name: string): ChatConversation {
  return {
    chat_id: chatId,
    partner: { user_id: `u-${chatId}`, display_name: name, avatar_uri: '' },
    last_message: null,
    is_encrypted: false,
    updated_at: '2026-01-01T00:00:00Z',
  }
}

function makeGroup(chatId: string, name: string, memberCount = 3): GroupChatConversation {
  return {
    chat_id: chatId,
    name,
    avatar_uri: '',
    member_count: memberCount,
    last_message: null,
    updated_at: '2026-01-01T00:00:00Z',
  }
}

const baseProps = {
  open: true,
  source: null as ChatMessage | null,
  onClose: jest.fn(),
  conversations: [makeDirect('d1', 'Alice'), makeDirect('d2', 'Bob')],
  groupConversations: [makeGroup('g1', 'Dev Team')],
  onPick: jest.fn(),
}

describe('ForwardPickerModal', () => {
  it('renders group and direct conversations with source preview', () => {
    const source = { id: 'm1', content: 'forward me please' } as unknown as ChatMessage
    renderWithProviders(<ForwardPickerModal {...baseProps} source={source} />)

    expect(screen.getByText('forward me please')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Dev Team')).toBeInTheDocument()
  })

  it('filters both lists by keyword', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ForwardPickerModal {...baseProps} />)

    await user.type(screen.getByRole('textbox'), 'Alice')

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
    expect(screen.queryByText('Dev Team')).not.toBeInTheDocument()
  })

  it('calls onPick with the correct group target when a group is clicked', async () => {
    const onPick = jest.fn()
    const user = userEvent.setup()
    renderWithProviders(<ForwardPickerModal {...baseProps} onPick={onPick} />)

    await user.click(screen.getByText('Dev Team'))

    const target: ForwardPickTarget = { chatId: 'g1', type: 'group' }
    expect(onPick).toHaveBeenCalledWith(target)
  })

  it('calls onPick with the correct direct target when a chat is clicked', async () => {
    const onPick = jest.fn()
    const user = userEvent.setup()
    renderWithProviders(<ForwardPickerModal {...baseProps} onPick={onPick} />)

    await user.click(screen.getByText('Alice'))

    const target: ForwardPickTarget = { chatId: 'd1', type: 'direct' }
    expect(onPick).toHaveBeenCalledWith(target)
  })

  it('renders nothing when closed', () => {
    renderWithProviders(<ForwardPickerModal {...baseProps} open={false} />)

    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
    expect(screen.queryByText('Dev Team')).not.toBeInTheDocument()
  })
})