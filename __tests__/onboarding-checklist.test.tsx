import React from 'react'
import { SWRConfig } from 'swr'
import { renderWithProviders, screen, userEvent, waitFor, mockLocalStorage } from './test-utils'

jest.mock('@/api/package', () => ({
  getMySubscription: jest.fn(),
}))

jest.mock('@/api/partner', () => ({
  getMyAds: jest.fn(),
  getOverview: jest.fn(),
}))

import { getMySubscription } from '@/api/package'
import { getMyAds, getOverview } from '@/api/partner'
import OnboardingChecklist from '@/components/partner/OnboardingChecklist'
import type { AdOverview, PartnerAdListResponse, SubscriptionResponse } from '@/types'

const subscriptionMock = getMySubscription as jest.Mock
const adsMock = getMyAds as jest.Mock
const overviewMock = getOverview as jest.Mock

const subscription: SubscriptionResponse = {
  id: 'sub-1',
  package_id: 'p1',
  package_name: 'Gói Cơ bản',
  max_slots: 3,
  slots_used: 1,
  slots_left: 2,
  price_monthly: 100000,
  started_at: '2026-01-01T00:00:00Z',
  expires_at: '2026-12-31T00:00:00Z',
  status: 'active',
}

const adItem = {
  id: 'ad-1',
  title: 'Ad',
  content: '',
  format: 'image',
  target_url: 'https://linkup.vn',
  status: 'active',
  budget: 100000,
  daily_budget: 0,
  cpm_price: 1000,
  cpc_price: 100,
  max_impressions: 0,
  total_spent: 0,
  impressions: 0,
  clicks: 0,
  ctr: 0,
  media_uri: '',
  target_gender: 'all',
  target_age_min: 0,
  target_age_max: 100,
  target_locations: [],
  created_at: '2026-11-01T00:00:00Z',
}

function renderChecklist() {
  return renderWithProviders(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <OnboardingChecklist />
    </SWRConfig>,
  )
}

function completedCount(container: HTMLElement) {
  return container.querySelectorAll('[data-complete="true"]').length
}

beforeEach(() => {
  mockLocalStorage()
  subscriptionMock.mockReset()
  adsMock.mockReset()
  overviewMock.mockReset()
})

describe('OnboardingChecklist', () => {
  it('tick đủ 4 bước khi đã có gói, ad được duyệt và có impression', async () => {
    subscriptionMock.mockResolvedValue(subscription)
    adsMock.mockResolvedValue({ data: [adItem], total: 1, page: 1, page_size: 20 } as PartnerAdListResponse)
    overviewMock.mockResolvedValue({ impressions: 120 } as AdOverview)

    const { container } = renderChecklist()

    expect(await screen.findByText('Bắt đầu với quảng cáo')).toBeInTheDocument()
    await waitFor(() => expect(completedCount(container)).toBe(4))
    expect(screen.getByText('Hoàn thành 4/4 bước để chiến dịch đầu tiên chạy.')).toBeInTheDocument()
  })

  it('chưa có gói → chỉ CTA mua gói', async () => {
    subscriptionMock.mockRejectedValue(new Error('not subscribed'))
    adsMock.mockResolvedValue({ data: [], total: 0, page: 1, page_size: 20 } as PartnerAdListResponse)
    overviewMock.mockResolvedValue({ impressions: 0 } as AdOverview)

    const { container } = renderChecklist()

    const cta = await screen.findByRole('link', { name: 'Mua gói quảng cáo' })
    expect(cta).toHaveAttribute('href', '/packages')
    expect(completedCount(container)).toBe(0)
    expect(screen.queryByRole('link', { name: 'Tạo quảng cáo' })).not.toBeInTheDocument()
  })

  it('có gói nhưng chưa có ad → CTA tạo quảng cáo', async () => {
    subscriptionMock.mockResolvedValue(subscription)
    adsMock.mockResolvedValue({ data: [], total: 0, page: 1, page_size: 20 } as PartnerAdListResponse)
    overviewMock.mockResolvedValue({ impressions: 0 } as AdOverview)

    const { container } = renderChecklist()

    expect(await screen.findByRole('link', { name: 'Tạo quảng cáo' })).toHaveAttribute(
      'href',
      '/partner/ads/new',
    )
    expect(completedCount(container)).toBe(1)
  })

  it('dismiss lưu localStorage và ẩn checklist', async () => {
    subscriptionMock.mockResolvedValue(subscription)
    adsMock.mockResolvedValue({ data: [adItem], total: 1, page: 1, page_size: 20 } as PartnerAdListResponse)
    overviewMock.mockResolvedValue({ impressions: 10 } as AdOverview)

    renderChecklist()
    const user = userEvent.setup()

    await screen.findByText('Bắt đầu với quảng cáo')
    await user.click(screen.getByRole('button', { name: 'Ẩn checklist' }))

    expect(localStorage.getItem('onboarding-dismissed:v1')).toBe('1')
    await waitFor(() => expect(screen.queryByText('Bắt đầu với quảng cáo')).not.toBeInTheDocument())
  })
})
