import React from 'react'
import { renderWithProviders, screen, userEvent, waitFor, mockLocalStorage } from './test-utils'

jest.mock('@/api/partner', () => ({
  createAd: jest.fn(),
}))

jest.mock('@/api/swr', () => ({
  invalidate: jest.fn(),
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
import AdForm from '@/components/AdForm'

const createAdMock = createAd as jest.Mock

function renderForm() {
  return renderWithProviders(
    <AdForm heading="Tạo quảng cáo" submitLabel="Tạo quảng cáo" redirectTo="/partner/ads" />,
  )
}

/**
 * Locale được load bằng dynamic import trong LanguageProvider nên phải chờ
 * bản dịch có mặt trước khi query theo label.
 */
async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/Tiêu đề/i), 'Khuyến mãi tháng 11')
  await user.type(await screen.findByRole('textbox', { name: /Nội dung/i }), 'Giảm 50% cho thành viên mới')
  await user.type(await screen.findByLabelText(/URL đích/i), 'https://linkup.vn/sale')
  await user.type(await screen.findByLabelText(/Tổng ngân sách/i), '100000')
}

beforeEach(() => {
  mockLocalStorage()
  createAdMock.mockReset()
  createAdMock.mockResolvedValue({ message: 'ok', data: { id: 'ad-1' } })
})

describe('AdForm', () => {
  it('render đầy đủ các trường bắt buộc', async () => {
    renderForm()

    expect(screen.getByRole('heading', { name: 'Tạo quảng cáo' })).toBeInTheDocument()
    expect(await screen.findByLabelText(/Tiêu đề/i)).toBeInTheDocument()
    expect(await screen.findByRole('textbox', { name: /Nội dung/i })).toBeInTheDocument()
    expect(await screen.findByLabelText(/URL đích/i)).toBeInTheDocument()
    expect(await screen.findByLabelText(/Tổng ngân sách/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tạo quảng cáo' })).toBeInTheDocument()
  })

  it('không gọi API khi thiếu trường bắt buộc', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Tạo quảng cáo' }))

    expect(createAdMock).not.toHaveBeenCalled()
  })

  it('gửi payload đúng kiểu dữ liệu khi submit', async () => {
    const user = userEvent.setup()
    renderForm()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Tạo quảng cáo' }))

    await waitFor(() => expect(createAdMock).toHaveBeenCalledTimes(1))

    const [payload, file] = createAdMock.mock.calls[0]
    expect(payload).toMatchObject({
      title: 'Khuyến mãi tháng 11',
      content: 'Giảm 50% cho thành viên mới',
      target_url: 'https://linkup.vn/sale',
      budget: 100000,
      format: 'image',
      target_gender: 'all',
      target_age_min: 0,
      target_age_max: 100,
    })
    expect(typeof payload.budget).toBe('number')
    expect(payload).not.toHaveProperty('media')
    expect(file).toBeUndefined()
  })

  it('gửi province ID khi chọn địa điểm', async () => {
    const user = userEvent.setup()
    renderForm()

    await fillRequiredFields(user)
    await user.click(await screen.findByRole('checkbox', { name: 'Hà Nội' }))
    await user.click(screen.getByRole('button', { name: 'Tạo quảng cáo' }))

    await waitFor(() => expect(createAdMock).toHaveBeenCalledTimes(1))
    const [payload] = createAdMock.mock.calls[0]
    expect(payload.target_locations).toEqual(['01'])
  })

  it('hiển thị khối chuẩn bị, section và hint cho người mới', async () => {
    renderForm()

    expect(await screen.findByText('Cần chuẩn bị gì?')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ngân sách & giá thầu' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nhắm mục tiêu' })).toBeInTheDocument()
    expect(await screen.findByText(/Tổng tiền tối đa cho cả chiến dịch/i)).toBeInTheDocument()
  })

  it('điền sẵn defaults an toàn và giữ trường kỹ thuật trong Tùy chọn nâng cao', async () => {
    renderForm()

    const summary = await screen.findByText('Tùy chọn nâng cao (có thể bỏ qua)')
    const advanced = summary.closest('details') as HTMLDetailsElement | null
    expect(advanced).not.toBeNull()
    expect(advanced?.open).toBe(false)

    const cpm = screen.getByLabelText('Giá mỗi 1.000 lượt hiển thị (CPM)') as HTMLInputElement
    const cpc = screen.getByLabelText('Giá mỗi click (CPC)') as HTMLInputElement
    expect(cpm.value).toBe('25000')
    expect(cpc.value).toBe('1000')
    expect(cpm.closest('details')).toBe(advanced)

    const budget = screen.getByLabelText(/Tổng ngân sách/i) as HTMLInputElement
    expect(budget.value).toBe('')
    expect((screen.getByLabelText('Từ') as HTMLInputElement).value).toBe('0')
    expect((screen.getByLabelText('Đến') as HTMLInputElement).value).toBe('100')
  })

  it('hiện toast thành công sau khi tạo', async () => {
    const user = userEvent.setup()
    renderForm()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Tạo quảng cáo' }))

    expect(await screen.findByText('Tạo quảng cáo thành công!')).toBeInTheDocument()
  })

  it('hiện lỗi từ server khi tạo thất bại', async () => {
    createAdMock.mockRejectedValue(new Error('tiêu đề không được để trống'))
    const user = userEvent.setup()
    renderForm()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Tạo quảng cáo' }))

    expect(await screen.findByText('tiêu đề không được để trống')).toBeInTheDocument()
  })
})
