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
  newPaymentRequestId: jest.fn(() => 'req-test'),
}))

jest.mock('@/api/wallet', () => ({
  getWallet: jest.fn(),
}))

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, isPartner: true, initializing: false }),
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
import PackagesPage from '@/app/(user)/packages/page'
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

const wallet: WalletResponse = {
  balance: 1000000,
  reserved: 0,
  available: 1000000,
  currency: 'VND',
  total_topup: 1000000,
  total_spent: 0,
}

const methods: PaymentMethodsResponse = {
  methods: [
    { key: 'wallet', enabled: true },
    { key: 'momo', enabled: true },
    { key: 'vnpay', enabled: true },
  ],
  default: 'wallet',
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
  methodsMock.mockReset()
  walletMock.mockReset()
  paymentMock.mockReset()
  walletPaymentMock.mockReset()
  redirectMock.mockReset()

  packagesMock.mockResolvedValue([currentPackage, otherPackage])
  subscriptionMock.mockResolvedValue({ ...activeSub })
  methodsMock.mockResolvedValue(methods)
  walletMock.mockResolvedValue({ ...wallet })
  paymentMock.mockResolvedValue({ payment_url: 'https://momo.test/pay', txn_ref: 't', amount: 1, expires_at: '' })
  walletPaymentMock.mockResolvedValue({
    message: 'ok',
    data: { subscription: activeSub, payment: { id: 'txn-1' }, replayed: false },
    tokens: { access_token: 'new-token', refresh_token: 'new-refresh' },
  })
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

  it('chọn gói khác rồi thanh toán qua MoMo gọi đúng API', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Chọn gói' }))
    await user.click(await screen.findByRole('radio', { name: /MoMo/ }))

    const pay = screen.getByRole('button', { name: 'Thanh toán ngay' })
    await waitFor(() => expect(pay).toBeEnabled())
    await user.click(pay)

    await waitFor(() => expect(paymentMock).toHaveBeenCalledWith('p2'))
    expect(redirectMock).toHaveBeenCalledWith('https://momo.test/pay')
  })

  it('ví là mặc định: mở xác nhận, gọi API ví và lưu token mới', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Chọn gói' }))

    const pay = screen.getByRole('button', { name: 'Thanh toán ngay' })
    await waitFor(() => expect(pay).toBeEnabled())
    await user.click(pay)

    // Modal xác nhận hiện số dư khả dụng trước khi trừ tiền.
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('1.000.000 ₫')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Thanh toán' }))

    await waitFor(() =>
      expect(walletPaymentMock).toHaveBeenCalledWith('p2', 'req-test'),
    )
    expect(localStorage.getItem('token')).toBe('new-token')
  })

  it('chặn thanh toán khi số dư ví không đủ giá gói', async () => {
    walletMock.mockResolvedValue({ ...wallet, balance: 50000, available: 50000 })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Chọn gói' }))

    const pay = screen.getByRole('button', { name: 'Thanh toán ngay' })
    await waitFor(() => expect(pay).toBeDisabled())
    expect(screen.getAllByText(/250.000/).length).toBeGreaterThan(0)
  })
})
