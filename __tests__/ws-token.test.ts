import { waitForToken } from '../utils/wsAuth'

describe('waitForToken', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    window.localStorage.clear()
  })

  afterEach(() => {
    jest.useRealTimers()
    window.localStorage.clear()
  })

  it('gọi ngay lập tức khi đã có token', () => {
    window.localStorage.setItem('token', 'jwt')
    const onReady = jest.fn()

    const cancel = waitForToken(onReady)

    expect(onReady).toHaveBeenCalledTimes(1)
    cancel()
  })

  it('chờ token xuất hiện rồi gọi đúng một lần', () => {
    const onReady = jest.fn()
    waitForToken(onReady, 1000)

    jest.advanceTimersByTime(3000)
    expect(onReady).not.toHaveBeenCalled()

    window.localStorage.setItem('token', 'jwt')
    jest.advanceTimersByTime(1000)
    expect(onReady).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(10000)
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it('cancel trước khi có token thì không gọi nữa', () => {
    const onReady = jest.fn()
    const cancel = waitForToken(onReady, 1000)

    cancel()
    window.localStorage.setItem('token', 'jwt')
    jest.advanceTimersByTime(5000)

    expect(onReady).not.toHaveBeenCalled()
  })
})
