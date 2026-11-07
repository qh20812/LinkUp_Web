import React from 'react'
import { SWRConfig } from 'swr'
import { renderWithProviders, screen, userEvent, waitFor, mockLocalStorage, within } from './test-utils'

jest.mock('@/api/partner', () => ({
  createAd: jest.fn(),
  trackAdAction: jest.fn().mockResolvedValue({}),
}))

jest.mock('@/api/swr', () => ({
  invalidate: jest.fn(),
}))

jest.mock('@/api/package', () => ({
  getMySubscription: jest.fn(),
}))

jest.mock('@/api/locations', () => ({
  getProvinces: jest.fn().mockResolvedValue({
    data: [
      { id: '01', name: { vi: 'Hà Nội', en: 'Hanoi' } },
      { id: '79', name: { vi: 'Hồ Chí Minh', en: 'Ho Chi Minh' } },
    ],
  }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}))

import { createAd } from '@/api/partner'
import { getMySubscription } from '@/api/package'
import AdForm from '@/components/AdForm'

const createAdMock = createAd as jest.Mock
const subscriptionMock = getMySubscription as jest.Mock

function renderWizard() {
  return renderWithProviders(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <AdForm heading="Tạo quảng cáo" submitLabel="Tạo quảng cáo" redirectTo="/partner/ads" wizard />
    </SWRConfig>,
  )
}

beforeEach(() => {
  mockLocalStorage()
  createAdMock.mockReset()
  createAdMock.mockResolvedValue({ message: 'ok', data: { id: 'ad-1' } })
  subscriptionMock.mockReset()
  subscriptionMock.mockResolvedValue({
    id: 'sub-1',
    package_name: 'Gói Cơ bản',
    max_slots: 3,
    slots_used: 1,
    slots_left: 2,
    price_monthly: 100000,
    started_at: '2026-01-01T00:00:00Z',
    expires_at: '2026-12-31T00:00:00Z',
    status: 'active',
  })
})

describe('AdForm wizard', () => {
  it('bắt đầu ở bước 1 và chỉ hiện phần nội dung', async () => {
    renderWizard()

    expect(await screen.findByText('Bước 1/4')).toBeInTheDocument()
    expect(await screen.findByLabelText(/^Tiêu đề/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Tổng ngân sách/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tạo quảng cáo' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeInTheDocument()
  })

  it('next/back giữ nguyên dữ liệu đã nhập', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.type(await screen.findByLabelText(/^Tiêu đề/), 'Khuyến mãi tháng 11')
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }))

    expect(await screen.findByText('Bước 2/4')).toBeInTheDocument()
    expect(screen.getByLabelText(/Tổng ngân sách/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quay lại' }))

    expect(await screen.findByText('Bước 1/4')).toBeInTheDocument()
    expect((screen.getByLabelText(/^Tiêu đề/) as HTMLInputElement).value).toBe('Khuyến mãi tháng 11')
  })

  it('ước tính hiện ở bước ngân sách', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.click(await screen.findByRole('button', { name: 'Tiếp tục' }))
    await user.type(await screen.findByLabelText(/Tổng ngân sách/i), '100000')

    expect(await screen.findByText(/4\.000 lượt hiển thị/)).toBeInTheDocument()
  })

  it('bước 4 tóm tắt, nhắc chờ duyệt và chỉ submit ở đây', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.type(await screen.findByLabelText(/^Tiêu đề/), 'Cà phê giảm giá')
    await user.type(screen.getByRole('textbox', { name: /Nội dung/i }), 'Mua 1 tặng 1')
    await user.type(screen.getByLabelText(/URL đích/i), 'https://linkup.vn/sale')
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }))

    await user.type(await screen.findByLabelText(/Tổng ngân sách/i), '100000')
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }))

    expect(await screen.findByText('Bước 3/4')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }))

    expect(await screen.findByText('Bước 4/4')).toBeInTheDocument()
    const review = screen.getByRole('heading', { name: 'Xem lại & gửi' }).closest('section') as HTMLElement
    expect(review).not.toBeNull()
    expect(within(review).getByText('Cà phê giảm giá')).toBeInTheDocument()
    expect(within(review).getByText(/chưa trừ tiền cho tới khi được duyệt/i)).toBeInTheDocument()
    expect(within(review).getByText(/4\.000 lượt hiển thị/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tạo quảng cáo' }))

    await waitFor(() => expect(createAdMock).toHaveBeenCalledTimes(1))
    expect(createAdMock.mock.calls[0][0]).toMatchObject({
      title: 'Cà phê giảm giá',
      budget: 100000,
      target_age_min: 0,
      target_age_max: 100,
    })
  })
})
