import React from 'react'
import { SWRConfig } from 'swr'
import { renderWithProviders, screen, userEvent, waitFor, mockLocalStorage } from './test-utils'

jest.mock('@/api/package', () => ({
  getPackages: jest.fn(),
  getMySubscription: jest.fn(),
  createMoMoPayment: jest.fn(),
  createVNPayPayment: jest.fn(),
}))

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, isPartner: true, initializing: false }),
}))

jest.mock('@/lib/navigate', () => ({
  redirectToExternal: jest.fn(),
}))

import { createMoMoPayment, getMySubscription, getPackages } from '@/api/package'
import { redirectToExternal } from '@/lib/navigate'
import PackagesPage from '@/app/(user)/packages/page'
import type { AdPackage, SubscriptionResponse } from '@/types'

const packagesMock = getPackages as jest.Mock
const subscriptionMock = getMySubscription as jest.Mock
const paymentMock = createMoMoPayment as jest.Mock
const redirectMock = redirectToExternal as jest.Mock

function buildPackage(overrides: Partial<AdPackage>): AdPackage {
  return {
    id: 'p1',
    name: 'Gói Cơ bản',
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

const currentPackage = buildPackage({ id: 'p1', name: 'Gói Cơ bản' })
const otherPackage = buildPackage({ id: 'p2', name: 'Gói Nâng cao', price_monthly: 300000 })

const activeSub: SubscriptionResponse = {
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

function renderPage() {
  return renderWithProviders(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <PackagesPage />
    </SWRConfig>,
  )
}

beforeEach(() => {
  mockLocalStorage()
  packagesMock.mockReset()
  subscriptionMock.mockReset()
  paymentMock.mockReset()
  redirectMock.mockReset()

  packagesMock.mockResolvedValue([currentPackage, otherPackage])
  subscriptionMock.mockResolvedValue({ ...activeSub })
  paymentMock.mockResolvedValue({ payment_url: 'https://momo.test/pay', txn_ref: 't', amount: 1, expires_at: '' })
})

describe('PackagesPage — gói hiện tại', () => {
  it('chặn chọn gói đang dùng và CTA thanh toán bị disable', async () => {
    const user = userEvent.setup()
    renderPage()

    const currentButton = await screen.findByRole('button', { name: 'Gói hiện tại' })
    expect(currentButton).toBeDisabled()

    const pay = screen.getByRole('button', { name: 'Thanh toán ngay' })
    expect(pay).toBeDisabled()

    await user.click(currentButton)
    expect(pay).toBeDisabled()
    expect(paymentMock).not.toHaveBeenCalled()
  })

  it('vẫn chặn theo tên khi server cũ chưa trả package_id', async () => {
    subscriptionMock.mockResolvedValue({ ...activeSub, package_id: undefined })
    renderPage()

    expect(await screen.findByRole('button', { name: 'Gói hiện tại' })).toBeDisabled()
  })

  it('chọn gói khác được và gọi đúng API thanh toán', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Chọn gói' }))

    const pay = screen.getByRole('button', { name: 'Thanh toán ngay' })
    expect(pay).toBeEnabled()
    await user.click(pay)

    await waitFor(() => expect(paymentMock).toHaveBeenCalledWith('p2'))
    expect(redirectMock).toHaveBeenCalledWith('https://momo.test/pay')
  })
})
