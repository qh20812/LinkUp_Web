import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'

import GroupCallBubble from '../components/calls/GroupCallBubble'
import type { GroupCallContextValue } from '../contexts/GroupCallContext'
import type { GroupCallParticipant } from '../types/groupCall'

const mockExpand = jest.fn()
const mockEnd = jest.fn()
const mockT = (key: string) => key

let mockGroupCallValue: GroupCallContextValue

jest.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: mockT, language: 'vi', setLanguage: jest.fn() }),
}))

jest.mock('../contexts/GroupCallContext', () => ({
  useGroupCall: () => mockGroupCallValue,
}))

function buildValue(): GroupCallContextValue {
  const participants = new Map<string, GroupCallParticipant>([
    [
      'me',
      {
        user_id: 'me',
        display_name: 'groupCall.you',
        avatar_uri: '',
        muted: false,
        video_enabled: true,
        is_active: true,
      },
    ],
  ])

  return {
    phase: 'minimized',
    call: {
      callId: 'call-1',
      chatId: 'chat-1',
      callerId: 'me',
      isVideo: true,
      participants,
      pendingRequests: [],
    },
    duration: 42,
    localStream: null,
    localMuted: false,
    localVideoOn: true,
    isCreator: true,
    isInGroupCall: true,
    myUserId: 'me',
    pendingRequests: [],
    profiles: {},
    remoteStreams: new Map(),
    startGroupCall: async () => {},
    joinGroupCall: async () => {},
    declineGroupCall: mockEnd,
    acceptJoinRequest: mockEnd,
    rejectJoinRequest: mockEnd,
    endGroupCall: mockEnd,
    toggleMute: mockEnd,
    toggleVideo: mockEnd,
    toggleMuteParticipant: mockEnd,
    minimize: mockEnd,
    expand: mockExpand,
    dismiss: mockEnd,
  }
}

describe('GroupCallBubble', () => {
  let setPointerCapture: jest.Mock
  let releasePointerCapture: jest.Mock

  // jsdom không dựng PointerEvent đầy đủ (mất clientX/pointerId), nên tạo
  // Event rồi gán thuộc tính trực tiếp — React đọc lại qua nativeEvent.
  function dispatchPointer(
    element: Element,
    type: string,
    props: { clientX: number; clientY: number; pointerId: number },
  ) {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.assign(event, props)
    act(() => {
      element.dispatchEvent(event)
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGroupCallValue = buildValue()

    setPointerCapture = jest.fn()
    releasePointerCapture = jest.fn()
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: setPointerCapture,
    })
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: releasePointerCapture,
    })
    Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
      configurable: true,
      value: jest.fn(() => true),
    })
  })

  it('bấm nút "Mở rộng" gọi expand()', () => {
    render(<GroupCallBubble />)

    fireEvent.click(screen.getByLabelText('groupCall.expand'))

    expect(mockExpand).toHaveBeenCalledTimes(1)
  })

  it('pointerdown trên nút không bắt pointer (không nuốt click)', () => {
    render(<GroupCallBubble />)
    const button = screen.getByLabelText('groupCall.expand')

    dispatchPointer(button, 'pointerdown', {
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    })
    dispatchPointer(button, 'pointerup', {
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    })
    fireEvent.click(button)

    expect(setPointerCapture).not.toHaveBeenCalled()
    expect(mockExpand).toHaveBeenCalledTimes(1)
  })

  it('kéo trên vùng bubble: chỉ capture sau ngưỡng và đổi vị trí', () => {
    const { container } = render(<GroupCallBubble />)
    const bubble = container.firstElementChild as HTMLElement
    const initialLeft = bubble.style.left

    dispatchPointer(bubble, 'pointerdown', {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    })
    // Dưới ngưỡng 4px: chưa coi là kéo.
    dispatchPointer(bubble, 'pointermove', {
      pointerId: 1,
      clientX: 102,
      clientY: 101,
    })
    expect(setPointerCapture).not.toHaveBeenCalled()
    expect(bubble.style.left).toBe(initialLeft)

    // Vượt ngưỡng: bắt đầu kéo và capture pointer.
    dispatchPointer(bubble, 'pointermove', {
      pointerId: 1,
      clientX: 60,
      clientY: 100,
    })
    expect(setPointerCapture).toHaveBeenCalledWith(1)
    expect(bubble.style.left).not.toBe(initialLeft)

    dispatchPointer(bubble, 'pointerup', {
      pointerId: 1,
      clientX: 60,
      clientY: 100,
    })
    expect(releasePointerCapture).toHaveBeenCalledWith(1)
  })

  it('dưới phase minimized thì không render gì', () => {
    mockGroupCallValue = { ...buildValue(), phase: 'active' }
    const { container } = render(<GroupCallBubble />)
    expect(container).toBeEmptyDOMElement()
  })
})
