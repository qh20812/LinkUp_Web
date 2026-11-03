import {
  bufferIce,
  createNegState,
  drainIce,
  isPolitePeer,
  shouldIOffer,
} from '../utils/groupCallNegotiation'
import { participantIdentity } from '../utils/groupCallParticipants'

const labels = { you: 'Bạn', member: 'Thành viên' }

describe('shouldIOffer', () => {
  it('chọn đúng một bên offer cho mỗi cặp', () => {
    const ids = ['user-a', 'user-b', 'user-c']
    for (const a of ids) {
      for (const b of ids) {
        if (a === b) continue
        // Đúng một chiều của mỗi cặp là true.
        expect(shouldIOffer(a, b)).toBe(!shouldIOffer(b, a))
      }
    }
  })

  it('bên có id nhỏ hơn là bên offer', () => {
    expect(shouldIOffer('a', 'b')).toBe(true)
    expect(shouldIOffer('b', 'a')).toBe(false)
  })
})

describe('isPolitePeer', () => {
  it('luôn ngược với bên offer', () => {
    expect(isPolitePeer('a', 'b')).toBe(shouldIOffer('b', 'a'))
    expect(isPolitePeer('b', 'a')).toBe(shouldIOffer('a', 'b'))
  })
})

describe('ICE buffering', () => {
  it('giữ nguyên thứ tự và làm rỗng hàng đợi khi drain', () => {
    const state = createNegState()
    const first = { candidate: 'candidate:1' } as RTCIceCandidateInit
    const second = { candidate: 'candidate:2' } as RTCIceCandidateInit

    bufferIce(state, first)
    bufferIce(state, second)
    expect(state.ice).toHaveLength(2)

    expect(drainIce(state)).toEqual([first, second])
    expect(state.ice).toHaveLength(0)
    expect(drainIce(state)).toEqual([])
  })
})

describe('participantIdentity', () => {
  const profile = { display_name: 'Minh Anh', avatar_uri: 'https://cdn/a.png' }

  it('dùng tên/ảnh thật từ profile', () => {
    expect(participantIdentity('u1', 'me', profile, labels)).toEqual({
      display_name: 'Minh Anh',
      avatar_uri: 'https://cdn/a.png',
    })
  })

  it('không bao giờ trả về user id khi thiếu profile', () => {
    const identity = participantIdentity('0b9c-uuid', 'me', undefined, labels)
    expect(identity.display_name).toBe(labels.member)
    expect(identity.display_name).not.toContain('0b9c-uuid')
  })

  it('không lộ id khi tên trong profile rỗng', () => {
    const identity = participantIdentity('0b9c-uuid', 'me', { display_name: '  ', avatar_uri: '' }, labels)
    expect(identity.display_name).toBe(labels.member)
  })

  it('luôn hiển thị nhãn "bạn" cho chính mình', () => {
    expect(participantIdentity('me', 'me', profile, labels).display_name).toBe(labels.you)
  })
})
