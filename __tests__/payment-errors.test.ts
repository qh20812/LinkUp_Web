import { mockFetch, restoreFetch, mockLocalStorage } from './test-utils'
import { createMoMoPayment } from '@/api/package'
import vi from '@/locales/vi.json'
import en from '@/locales/en.json'

const errorsVi = (vi as unknown as { errors: Record<string, string> }).errors
const errorsEn = (en as unknown as { errors: Record<string, string> }).errors

beforeEach(() => {
  mockLocalStorage()
})

afterEach(() => {
  restoreFetch()
})

describe('payment error messages', () => {
  const cases: Array<[string, string]> = [
    ['payment.ALREADY_ACTIVE', 'Gói này đang hoạt động, không cần thanh toán lại.'],
    ['payment.NOT_CONFIGURED', 'Cổng thanh toán chưa được cấu hình'],
    ['payment.INVALID_AMOUNT', 'Số tiền thanh toán không hợp lệ.'],
    ['payment.CREATE_FAILED', 'Không thể tạo giao dịch thanh toán'],
  ]

  it.each(cases)('dịch %s sang tiếng Việt thay vì trả raw code', async (code, message) => {
    mockFetch({ status: 400, body: { error: code } })

    await expect(createMoMoPayment('p1')).rejects.toThrow(message)
  })

  it('dịch payment.ALREADY_ACTIVE sang tiếng Anh khi chọn EN', async () => {
    localStorage.setItem('language', 'en')
    mockFetch({ status: 400, body: { error: 'payment.ALREADY_ACTIVE' } })

    await expect(createMoMoPayment('p1')).rejects.toThrow('This plan is already active')
  })
})

describe('error locale keys', () => {
  const required = [
    'payment.ALREADY_ACTIVE',
    'payment.NOT_CONFIGURED',
    'payment.INVALID_AMOUNT',
    'payment.CREATE_FAILED',
    'ad.CANNOT_EDIT',
    'ad.CANNOT_DELETE',
    'ad.BUDGET_EXCEEDED',
    'ad.DAILY_LIMIT_REACHED',
    'ad.PENDING_APPROVAL',
  ]

  it.each(required)('%s có bản dịch ở cả vi và en', (code) => {
    expect(errorsVi[code]).toBeTruthy()
    expect(errorsEn[code]).toBeTruthy()
  })
})
