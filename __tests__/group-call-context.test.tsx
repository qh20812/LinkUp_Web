import React, { useEffect } from 'react'
import { act, render, waitFor } from '@testing-library/react'

import type { GroupCallSocketStatus } from '../hooks/useGroupCallSocket'

// ─── Mocks: socket, auth, toast, i18n, ICE, ringtone ───────────────────────

type WsHandler = (payload: unknown) => void

const mockHandlers = new Map<string, WsHandler>()
const mockSend = jest.fn(() => true)
const mockToast = jest.fn()
let mockSelfId = 'me'
let mockTranslatePrefix = 'vi'
const mockT = (key: string) => `${mockTranslatePrefix}:${key}`

const mockSocket = {
  status: 'open' as GroupCallSocketStatus,
  send: mockSend,
  subscribe: jest.fn((type: string, handler: WsHandler) => {
    mockHandlers.set(type, handler)
    return () => {
      mockHandlers.delete(type)
    }
  }),
  connect: jest.fn(),
  close: jest.fn(),
}

jest.mock('../hooks/useGroupCallSocket', () => ({
  useGroupCallSocket: () => mockSocket,
}))
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { user_id: mockSelfId } }),
}))
jest.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ toast: mockToast }),
}))
jest.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: mockT, language: 'vi', setLanguage: jest.fn() }),
}))
jest.mock('../api/calls', () => ({ getIceServers: jest.fn(async () => []) }))
jest.mock('../utils/ringtone', () => ({
  playRingtone: jest.fn(),
  stopRingtone: jest.fn(),
}))

import {
  GroupCallProvider,
  useGroupCall,
  type GroupCallContextValue,
} from '../contexts/GroupCallContext'
import type { GroupCallProfile } from '../types/groupCall'

// ─── Fake WebRTC ───────────────────────────────────────────────────────────

interface FakeTrack {
  kind: string
  enabled: boolean
  stop: jest.Mock
}

function makeTrack(kind: 'audio' | 'video'): FakeTrack {
  return { kind, enabled: true, stop: jest.fn() }
}

class FakeMediaStream {
  tracks: FakeTrack[]
  constructor(tracks: FakeTrack[] = []) {
    this.tracks = tracks
  }
  getTracks() {
    return this.tracks
  }
  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === 'audio')
  }
  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === 'video')
  }
}

class FakePeerConnection {
  static instances: FakePeerConnection[] = []

  signalingState = 'stable'
  connectionState = 'new'
  remoteDescription: unknown = null
  onicecandidate: ((event: { candidate: { toJSON(): unknown } }) => void) | null =
    null
  ontrack: ((event: { streams: unknown[]; track: unknown }) => void) | null = null
  onconnectionstatechange: (() => void) | null = null

  addTrack = jest.fn()
  addTransceiver = jest.fn()
  createOffer = jest.fn(async () => ({ type: 'offer', sdp: 'local-offer' }))
  createAnswer = jest.fn(async () => ({ type: 'answer', sdp: 'local-answer' }))
  setLocalDescription = jest.fn(async (desc: { type: string }) => {
    if (desc.type === 'offer') this.signalingState = 'have-local-offer'
    else this.signalingState = 'stable'
  })
  setRemoteDescription = jest.fn(async (desc: { type: string }) => {
    this.remoteDescription = desc
    this.signalingState = desc.type === 'offer' ? 'have-remote-offer' : 'stable'
  })
  addIceCandidate = jest.fn(async (candidate: RTCIceCandidateInit) => {
    this.lastCandidate = candidate
  })
  lastCandidate: RTCIceCandidateInit | null = null
  close = jest.fn(() => {
    this.connectionState = 'closed'
  })

  constructor() {
    FakePeerConnection.instances.push(this)
  }
}

function lastPc(): FakePeerConnection {
  const pc = FakePeerConnection.instances[FakePeerConnection.instances.length - 1]
  if (!pc) throw new Error('chưa có RTCPeerConnection nào')
  return pc
}

// ─── Harness ───────────────────────────────────────────────────────────────

let current: GroupCallContextValue | null = null

function Probe() {
  const value = useGroupCall()
  // Gán trong effect (không phải lúc render) để tuân thủ react-hooks/globals.
  useEffect(() => {
    current = value
  }, [value])
  return null
}

function tree() {
  return (
    <GroupCallProvider>
      <Probe />
    </GroupCallProvider>
  )
}

function ctx(): GroupCallContextValue {
  if (!current) throw new Error('context chưa sẵn sàng')
  return current
}

async function emit(type: string, payload: unknown) {
  const handler = mockHandlers.get(type)
  if (!handler) throw new Error(`chưa subscribe ${type}`)
  await act(async () => {
    await handler(payload)
  })
}

const CHAT = 'chat-1'
const CALL = 'call-1'
const CALLER = 'caller-1'

let mockAudioTrack: FakeTrack
let mockVideoTrack: FakeTrack
let mockStream: FakeMediaStream

function profilesFor(ids: string[]): Record<string, GroupCallProfile> {
  const profiles: Record<string, GroupCallProfile> = {}
  for (const id of ids) {
    profiles[id] = {
      display_name: `Name-${id}`,
      avatar_uri: `https://cdn.example.com/${id}.png`,
    }
  }
  return profiles
}

interface EnterOptions {
  selfId?: string
  participants?: string[]
  profiles?: Record<string, GroupCallProfile>
}

async function enterCall(options: EnterOptions = {}) {
  const selfId = options.selfId ?? 'me'
  mockSelfId = selfId
  const participants = options.participants ?? [CALLER, 'peer-a', selfId]
  const profiles = options.profiles ?? profilesFor(participants)

  const view = render(tree())

  await emit('group:call:incoming', {
    call_id: CALL,
    chat_id: CHAT,
    caller_id: CALLER,
    participants,
    is_video: true,
    profiles,
  })

  await act(async () => {
    await ctx().joinGroupCall(CALL)
  })

  await emit('group:call:joined', {
    call_id: CALL,
    chat_id: CHAT,
    user_id: selfId,
    caller_id: CALLER,
    profiles: profiles[selfId] ? { [selfId]: profiles[selfId] } : undefined,
  })

  return { view, selfId, profiles, participants }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockHandlers.clear()
  mockSocket.status = 'open'
  mockSelfId = 'me'
  mockTranslatePrefix = 'vi'
  current = null
  FakePeerConnection.instances = []

  mockAudioTrack = makeTrack('audio')
  mockVideoTrack = makeTrack('video')
  mockStream = new FakeMediaStream([mockAudioTrack, mockVideoTrack])

  ;(globalThis as unknown as Record<string, unknown>).RTCPeerConnection =
    FakePeerConnection
  ;(globalThis as unknown as Record<string, unknown>).MediaStream =
    FakeMediaStream

  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: jest.fn(async () => mockStream),
    },
  })
})

describe('GroupCallProvider — vòng đời cuộc gọi', () => {
  it('reo máy và hydrate tên từ profiles, không dùng UUID làm tên', async () => {
    mockSelfId = 'me'
    render(tree())

    expect(ctx().phase).toBe('idle')

    await emit('group:call:incoming', {
      call_id: CALL,
      chat_id: CHAT,
      caller_id: CALLER,
      participants: [CALLER, 'peer-a', 'me'],
      is_video: true,
      profiles: {
        [CALLER]: { display_name: 'Minh Anh', avatar_uri: 'https://cdn/a.png' },
      },
    })

    expect(ctx().phase).toBe('ringing')
    const caller = ctx().call!.participants.get(CALLER)!
    expect(caller.display_name).toBe('Minh Anh')
    expect(caller.avatar_uri).toBe('https://cdn/a.png')

    // Không có profile → nhãn đã dịch, tuyệt đối không phải user id.
    const peer = ctx().call!.participants.get('peer-a')!
    expect(peer.display_name).toBe('vi:groupCall.member')
    expect(peer.display_name).not.toBe('peer-a')
  })

  it('join gửi request-join rồi chuyển active khi server xác nhận', async () => {
    await enterCall()

    expect(mockSend).toHaveBeenCalledWith('group:call:request-join', {
      call_id: CALL,
    })
    expect(ctx().phase).toBe('active')
    expect(ctx().call?.callId).toBe(CALL)
    expect(ctx().isInGroupCall).toBe(true)
  })

  it('bỏ qua incoming khi đang trong cuộc gọi khác', async () => {
    await enterCall()

    await emit('group:call:incoming', {
      call_id: 'call-2',
      chat_id: CHAT,
      caller_id: 'someone',
      participants: ['someone', 'me'],
      is_video: true,
    })

    expect(ctx().phase).toBe('active')
    expect(ctx().call?.callId).toBe(CALL)
  })

  it('kết thúc: gửi group:call:end và đóng UI khi nhận ended', async () => {
    await enterCall()
    mockSend.mockClear()

    act(() => ctx().endGroupCall())
    expect(mockSend).toHaveBeenCalledWith('group:call:end', { call_id: CALL })

    await emit('group:call:ended', { call_id: CALL, by: CALLER })
    expect(ctx().phase).toBe('ended')
  })
})

describe('GroupCallProvider — thương lượng WebRTC', () => {
  it('trả lời offer của peer (nguyên nhân gốc của "không nghe/không thấy")', async () => {
    await enterCall({ selfId: 'me', participants: [CALLER, 'aaa', 'me'] })

    await emit('group:call:signal', {
      call_id: CALL,
      sender_id: 'aaa',
      target_user_id: 'me',
      signal: { type: 'offer', sdp: 'peer-offer' },
    })

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith(
        'group:call:signal',
        expect.objectContaining({
          call_id: CALL,
          target_user_id: 'aaa',
          signal: { type: 'answer', sdp: 'local-answer' },
        }),
      )
    })

    const pc = lastPc()
    expect(pc.setRemoteDescription).toHaveBeenCalledWith({
      type: 'offer',
      sdp: 'peer-offer',
    })
    expect(pc.createAnswer).toHaveBeenCalledTimes(1)
    expect(pc.signalingState).toBe('stable')
  })

  it('giữ ICE đến trước offer và add sau khi có remote description', async () => {
    await enterCall({ selfId: 'me', participants: [CALLER, 'aaa', 'me'] })

    await emit('group:call:signal', {
      call_id: CALL,
      sender_id: 'aaa',
      target_user_id: 'me',
      signal: { type: 'ice', candidate: { candidate: 'c1' } },
    })
    await emit('group:call:signal', {
      call_id: CALL,
      sender_id: 'aaa',
      target_user_id: 'me',
      signal: { type: 'ice', candidate: { candidate: 'c2' } },
    })

    // Chưa có PC cho tới khi offer tới.
    expect(FakePeerConnection.instances).toHaveLength(0)

    await emit('group:call:signal', {
      call_id: CALL,
      sender_id: 'aaa',
      target_user_id: 'me',
      signal: { type: 'offer', sdp: 'peer-offer' },
    })

    await waitFor(() => expect(lastPc().addIceCandidate).toHaveBeenCalledTimes(2))
    const pc = lastPc()
    expect(pc.addIceCandidate.mock.calls[0][0]).toEqual({ candidate: 'c1' })
    expect(pc.addIceCandidate.mock.calls[1][0]).toEqual({ candidate: 'c2' })
    expect(pc.setRemoteDescription.mock.invocationCallOrder[0]).toBeLessThan(
      pc.addIceCandidate.mock.invocationCallOrder[0],
    )
  })

  it('add ICE ngay khi đã có remote description', async () => {
    await enterCall({ selfId: 'me', participants: [CALLER, 'aaa', 'me'] })

    await emit('group:call:signal', {
      call_id: CALL,
      sender_id: 'aaa',
      target_user_id: 'me',
      signal: { type: 'offer', sdp: 'peer-offer' },
    })
    await emit('group:call:signal', {
      call_id: CALL,
      sender_id: 'aaa',
      target_user_id: 'me',
      signal: { type: 'ice', candidate: { candidate: 'late' } },
    })

    await waitFor(() =>
      expect(lastPc().addIceCandidate).toHaveBeenCalledWith({
        candidate: 'late',
      }),
    )
  })

  it('chỉ bên có id nhỏ hơn gửi offer, và offer được scope đúng peer', async () => {
    await enterCall({ selfId: 'aaa', participants: [CALLER, 'aaa', 'zzz'] })
    mockSend.mockClear()

    await emit('group:call:joined', {
      call_id: CALL,
      chat_id: CHAT,
      user_id: 'zzz',
      caller_id: CALLER,
    })

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith(
        'group:call:signal',
        expect.objectContaining({
          call_id: CALL,
          target_user_id: 'zzz',
          signal: { type: 'offer', sdp: 'local-offer' },
        }),
      )
    })
    expect(FakePeerConnection.instances).toHaveLength(1)
  })

  it('không tạo offer khi mình là bên nhận (id lớn hơn)', async () => {
    await enterCall({ selfId: 'zzz', participants: [CALLER, 'aaa', 'zzz'] })
    mockSend.mockClear()

    await emit('group:call:joined', {
      call_id: CALL,
      chat_id: CHAT,
      user_id: 'aaa',
      caller_id: CALLER,
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(FakePeerConnection.instances).toHaveLength(0)
    expect(mockSend).not.toHaveBeenCalledWith(
      'group:call:signal',
      expect.anything(),
    )
  })

  it('không offer lại khi PC đã kết nối (tránh giật hình sau reconnect)', async () => {
    await enterCall({ selfId: 'aaa', participants: [CALLER, 'aaa', 'zzz'] })
    await emit('group:call:joined', {
      call_id: CALL,
      chat_id: CHAT,
      user_id: 'zzz',
      caller_id: CALLER,
    })
    await waitFor(() => expect(FakePeerConnection.instances).toHaveLength(1))

    lastPc().connectionState = 'connected'
    mockSend.mockClear()

    await emit('group:call:joined', {
      call_id: CALL,
      chat_id: CHAT,
      user_id: 'zzz',
      caller_id: CALLER,
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockSend).not.toHaveBeenCalledWith(
      'group:call:signal',
      expect.anything(),
    )
  })

  it('bỏ qua signal gửi cho người khác hoặc thuộc call khác', async () => {
    await enterCall({ selfId: 'me', participants: [CALLER, 'aaa', 'me'] })

    await emit('group:call:signal', {
      call_id: CALL,
      sender_id: 'aaa',
      target_user_id: 'someone-else',
      signal: { type: 'offer', sdp: 'not-for-me' },
    })
    await emit('group:call:signal', {
      call_id: 'call-other',
      sender_id: 'aaa',
      target_user_id: 'me',
      signal: { type: 'offer', sdp: 'other-call' },
    })

    expect(FakePeerConnection.instances).toHaveLength(0)
    expect(mockSend).not.toHaveBeenCalledWith(
      'group:call:signal',
      expect.anything(),
    )
  })

  it('left dọn participant, remote stream và đóng PC', async () => {
    await enterCall({ selfId: 'aaa', participants: [CALLER, 'aaa', 'zzz'] })
    await emit('group:call:joined', {
      call_id: CALL,
      chat_id: CHAT,
      user_id: 'zzz',
      caller_id: CALLER,
    })
    await waitFor(() => expect(FakePeerConnection.instances).toHaveLength(1))

    const remoteStream = new FakeMediaStream([makeTrack('audio')])
    await act(async () => {
      lastPc().ontrack?.({
        streams: [remoteStream],
        track: remoteStream.tracks[0],
      })
    })

    expect(ctx().remoteStreams.has('zzz')).toBe(true)
    expect(ctx().call!.participants.get('zzz')?.is_active).toBe(true)

    await emit('group:call:left', { call_id: CALL, user_id: 'zzz' })

    expect(ctx().remoteStreams.has('zzz')).toBe(false)
    expect(ctx().call!.participants.has('zzz')).toBe(false)
    expect(lastPc().close).toHaveBeenCalled()
  })

  it('đổi creator khi server chuyển quyền', async () => {
    await enterCall()
    expect(ctx().isCreator).toBe(false)

    await emit('group:call:creator-changed', {
      call_id: CALL,
      caller_id: 'me',
    })

    expect(ctx().isCreator).toBe(true)
  })
})

describe('GroupCallProvider — điều khiển và reconnect', () => {
  it('mute/video tắt track và gửi event tương ứng', async () => {
    await enterCall()
    mockSend.mockClear()

    act(() => ctx().toggleMute())
    expect(mockAudioTrack.enabled).toBe(false)
    expect(mockSend).toHaveBeenCalledWith('group:call:toggle-mic', {
      call_id: CALL,
      muted: true,
    })

    act(() => ctx().toggleVideo())
    expect(mockVideoTrack.enabled).toBe(false)
    expect(mockSend).toHaveBeenCalledWith('group:call:toggle-video', {
      call_id: CALL,
      video_enabled: false,
    })
  })

  it('reconnect khi đang gọi thì tự xin vào lại session', async () => {
    const { view } = await enterCall()
    mockSend.mockClear()
    mockToast.mockClear()

    mockSocket.status = 'closed'
    view.rerender(tree())

    mockSocket.status = 'open'
    view.rerender(tree())

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith('group:call:request-join', {
        call_id: CALL,
      })
    })
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'info' }),
    )
  })

  it('handler luôn dùng bản dịch mới nhất (không bị đóng băng ở render đầu)', async () => {
    mockTranslatePrefix = 'vi'
    mockSelfId = 'me'
    render(tree())

    mockTranslatePrefix = 'en'
    await emit('group:call:incoming', {
      call_id: CALL,
      chat_id: CHAT,
      caller_id: CALLER,
      participants: [CALLER, 'me'],
      is_video: true,
    })

    await emit('group:call:join-rejected', {
      call_id: CALL,
      user_id: 'me',
    })

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'en:groupCall.joinRejected' }),
    )
  })
})
