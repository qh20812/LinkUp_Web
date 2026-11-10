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

// Ví trả trước: cho sẵn số dư lớn để test tạo ad không bị chặn ngân sách.
jest.mock('@/api/wallet', () => ({
  getWallet: jest.fn().mockResolvedValue({
    balance: 10_000_000,
    reserved: 0,
    available: 10_000_000,
    currency: 'VND',
    total_topup: 0,
    total_spent: 0,
  }),
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

import { createAd, trackAdAction } from '@/api/partner'
import { getMySubscription } from '@/api/package'
import { ApiError } from '@/api/api'
import { saveAdDraft } from '@/lib/ad-draft'
import AdForm, { type AdFormProps } from '@/components/AdForm'
import type { SubscriptionResponse } from '@/types'

const createAdMock = createAd as jest.Mock
const trackAdMock = trackAdAction as jest.Mock
const subscriptionMock = getMySubscription as jest.Mock

const activeSubscription: SubscriptionResponse = {
  id: 'sub-1',
  package_name: 'Gói Cơ bản',
  max_slots: 3,
  slots_used: 1,
  slots_left: 2,
  price_monthly: 100000,
  started_at: '2026-01-01T00:00:00Z',
  expires_at: '2026-12-31T00:00:00Z',
  status: 'active',
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

/** Mỗi test dùng SWR cache riêng để trạng thái gói không rò giữa các case. */
function renderForm(props: Partial<AdFormProps> = {}) {
  return renderWithProviders(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <AdForm heading="Tạo quảng cáo" submitLabel="Tạo quảng cáo" redirectTo="/partner/ads" {...props} />
    </SWRConfig>,
  )
}

beforeEach(() => {
  mockLocalStorage()
  createAdMock.mockReset()
  createAdMock.mockResolvedValue({ message: 'ok', data: { id: 'ad-1' } })
  trackAdMock.mockClear()
  subscriptionMock.mockReset()
  subscriptionMock.mockResolvedValue({ ...activeSubscription })
  // jsdom không có object URL cho preview media.
  Object.defineProperty(URL, 'createObjectURL', { value: jest.fn(() => 'blob:preview'), configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: jest.fn(), configurable: true })
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

    await user.click(await screen.findByRole('button', { name: 'Tạo quảng cáo' }))

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
    expect(screen.getByRole('group', { name: 'Ngân sách & giá thầu' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Nhắm mục tiêu' })).toBeInTheDocument()
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

  it('có nút trợ giúp cho 4 khái niệm nâng cao', async () => {
    renderForm()
    await screen.findByText('Tùy chọn nâng cao (có thể bỏ qua)')

    const helpButtons = document.querySelectorAll('button[aria-label^="Giải thích"]')
    expect(helpButtons).toHaveLength(4)
  })

  it('hiện preview cập nhật theo nội dung và không gửi tracking', async () => {
    const user = userEvent.setup()
    renderForm()

    const card = await screen.findByTestId('ad-card')
    expect(card).toHaveAttribute('data-preview', 'true')
    expect(screen.getByText('Tiêu đề quảng cáo của bạn')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^Tiêu đề/), 'Cà phê giảm giá')
    await user.type(screen.getByRole('textbox', { name: /Nội dung/i }), 'Mua 1 tặng 1')

    await waitFor(() => expect(within(card).getByText('Cà phê giảm giá')).toBeInTheDocument())
    expect(within(card).getByText('Mua 1 tặng 1')).toBeInTheDocument()
    // Preview không được bắn impression/click dù card render.
    expect(trackAdMock).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Báo cáo quảng cáo')).not.toBeInTheDocument()
  })

  it('ước tính lượt hiển thị từ ngân sách và CPM', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(await screen.findByLabelText(/Tổng ngân sách/i), '100000')

    expect(await screen.findByText(/4\.000 lượt hiển thị/)).toBeInTheDocument()
  })

  it('chặn form và mời mua gói khi partner chưa có gói', async () => {
    subscriptionMock.mockRejectedValueOnce(
      new ApiError('Bạn chưa đăng ký gói quảng cáo nào', 'package.NOT_SUBSCRIBED', 404),
    )
    renderForm()

    expect(await screen.findByText('Bạn cần gói đang hoạt động để tạo quảng cáo')).toBeInTheDocument()
    const cta = screen.getByRole('link', { name: 'Mua gói ngay' })
    expect(cta).toHaveAttribute('href', '/packages')
    expect(screen.queryByRole('button', { name: 'Tạo quảng cáo' })).not.toBeInTheDocument()
  })

  it('chặn form khi gói đã dùng hết slot', async () => {
    subscriptionMock.mockResolvedValueOnce({ ...activeSubscription, slots_left: 0, slots_used: 3 })
    renderForm()

    expect(await screen.findByText('Gói của bạn đã dùng hết slot')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tạo quảng cáo' })).not.toBeInTheDocument()
  })

  it('admin tạo hộ không kiểm tra gói và thấy form ngay', async () => {
    renderForm({ requireSubscription: false })

    expect(await screen.findByLabelText(/Tổng ngân sách/i)).toBeInTheDocument()
    expect(subscriptionMock).not.toHaveBeenCalled()
  })

  it('cảnh báo mềm khi chưa chọn media', async () => {
    const user = userEvent.setup()
    renderForm()

    expect(await screen.findByText('Nên thêm ảnh/video để quảng cáo nổi bật hơn.')).toBeInTheDocument()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, new File(['x'], 'a.png', { type: 'image/png' }))

    await waitFor(() =>
      expect(screen.queryByText('Nên thêm ảnh/video để quảng cáo nổi bật hơn.')).not.toBeInTheDocument(),
    )
  })

  it('hiện lỗi gói/slot ngay trong form kèm link nâng cấp', async () => {
    createAdMock.mockRejectedValue(
      new ApiError('Bạn đã dùng hết 3/3 slot. Vui lòng nâng cấp gói', 'ad.SLOTS_EXHAUSTED', 400),
    )
    const user = userEvent.setup()
    renderForm()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Tạo quảng cáo' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Bạn đã dùng hết 3/3 slot')
    expect(screen.getByRole('link', { name: 'Xem các gói quảng cáo' })).toHaveAttribute('href', '/packages')
  })

  it('chặn ảnh vượt 10MB trước khi gọi API', async () => {
    const user = userEvent.setup()
    renderForm()

    // Chờ form render xong (SWR subscription xong) rồi mới lấy input file.
    await screen.findByLabelText(/^Tiêu đề/)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const big = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 + 1 })
    await user.upload(input, big)

    expect(await screen.findByText('File vượt quá 10 MB.')).toBeInTheDocument()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Tạo quảng cáo' }))

    expect(createAdMock).not.toHaveBeenCalled()
    expect(
      await screen.findByText('Vui lòng sửa các lỗi được đánh dấu trước khi gửi.'),
    ).toBeInTheDocument()
  })

  it('khôi phục bản nháp khi mở form', async () => {
    const user = userEvent.setup()
    saveAdDraft({
      title: 'Nháp tiêu đề',
      content: 'Nháp nội dung',
      targetUrl: 'https://linkup.vn/sale',
      format: 'image',
      budget: '100000',
      dailyBudget: '0',
      cpmPrice: '25000',
      cpcPrice: '1000',
      maxImpressions: '0',
      startedAt: '2026-11-08T08:00',
      expiresAt: '2026-12-08T08:00',
      targetGender: 'all',
      targetAgeMin: '0',
      targetAgeMax: '100',
      targetProvinces: [],
    }, 'anon')
    renderForm()

    expect(await screen.findByText('Có bản nháp chưa gửi')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }))

    expect((await screen.findByLabelText(/^Tiêu đề/) as HTMLInputElement).value).toBe('Nháp tiêu đề')
  })

  it('dùng mẫu điền tiêu đề và nội dung', async () => {
    const user = userEvent.setup()
    renderForm()

    await screen.findByLabelText(/^Tiêu đề/)
    await user.click(screen.getByRole('button', { name: 'Dùng mẫu có sẵn' }))
    await user.click(await screen.findByRole('button', { name: /Cà phê mới rang/ }))

    expect((screen.getByLabelText(/^Tiêu đề/) as HTMLInputElement).value).toContain('Cà phê mới rang')
    expect((screen.getByRole('textbox', { name: /Nội dung/i }) as HTMLTextAreaElement).value).toContain(
      'rang mới',
    )
  })

  it('tự lưu nháp sau khi người dùng nhập', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(await screen.findByLabelText(/^Tiêu đề/), 'Nháp tự động')

    await waitFor(
      () => {
        const raw = localStorage.getItem('ad-draft:v1:anon')
        expect(raw).toBeTruthy()
        expect(JSON.parse(raw as string).data.title).toBe('Nháp tự động')
      },
      { timeout: 3000 },
    )
  })

  it('hiển thị tên tỉnh theo ngôn ngữ đang chọn', async () => {
    localStorage.setItem('language', 'en')
    renderForm()

    expect(await screen.findByRole('checkbox', { name: 'Hanoi' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Hà Nội' })).not.toBeInTheDocument()
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
