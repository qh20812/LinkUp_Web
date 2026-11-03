import { act, renderHook } from '@testing-library/react'

import { useCallSocket } from '../hooks/useCallSocket'

type Listener = (() => void) | null

class FakeWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: FakeWebSocket[] = []

  url: string
  readyState = FakeWebSocket.CONNECTING
  onopen: Listener = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: Listener = null
  onerror: Listener = null
  send = jest.fn()
  close = jest.fn(() => {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.()
  })

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  open() {
    this.readyState = FakeWebSocket.OPEN
    this.onopen?.()
  }

  emit(data: string) {
    this.onmessage?.({ data })
  }

  serverClose() {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.()
  }
}

describe('useCallSocket', () => {
  const originalWebSocket = globalThis.WebSocket

  beforeEach(() => {
    jest.useFakeTimers()
    FakeWebSocket.instances = []
    ;(globalThis as unknown as Record<string, unknown>).WebSocket = FakeWebSocket
    window.localStorage.clear()
  })

  afterEach(() => {
    ;(globalThis as unknown as Record<string, unknown>).WebSocket = originalWebSocket
    window.localStorage.clear()
    jest.useRealTimers()
  })

  function current() {
    const instance = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
    if (!instance) throw new Error('chưa có WebSocket nào được tạo')
    return instance
  }

  it('kết nối sau khi đăng nhập SPA (token xuất hiện sau khi mount)', () => {
    const { result } = renderHook(() => useCallSocket())

    // Chưa có token → chưa mở socket nào (đây là lỗi cũ: không bao giờ thử lại).
    expect(FakeWebSocket.instances).toHaveLength(0)

    act(() => {
      window.localStorage.setItem('token', 'jwt-token')
      jest.advanceTimersByTime(1000)
    })

    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(current().url).toBe(
      `ws://${window.location.host}/api/calls/ws?token=jwt-token`,
    )

    act(() => current().open())
    expect(result.current.status).toBe('open')
  })

  it('không tạo socket trùng khi connect() gọi nhiều lần', () => {
    window.localStorage.setItem('token', 'jwt-token')
    const { result } = renderHook(() => useCallSocket())
    act(() => current().open())

    act(() => {
      result.current.connect()
      result.current.connect()
    })

    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('dispatch call:incoming tới subscriber', () => {
    window.localStorage.setItem('token', 'jwt-token')
    const { result } = renderHook(() => useCallSocket())
    act(() => current().open())

    const handler = jest.fn()
    act(() => {
      result.current.subscribe('call:incoming', handler)
      current().emit(
        JSON.stringify({
          type: 'call:incoming',
          payload: { call_id: 'c1', caller_id: 'u1', call_type: 'video' },
        }),
      )
    })

    expect(handler).toHaveBeenCalledWith({
      call_id: 'c1',
      caller_id: 'u1',
      call_type: 'video',
    })
  })

  it('tự reconnect sau khi server đóng kết nối', () => {
    window.localStorage.setItem('token', 'jwt-token')
    const { result } = renderHook(() => useCallSocket())
    act(() => current().open())

    act(() => current().serverClose())
    expect(result.current.status).toBe('closed')

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(FakeWebSocket.instances).toHaveLength(2)
  })

  it('close() chủ động thì không reconnect', () => {
    window.localStorage.setItem('token', 'jwt-token')
    const { result } = renderHook(() => useCallSocket())
    act(() => current().open())

    act(() => result.current.close())
    act(() => {
      jest.advanceTimersByTime(60000)
    })

    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('unmount dọn timer reconnect', () => {
    window.localStorage.setItem('token', 'jwt-token')
    const { unmount } = renderHook(() => useCallSocket())
    act(() => current().open())

    act(() => current().serverClose())
    unmount()
    act(() => {
      jest.advanceTimersByTime(60000)
    })

    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('send trả false khi chưa open, true và gửi JSON khi đã open', () => {
    window.localStorage.setItem('token', 'jwt-token')
    const { result } = renderHook(() => useCallSocket())

    expect(result.current.send('call:accept', { call_id: 'c1' })).toBe(false)

    act(() => current().open())
    expect(result.current.send('call:accept', { call_id: 'c1' })).toBe(true)
    expect(current().send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'call:accept', payload: { call_id: 'c1' } }),
    )
  })
})
