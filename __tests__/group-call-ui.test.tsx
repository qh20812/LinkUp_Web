import React from 'react'
import { render, screen } from '@testing-library/react'

import GroupCallOverlay from '../components/calls/GroupCallOverlay'
import GroupCallIncomingModal from '../components/calls/GroupCallIncomingModal'
import type {
  ActiveGroupCall,
  GroupCallParticipant,
} from '../types/groupCall'
import type { GroupCallContextValue } from '../contexts/GroupCallContext'

const CALLER_ID = 'uuid-caller-9f3a'
const PEER_ID = 'uuid-peer-7a1c'
const SELF_ID = 'uuid-self-42bd'
const REQUESTER_ID = 'uuid-requester-1e8f'

const mockT = (key: string) => key
const noop = jest.fn()

let mockGroupCallValue: GroupCallContextValue

jest.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: mockT, language: 'vi', setLanguage: jest.fn() }),
}))

jest.mock('../contexts/GroupCallContext', () => ({
  useGroupCall: () => mockGroupCallValue,
}))

function participant(
  userId: string,
  displayName: string,
  overrides: Partial<GroupCallParticipant> = {},
): GroupCallParticipant {
  return {
    user_id: userId,
    display_name: displayName,
    avatar_uri: '',
    muted: false,
    video_enabled: true,
    is_active: false,
    ...overrides,
  }
}

function buildCall(overrides: Partial<ActiveGroupCall> = {}): ActiveGroupCall {
  return {
    callId: 'call-1',
    chatId: 'chat-1',
    callerId: CALLER_ID,
    isVideo: true,
    participants: new Map<string, GroupCallParticipant>([
      [CALLER_ID, participant(CALLER_ID, 'Caller')],
      [PEER_ID, participant(PEER_ID, 'Peer', { is_active: true })],
      [SELF_ID, participant(SELF_ID, 'groupCall.you', { is_active: true })],
    ]),
    pendingRequests: [],
    ...overrides,
  }
}

function buildValue(
  overrides: Partial<GroupCallContextValue> = {},
): GroupCallContextValue {
  return {
    phase: 'active',
    call: buildCall(),
    duration: 0,
    localStream: null,
    localMuted: false,
    localVideoOn: true,
    isCreator: false,
    isInGroupCall: true,
    myUserId: SELF_ID,
    pendingRequests: [],
    profiles: {},
    remoteStreams: new Map(),
    startGroupCall: async () => {},
    joinGroupCall: async () => {},
    declineGroupCall: noop,
    acceptJoinRequest: noop,
    rejectJoinRequest: noop,
    endGroupCall: noop,
    toggleMute: noop,
    toggleVideo: noop,
    toggleMuteParticipant: noop,
    minimize: noop,
    expand: noop,
    dismiss: noop,
    ...overrides,
  }
}

function fakeStream(): MediaStream {
  return { id: 'stream-peer' } as unknown as MediaStream
}

describe('GroupCallOverlay', () => {
  beforeEach(() => {
    jest
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.resolve())
    // jsdom không có srcObject; gán setter để VideoFeed không ném lỗi.
    Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
      configurable: true,
      get() {
        return null
      },
      set() {
        // no-op
      },
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
    noop.mockClear()
  })

  it('vẫn hiển thị người gọi khi chưa có stream (không bị filter ẩn)', () => {
    mockGroupCallValue = buildValue()
    render(<GroupCallOverlay />)

    expect(screen.getByText('Caller')).toBeInTheDocument()
    expect(screen.getByText('Peer')).toBeInTheDocument()
  })

  it('không lặp tile của chính mình và không lộ user id', () => {
    mockGroupCallValue = buildValue()
    const { container } = render(<GroupCallOverlay />)

    // Chỉ tile local mang nhãn "bạn"; entry của bản thân bị loại khỏi remote.
    expect(screen.getAllByText('groupCall.you')).toHaveLength(1)
    expect(container.textContent).not.toContain(SELF_ID)
    expect(container.textContent).not.toContain(CALLER_ID)
    expect(container.textContent).not.toContain(PEER_ID)
  })

  it('render video cho participant đã có stream', () => {
    mockGroupCallValue = buildValue({
      remoteStreams: new Map([[PEER_ID, fakeStream()]]),
    })
    const { container } = render(<GroupCallOverlay />)

    expect(container.querySelectorAll('video')).toHaveLength(1)
    expect(screen.getByText('Peer')).toBeInTheDocument()
    expect(screen.getByText('Caller')).toBeInTheDocument()
  })

  it('hiện tên người xin vào từ profiles, không hiện id', () => {
    mockGroupCallValue = buildValue({
      call: buildCall({ pendingRequests: [REQUESTER_ID] }),
      pendingRequests: [REQUESTER_ID],
      isCreator: true,
      profiles: {
        [REQUESTER_ID]: {
          display_name: 'Requester',
          avatar_uri: 'https://cdn.example.com/r.png',
        },
      },
    })
    const { container } = render(<GroupCallOverlay />)

    expect(screen.getByText('Requester')).toBeInTheDocument()
    expect(container.textContent).not.toContain(REQUESTER_ID)
  })
})

describe('GroupCallIncomingModal', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('hiện tên người gọi đã hydrate từ profiles', () => {
    mockGroupCallValue = buildValue({
      phase: 'ringing',
      call: buildCall({
        participants: new Map<string, GroupCallParticipant>([
          [CALLER_ID, participant(CALLER_ID, 'Minh Anh')],
        ]),
      }),
    })
    render(<GroupCallIncomingModal />)

    expect(screen.getByText('Minh Anh')).toBeInTheDocument()
    expect(screen.queryByText(CALLER_ID)).not.toBeInTheDocument()
  })

  it('dùng profiles khi participant chưa kịp hydrate', () => {
    mockGroupCallValue = buildValue({
      phase: 'ringing',
      call: buildCall({ participants: new Map<string, GroupCallParticipant>() }),
      profiles: {
        [CALLER_ID]: { display_name: 'Minh Anh', avatar_uri: '' },
      },
    })
    render(<GroupCallIncomingModal />)

    expect(screen.getByText('Minh Anh')).toBeInTheDocument()
  })

  it('không có profile thì dùng nhãn đã dịch thay vì UUID', () => {
    mockGroupCallValue = buildValue({
      phase: 'ringing',
      call: buildCall({
        participants: new Map<string, GroupCallParticipant>(),
      }),
      profiles: {},
    })
    const { container } = render(<GroupCallIncomingModal />)

    expect(screen.getByText('groupCall.member')).toBeInTheDocument()
    expect(container.textContent).not.toContain(CALLER_ID)
  })

  it('không render gì khi cuộc gọi đang ở phase khác', () => {
    mockGroupCallValue = buildValue({ phase: 'active' })
    const { container } = render(<GroupCallIncomingModal />)
    expect(container).toBeEmptyDOMElement()
  })
})
