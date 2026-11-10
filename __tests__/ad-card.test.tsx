import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import AdCard from '@/components/ads/AdCard'
import { trackAdAction } from '@/api/partner'
import type { FeedAd } from '@/api/partner'

jest.mock('@/api/partner', () => ({
  trackAdAction: jest.fn().mockResolvedValue({}),
}))

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

jest.mock('@/components/ReportModal', () => ({
  __esModule: true,
  default: () => null,
}))

const trackMock = trackAdAction as jest.Mock

let ioCallback: IntersectionObserverCallback | null = null

class MockIntersectionObserver {
  root = null
  rootMargin = ''
  thresholds: number[] = []
  constructor(cb: IntersectionObserverCallback) {
    ioCallback = cb
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

function imageAd(overrides: Partial<FeedAd> = {}): FeedAd {
  return {
    id: 'ad-1',
    title: 'Khuyến mãi',
    content: 'Nội dung',
    target_url: 'https://linkup.vn',
    format: 'image',
    media_list: [{ url: 'https://cdn/a.png', media_type: 'image' }],
    ...overrides,
  }
}

function triggerVisible(ratio = 0.8) {
  act(() => {
    ioCallback?.(
      [{ isIntersecting: true, intersectionRatio: ratio } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
  })
}

beforeEach(() => {
  jest.useFakeTimers()
  trackMock.mockClear()
  ioCallback = null
  ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    MockIntersectionObserver
})

afterEach(() => {
  jest.useRealTimers()
})

describe('AdCard impression', () => {
  it('chỉ tính impression sau khi card hiển thị ≥50% trong 1 giây', () => {
    render(<AdCard ad={imageAd()} />)

    expect(trackMock).not.toHaveBeenCalled()

    triggerVisible(0.3)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(trackMock).not.toHaveBeenCalled()

    triggerVisible(0.6)
    act(() => {
      jest.advanceTimersByTime(999)
    })
    expect(trackMock).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(trackMock).toHaveBeenCalledTimes(1)
    expect(trackMock).toHaveBeenCalledWith('ad-1', 'impression')
  })

  it('không tính impression lần hai khi card cuộn ra rồi vào lại', () => {
    render(<AdCard ad={imageAd()} />)
    triggerVisible()
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    triggerVisible()
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(trackMock).toHaveBeenCalledTimes(1)
  })
})

describe('AdCard preview', () => {
  it('không gửi tracking, ẩn báo cáo và CTA không phải link', () => {
    render(<AdCard ad={imageAd()} preview />)

    triggerVisible()
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(trackMock).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('ads.reportAd')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('ads.learnMore'))
    expect(trackMock).not.toHaveBeenCalled()
    expect(screen.getByText('ads.learnMore').tagName).not.toBe('A')
  })
})

describe('AdCard formats', () => {
  it('render video và track video_start/video_end đúng một lần', () => {
    const ad = imageAd({
      id: 'ad-video',
      format: 'video',
      media_list: [{ url: 'https://cdn/v.mp4', media_type: 'video' }],
    })
    render(<AdCard ad={ad} />)

    const video = screen.getByTestId('ad-video')
    fireEvent.play(video)
    fireEvent.play(video)
    fireEvent.ended(video)
    fireEvent.ended(video)

    expect(trackMock).toHaveBeenCalledWith('ad-video', 'video_start')
    expect(trackMock).toHaveBeenCalledWith('ad-video', 'video_end')
    expect(trackMock.mock.calls.filter((c) => c[1] === 'video_start')).toHaveLength(1)
    expect(trackMock.mock.calls.filter((c) => c[1] === 'video_end')).toHaveLength(1)
  })

  it('carousel chuyển slide được và track swipe', () => {
    const ad = imageAd({
      id: 'ad-carousel',
      format: 'carousel',
      media_list: [
        { url: 'https://cdn/1.png', media_type: 'image' },
        { url: 'https://cdn/2.png', media_type: 'image' },
      ],
    })
    render(<AdCard ad={ad} />)

    expect(screen.getByAltText('Khuyến mãi')).toHaveAttribute('src', 'https://cdn/1.png')

    fireEvent.click(screen.getByLabelText('ads.nextSlide'))
    expect(screen.getByAltText('Khuyến mãi')).toHaveAttribute('src', 'https://cdn/2.png')
    expect(trackMock).toHaveBeenCalledWith('ad-carousel', 'swipe')
  })

  it('track click khi bấm CTA', () => {
    render(<AdCard ad={imageAd({ id: 'ad-click' })} />)
    fireEvent.click(screen.getByText('ads.learnMore'))
    expect(trackMock).toHaveBeenCalledWith('ad-click', 'click')
  })
})
