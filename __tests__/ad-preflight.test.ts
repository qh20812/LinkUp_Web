import { buildAdPreflight, type AdPreflightInput } from '@/lib/ad-preflight'
import type { AdMediaCheck } from '@/lib/ad-media'

const mediaOk: AdMediaCheck = { errors: [], warnings: [] }

function input(overrides: Partial<AdPreflightInput> = {}): AdPreflightInput {
  return {
    title: 'Khuyến mãi tháng 11 cho quán cà phê',
    content: 'Giảm 50% cho thành viên mới trong tuần này.',
    targetUrl: 'https://linkup.vn/sale',
    budget: 100000,
    dailyBudget: 0,
    cpm: 25000,
    cpc: 1000,
    startedAt: '2026-11-08T08:00',
    expiresAt: '2026-12-08T08:00',
    ageMin: 0,
    ageMax: 100,
    format: 'image',
    mediaCount: 1,
    mediaCheck: mediaOk,
    estimate: 4000,
    ...overrides,
  }
}

function keys(issues: ReturnType<typeof buildAdPreflight>, level?: 'error' | 'warning') {
  return issues.filter((issue) => !level || issue.level === level).map((issue) => issue.key)
}

describe('buildAdPreflight', () => {
  it('form hợp lệ không có issue', () => {
    expect(buildAdPreflight(input())).toEqual([])
  })

  it('báo lỗi khi thiếu tiêu đề/nội dung/link/ngân sách', () => {
    const issues = buildAdPreflight(input({ title: '  ', content: '', targetUrl: '', budget: 0 }))
    expect(keys(issues, 'error')).toEqual(
      expect.arrayContaining([
        'partner.form.preflightTitleMissing',
        'partner.form.preflightContent',
        'partner.form.preflightUrl',
        'partner.form.preflightBudget',
      ]),
    )
  })

  it('chặn link không phải http(s)', () => {
    expect(keys(buildAdPreflight(input({ targetUrl: 'linkup.vn/sale' })), 'error')).toContain(
      'partner.form.preflightUrlInvalid',
    )
  })

  it('chặn ngày kết thúc trước ngày bắt đầu', () => {
    const issues = buildAdPreflight(input({ startedAt: '2026-12-08T08:00', expiresAt: '2026-11-08T08:00' }))
    expect(keys(issues, 'error')).toContain('partner.form.preflightDateOrder')
  })

  it('chặn tuổi min lớn hơn max', () => {
    expect(keys(buildAdPreflight(input({ ageMin: 40, ageMax: 20 })), 'error')).toContain(
      'partner.form.preflightAgeOrder',
    )
  })

  it('cảnh báo khi chưa có media, tiêu đề ngắn, ngân sách thấp', () => {
    const issues = buildAdPreflight(
      input({ title: 'Sale', mediaCount: 0, estimate: 5, dailyBudget: 200000, cpm: 0, cpc: 0 }),
    )
    expect(keys(issues, 'warning')).toEqual(
      expect.arrayContaining([
        'partner.form.preflightShortTitle',
        'partner.form.preflightNoMedia',
        'partner.form.preflightLowBudget',
        'partner.form.preflightDailyOverBudget',
        'partner.form.preflightFree',
      ]),
    )
    expect(keys(issues, 'error')).toEqual([])
  })

  it('map lỗi media sang i18n key', () => {
    const issues = buildAdPreflight(
      input({
        mediaCheck: {
          errors: [{ level: 'error', code: 'tooLarge', params: { max: 10 } }],
          warnings: [{ level: 'warning', code: 'warnLong', params: { max: 30 } }],
        },
      }),
    )
    expect(keys(issues, 'error')).toContain('partner.form.mediaErrTooLarge')
    expect(keys(issues, 'warning')).toContain('partner.form.mediaWarnLong')
  })

  it('mỗi issue có fieldId để nhảy về đúng bước', () => {
    const issues = buildAdPreflight(input({ title: '', budget: 0 }))
    expect(issues.find((i) => i.key === 'partner.form.preflightTitleMissing')?.fieldId).toBe('ad-title')
    expect(issues.find((i) => i.key === 'partner.form.preflightBudget')?.fieldId).toBe('ad-budget')
  })
})
