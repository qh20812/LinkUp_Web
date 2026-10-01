import React from 'react'
import { renderWithProviders, screen, act } from './test-utils'
import VideoPlayer from '@/components/VideoPlayer'

type IOCallback = (entries: [{ isIntersecting: boolean }]) => void

describe('VideoPlayer auto-pause on scroll', () => {
  let ioCallback: IOCallback | null = null
  let observeSpy: jest.SpyInstance
  let disconnectSpy: jest.Mock
  let playMock: jest.Mock
  let pauseMock: jest.Mock
  let pausedState = true

  beforeEach(() => {
    ioCallback = null
    pausedState = true
    disconnectSpy = jest.fn()

    // jsdom không có IntersectionObserver — gán stub capture callback.
    observeSpy = jest.fn() as unknown as jest.SpyInstance
    const MockIO = class {
      observe = observeSpy
      unobserve = jest.fn()
      disconnect = disconnectSpy
      constructor(cb: IOCallback) {
        ioCallback = cb
      }
    }
    ;(window as unknown as Record<string, unknown>).IntersectionObserver = MockIO

    playMock = jest.fn(() => {
      pausedState = false
      return Promise.resolve()
    })
    pauseMock = jest.fn(() => {
      pausedState = true
    })
    jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(playMock)
    jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(pauseMock)
    // `paused` is a read-only getter on HTMLMediaElement — back it with local state.
    jest
      .spyOn(window.HTMLMediaElement.prototype, 'paused', 'get')
      .mockImplementation(() => pausedState)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  function setIntersecting(value: boolean) {
    expect(ioCallback).not.toBeNull()
    act(() => {
      ioCallback!([{ isIntersecting: value }])
    })
  }

  it('registers an IntersectionObserver on mount and disconnects on unmount', () => {
    const { unmount } = renderWithProviders(<VideoPlayer src="https://example.com/v.mp4" />)
    expect(observeSpy).toHaveBeenCalled()
    unmount()
    expect(disconnectSpy).toHaveBeenCalled()
  })

  it('pauses the video when scrolled out of view', () => {
    renderWithProviders(<VideoPlayer src="https://example.com/v.mp4" />)
    // Simulate a playing video that scrolls out of view (<50% visible).
    pausedState = false
    pauseMock.mockClear()
    setIntersecting(false)
    expect(pauseMock).toHaveBeenCalled()
  })

  it('resumes the video when scrolled back into view (no manual pause)', () => {
    renderWithProviders(<VideoPlayer src="https://example.com/v.mp4" />)
    pausedState = false
    setIntersecting(false)
    playMock.mockClear()
    pausedState = true // observer paused it
    setIntersecting(true)
    expect(playMock).toHaveBeenCalled()
  })

  it('does NOT resume when the user paused manually', async () => {
    renderWithProviders(<VideoPlayer src="https://example.com/v.mp4" />)

    // Simulate user pressing play first (clears manual-pause flag), then pause.
    const playBtn = await screen.findByRole('button', { name: /phát|play/i })
    pausedState = true
    act(() => {
      playBtn.click()
    })
    expect(playMock).toHaveBeenCalled()

    const pauseBtn = await screen.findByRole('button', { name: /tạm dừng|pause/i })
    pausedState = false
    act(() => {
      pauseBtn.click()
    })
    expect(pauseMock).toHaveBeenCalled()

    // Scroll out and back in → must stay paused (no auto-resume).
    playMock.mockClear()
    pausedState = true
    setIntersecting(false)
    setIntersecting(true)
    expect(playMock).not.toHaveBeenCalled()
  })
})
