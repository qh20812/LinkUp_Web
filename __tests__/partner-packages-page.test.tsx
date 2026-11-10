import React from 'react'
import { SWRConfig } from 'swr'
import { renderWithProviders, screen, userEvent, waitFor, mockLocalStorage } from './test-utils'

jest.mock('@/api/package', () => ({
  getPackages: jest.fn(),
  getMySubscription: jest.fn(),
  getPaymentMethods: jest.fn(),
  createMoMoPayment: jest.fn(),
  createVNPayPayment: jest.fn(),
  createWalletPayment: jest.fn(),
  newPaymentRequestId: jest.fn(() => 'req-partner'),
}))

jest.mock('@/api/wallet', () => ({
  getWallet: jest.fn(),
}))

jest.mock('@/lib/navigate', () => ({
  redirectToExternal: jest.fn(),
}))

import {
  createMoMoPayment,
  createWalletPayment,
  getMySubscription,
  getPackages,
  getPaymentMethods,
} from '@/api/package'
import { getWallet } from '@/api/wallet'
import { redirectToExternal } from '@/lib/navigate'
import PartnerPackagesPage from '@/app/partner/packages/page'
import type { AdPackage, PaymentMethodsResponse, SubscriptionResponse, WalletResponse } from '@/types'

const packagesMock = getPackages as jest.Mock
const subscriptionMock = getMySubscription as jest.Mock
const methodsMock = getPaymentMethods as jest.Mock
const walletMock = getWallet as jest.Mock
const paymentMock = createMoMoPayment as jest.Mock
const walletPaymentMock = createWalletPayment as jest.Mock
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

const wallet: WalletResponse = {
  balance: 1000000,
  reserved: 0,
  available: 1000000,
  currency: 'VND',
  total_topup: 1000000,
  total_spent: 0,
}

const momoMethods: PaymentMethodsResponse = {
  methods: [
    { key: 'wallet', enabled: false },
    { key: 'momo', enabled: true },
  ],
  default: 'momo',
}

const walletMethods: PaymentMethodsResponse = {
  methods: [{ key: 'wallet', enabled: true }],
  default: 'wallet',
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
  methodsMock.mockReset()
  walletMock.mockReset()
  paymentMock.mockReset()
  walletPaymentMock.mockReset()
  redirectMock.mockReset()

  // Hai gói trùng tên để chứng minh việc so khớp theo package_id, không theo name.
  packagesMock.mockResolvedValue([
    buildPackage({ id: 'p1', name: 'Gói A' }),
    buildPackage({ id: 'p2', name: 'Gói A', price_monthly: 300000 }),
  ])
  subscriptionMock.mockResolvedValue({ ...sub })
  methodsMock.mockResolvedValue(momoMethods)
  walletMock.mockResolvedValue({ ...wallet })
  paymentMock.mockResolvedValue({ payment_url: 'https://momo.test/pay', txn_ref: 't', amount: 1, expires_at: '' })
  walletPaymentMock.mockResolvedValue({
    message: 'ok',
    data: { subscription: sub, payment: { id: 'txn-1' }, replayed: false },
    tokens: { access_token: 'partner-token', refresh_token: 'partner-refresh' },
  })
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

  it('ví trả trước: mở xác nhận rồi kích hoạt gói, lưu token mới', async () => {
    methodsMock.mockResolvedValue(walletMethods)
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Thanh toán ngay' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Thanh toán' }))

    await waitFor(() => expect(walletPaymentMock).toHaveBeenCalledWith('p2', 'req-partner'))
    expect(localStorage.getItem('token')).toBe('partner-token')
  })

  it('disable nút mua và hiện số tiền còn thiếu khi ví không đủ', async () => {
    methodsMock.mockResolvedValue(walletMethods)
    walletMock.mockResolvedValue({ ...wallet, balance: 100000, available: 100000 })
    renderPage()

    const pay = await screen.findByRole('button', { name: 'Thanh toán ngay' })
    await waitFor(() => expect(pay).toBeDisabled())
    expect(screen.getByText(/200.000/)).toBeInTheDocument()
  })
})
