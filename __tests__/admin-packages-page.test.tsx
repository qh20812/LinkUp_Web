import React from 'react'
import { SWRConfig } from 'swr'
import { renderWithProviders, screen, userEvent, waitFor, mockLocalStorage } from './test-utils'

jest.mock('@/api/swr', () => ({
  swrFetcher: jest.fn(),
}))

jest.mock('@/api/admin', () => ({
  createAdminPackage: jest.fn(),
  updateAdminPackage: jest.fn(),
}))

import { swrFetcher } from '@/api/swr'
import { createAdminPackage } from '@/api/admin'
import AdminPackagesPage from '@/app/admin/packages/page'
import type { AdPackage } from '@/types'

const fetcherMock = swrFetcher as jest.Mock
const createMock = createAdminPackage as jest.Mock

function buildPackage(overrides: Partial<AdPackage> = {}): AdPackage {
  return {
    id: 'pkg-1',
    name: 'Gói A',
    description: 'Mô tả',
    price_monthly: 99000,
    max_slots: 1,
    max_duration_days: 30,
    supports_video: false,
    supports_carousel: false,
    has_advanced_analytics: false,
    sort_order: 1,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function renderPage() {
  return renderWithProviders(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <AdminPackagesPage />
    </SWRConfig>,
  )
}

beforeEach(() => {
  mockLocalStorage()
  fetcherMock.mockReset()
  createMock.mockReset()
  fetcherMock.mockResolvedValue({
    data: [
      buildPackage({
        id: 'pkg-1',
        name: 'Tăng Trưởng',
        supports_video: true,
        supports_carousel: true,
      }),
      buildPackage({ id: 'pkg-2', name: 'Khởi Đầu' }),
    ],
  })
  createMock.mockResolvedValue({})
})

describe('AdminPackagesPage', () => {
  it('render cột Tính năng bằng pill và không phá layout bảng', async () => {
    renderPage()

    expect(await screen.findByText('Tăng Trưởng')).toBeInTheDocument()
    expect(screen.getAllByText('Video').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Carousel').length).toBeGreaterThan(0)
    // Gói không có tính năng nào hiển thị dấu gạch, không để ô trống.
    expect(screen.getByText('—')).toBeInTheDocument()
    // Đủ 7 cột header, tất cả là table-cell (không bị flex ghi đè).
    expect(screen.getAllByRole('columnheader')).toHaveLength(7)
  })

  it('validate tên và số slot trước khi gọi API', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Tạo gói' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    const save = screen.getByRole('button', { name: 'Lưu gói' })
    expect(save).toBeDisabled()

    await user.type(screen.getByLabelText(/Tên gói/i), 'Gói Mới')
    expect(save).toBeEnabled()

    const slots = screen.getByLabelText(/Số slot/i)
    await user.clear(slots)
    await user.type(slots, '0')
    expect(await screen.findByText('Số slot phải từ 1 đến 50.')).toBeInTheDocument()
    expect(save).toBeDisabled()

    await user.clear(slots)
    await user.type(slots, '3')
    await user.click(save)

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1))
    expect(createMock.mock.calls[0][0]).toMatchObject({
      name: 'Gói Mới',
      max_slots: 3,
      max_duration_days: 30,
      price_monthly: 0,
      is_active: true,
    })
  })

  it('format giá gói khi nhập và gửi số nguyên', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Tạo gói' }))
    await user.type(screen.getByLabelText(/Tên gói/i), 'Gói Định Dạng')

    const price = screen.getByLabelText(/Giá\/tháng/i)
    await user.type(price, '99000')
    expect(price).toHaveValue('99.000')
    expect(screen.getByText('Bằng chữ: Chín mươi chín nghìn đồng')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Lưu gói' }))

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1))
    expect(createMock.mock.calls[0][0]).toMatchObject({
      name: 'Gói Định Dạng',
      price_monthly: 99000,
    })
  })
})
