import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import CallOverlay from '../components/calls/CallOverlay'

const mockEndCall = jest.fn()

let mockCallValue: Record<string, unknown>

jest.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'vi',
    setLanguage: jest.fn(),
  }),
}))

jest.mock('../contexts/CallContext', () => ({
  useCall: () => mockCallValue,
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockCallValue = {
    phase: 'active',
    call: {
      callId: 'call-1',
      callType: 'video',
      direction: 'outgoing',
      peer: { user_id: 'peer-1', display_name: 'Minh Anh', avatar_uri: '' },
    },
    lastStatus: 'connected',
    duration: 65,
    localStream: null,
    remoteStream: null,
    localMuted: false,
    localVideoOn: true,
    remoteMuted: false,
    remoteVideoOn: true,
    isInCall: true,
    startCall: jest.fn(),
    acceptCall: jest.fn(),
    rejectCall: jest.fn(),
    endCall: mockEndCall,
    toggleMute: jest.fn(),
    toggleVideo: jest.fn(),
    dismiss: jest.fn(),
  }
})

describe('CallOverlay — thu nhỏ / phóng to', () => {
  it('thu nhỏ rồi phóng to quay lại overlay đầy đủ', () => {
    render(<CallOverlay />)

    // Đang ở overlay đầy đủ: có nút thu nhỏ, chưa có nút phóng to.
    expect(screen.getByLabelText('call.minimize')).toBeInTheDocument()
    expect(screen.queryByLabelText('call.expand')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('call.minimize'))

    // Thanh thu nhỏ: nút phóng to xuất hiện, nút thu nhỏ biến mất.
    expect(screen.getByLabelText('call.expand')).toBeInTheDocument()
    expect(screen.queryByLabelText('call.minimize')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('call.expand'))

    // Phóng to trở lại overlay đầy đủ.
    expect(screen.getByLabelText('call.minimize')).toBeInTheDocument()
    expect(screen.queryByLabelText('call.expand')).not.toBeInTheDocument()
  })

  it('nút kết thúc trên thanh thu nhỏ vẫn gọi endCall', () => {
    render(<CallOverlay />)
    fireEvent.click(screen.getByLabelText('call.minimize'))

    fireEvent.click(screen.getByLabelText('call.end'))

    expect(mockEndCall).toHaveBeenCalledTimes(1)
  })
})
