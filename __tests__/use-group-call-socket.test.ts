import { act, renderHook } from '@testing-library/react'

import { useGroupCallSocket } from '../hooks/useGroupCallSocket'

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

describe('useGroupCallSocket', () => {
  const originalWebSocket = globalThis.WebSocket

  beforeEach(() => {
    jest.useFakeTimers()
    FakeWebSocket.instances = []
    ;(globalThis as unknown as Record<string, unknown>).WebSocket = FakeWebSocket
    window.localStorage.setItem('token', 'jwt-token')
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

  it('mở kết nối tới endpoint group-calls kèm token', () => {
    const { result } = renderHook(() => useGroupCallSocket())

    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(current().url).toBe(
      `ws://${window.location.host}/api/group-calls/ws?token=jwt-token`,
    )
    expect(result.current.status).toBe('connecting')

    act(() => current().open())
    expect(result.current.status).toBe('open')
  })

  it('dispatch message đã parse tới đúng subscriber', () => {
    const { result } = renderHook(() => useGroupCallSocket())
    act(() => current().open())

    const handler = jest.fn()
    act(() => {
      result.current.subscribe('group:call:joined', handler)
    })

    act(() => {
      current().emit(
        JSON.stringify({
          type: 'group:call:joined',
          payload: { call_id: 'c1', user_id: 'u1' },
        }),
      )
    })

    expect(handler).toHaveBeenCalledWith({ call_id: 'c1', user_id: 'u1' })
  })

  it('hỗ trợ frame cũ dùng field data thay vì payload', () => {
    const { result } = renderHook(() => useGroupCallSocket())
    act(() => current().open())

    const handler = jest.fn()
    act(() => {
      result.current.subscribe('group:call:left', handler)
      current().emit(JSON.stringify({ type: 'group:call:left', data: { user_id: 'u2' } }))
    })

    expect(handler).toHaveBeenCalledWith({ user_id: 'u2' })
  })

  it('bỏ qua frame hỏng mà không làm sập socket', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useGroupCallSocket())
    act(() => current().open())

    const handler = jest.fn()
    act(() => {
      result.current.subscribe('group:call:joined', handler)
      current().emit('không-phải-json')
      current().emit(JSON.stringify({ payload: {} }))
    })

    expect(handler).not.toHaveBeenCalled()
    expect(result.current.status).toBe('open')
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('gọi connect() lần hai không tạo socket trùng', () => {
    const { result } = renderHook(() => useGroupCallSocket())
    act(() => current().open())

    act(() => {
      result.current.connect()
      result.current.connect()
    })

    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('tự reconnect với backoff sau khi server đóng kết nối', () => {
    const { result } = renderHook(() => useGroupCallSocket())
    act(() => current().open())

    act(() => current().serverClose())
    expect(result.current.status).toBe('closed')
    expect(FakeWebSocket.instances).toHaveLength(1)

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(FakeWebSocket.instances).toHaveLength(2)

    act(() => current().serverClose())
    act(() => {
      jest.advanceTimersByTime(1999)
    })
    expect(FakeWebSocket.instances).toHaveLength(2)

    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(FakeWebSocket.instances).toHaveLength(3)
  })

  it('close() do người dùng chủ động thì không reconnect', () => {
    const { result } = renderHook(() => useGroupCallSocket())
    act(() => current().open())

    act(() => result.current.close())
    act(() => {
      jest.advanceTimersByTime(60000)
    })

    expect(result.current.status).toBe('closed')
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('unmount dọn timer reconnect (không tạo socket "ma")', () => {
    const { unmount } = renderHook(() => useGroupCallSocket())
    act(() => current().open())

    act(() => current().serverClose())
    unmount()
    act(() => {
      jest.advanceTimersByTime(60000)
    })

    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('send trả false khi chưa mở, true và gửi JSON khi đã mở', () => {
    const { result } = renderHook(() => useGroupCallSocket())
    expect(result.current.send('group:call:end', { call_id: 'c1' })).toBe(false)

    act(() => current().open())
    expect(result.current.send('group:call:end', { call_id: 'c1' })).toBe(true)

    expect(current().send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'group:call:end', payload: { call_id: 'c1' } }),
    )
  })
})
