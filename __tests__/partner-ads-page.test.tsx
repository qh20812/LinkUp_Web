import React from 'react'
import { SWRConfig } from 'swr'
import { renderWithProviders, screen, mockLocalStorage } from './test-utils'

jest.mock('@/api/swr', () => ({
  swrFetcher: jest.fn(),
  invalidate: jest.fn(),
}))

jest.mock('@/api/package', () => ({
  getMySubscription: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@/components/AdAnalyticsModal', () => () => null)

import { swrFetcher } from '@/api/swr'
import { getMySubscription } from '@/api/package'
import PartnerAdsPage from '@/app/partner/ads/page'
import type { PartnerAdListItem } from '@/types'

const fetcherMock = swrFetcher as jest.Mock
const subscriptionMock = getMySubscription as jest.Mock

const longTitle = 'Chiến dịch khuyến mãi mùa lễ hội với tiêu đề rất rất dài để kiểm tra cột'

function buildAd(overrides: Partial<PartnerAdListItem> = {}): PartnerAdListItem {
  return {
    id: 'ad-1',
    title: longTitle,
    content: 'Nội dung',
    format: 'image',
    target_url: 'https://linkup.vn/sale',
    status: 'active',
    budget: 1000000,
    daily_budget: 0,
    cpm_price: 25000,
    cpc_price: 1000,
    max_impressions: 0,
    total_spent: 0,
    impressions: 1000,
    clicks: 10,
    ctr: 1,
    media_uri: 'https://cdn.test/ad.jpg',
    target_gender: 'all',
    target_age_min: 0,
    target_age_max: 100,
    target_locations: [],
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function renderPage() {
  return renderWithProviders(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <PartnerAdsPage />
    </SWRConfig>,
  )
}

beforeEach(() => {
  mockLocalStorage()
  fetcherMock.mockReset()
  subscriptionMock.mockReset()
  fetcherMock.mockResolvedValue({ data: [buildAd()], total: 1, page: 1, page_size: 20 })
  subscriptionMock.mockResolvedValue({})
})

describe('PartnerAdsPage — cột tiêu đề', () => {
  it('giữ tiêu đề dài trong cột và cho hover xem đầy đủ', async () => {
    renderPage()

    const title = await screen.findByText(longTitle)
    expect(title).toHaveAttribute('title', longTitle)
    // Các cột khác vẫn render bình thường, không bị tiêu đề đẩy mất.
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('1.0%')).toBeInTheDocument()
  })
})
