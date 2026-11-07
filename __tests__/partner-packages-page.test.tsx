import React from 'react'
import { SWRConfig } from 'swr'
import { renderWithProviders, screen, userEvent, waitFor, mockLocalStorage } from './test-utils'

jest.mock('@/api/package', () => ({
  getPackages: jest.fn(),
  getMySubscription: jest.fn(),
  createMoMoPayment: jest.fn(),
}))

jest.mock('@/lib/navigate', () => ({
  redirectToExternal: jest.fn(),
}))

import { createMoMoPayment, getMySubscription, getPackages } from '@/api/package'
import { redirectToExternal } from '@/lib/navigate'
import PartnerPackagesPage from '@/app/partner/packages/page'
import type { AdPackage, SubscriptionResponse } from '@/types'

const packagesMock = getPackages as jest.Mock
const subscriptionMock = getMySubscription as jest.Mock
const paymentMock = createMoMoPayment as jest.Mock
const redirectMock = redirectToExternal as jest.Mock

function buildPackage(overrides: Partial<AdPackage>): AdPackage {
  return {
    id: 'p1',
    name: 'Gói A',
    description: 'Mô tả',
    price_monthly: 100000,
    max_slots: 3,
    max_duration_days: 30,
    supports_video: false,
    supports_carousel: false,
    has_advanced_analytics: false,
    sort_order: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const sub: SubscriptionResponse = {
  id: 'sub-1',
  package_id: 'p1',
  package_name: 'Gói A',
  max_slots: 3,
  slots_used: 1,
  slots_left: 2,
  price_monthly: 100000,
  started_at: '2026-01-01T00:00:00Z',
  expires_at: '2026-12-31T00:00:00Z',
  status: 'active',
}

function renderPage() {
  return renderWithProviders(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <PartnerPackagesPage />
    </SWRConfig>,
  )
}

beforeEach(() => {
  mockLocalStorage()
  packagesMock.mockReset()
  subscriptionMock.mockReset()
  paymentMock.mockReset()
  redirectMock.mockReset()

  // Hai gói trùng tên để chứng minh việc so khớp theo package_id, không theo name.
  packagesMock.mockResolvedValue([
    buildPackage({ id: 'p1', name: 'Gói A' }),
    buildPackage({ id: 'p2', name: 'Gói A', price_monthly: 300000 }),
  ])
  subscriptionMock.mockResolvedValue({ ...sub })
  paymentMock.mockResolvedValue({ payment_url: 'https://momo.test/pay', txn_ref: 't', amount: 1, expires_at: '' })
})

describe('PartnerPackagesPage — gói hiện tại', () => {
  it('chỉ disable đúng gói có package_id trùng, kể cả khi trùng tên', async () => {
    renderPage()

    const current = await screen.findByRole('button', { name: 'Đã đăng ký' })
    expect(current).toBeDisabled()

    // Gói còn lại cùng tên nhưng khác id vẫn mua được.
    expect(screen.getByRole('button', { name: 'Thanh toán ngay' })).toBeEnabled()
  })

  it('thanh toán gói khác gọi API với đúng id', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Thanh toán ngay' }))

    await waitFor(() => expect(paymentMock).toHaveBeenCalledWith('p2'))
    expect(redirectMock).toHaveBeenCalledWith('https://momo.test/pay')
  })
})
