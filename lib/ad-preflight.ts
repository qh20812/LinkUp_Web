import { mediaIssueKey, type AdMediaCheck } from './ad-media'

export type PreflightLevel = 'error' | 'warning'

export interface AdPreflightIssue {
  level: PreflightLevel
  /** i18n key của câu thông báo. */
  key: string
  params?: Record<string, string | number>
  /** Field cần focus khi người dùng bấm vào gợi ý. */
  fieldId?: string
}

export interface AdPreflightInput {
  title: string
  content: string
  targetUrl: string
  budget: number
  dailyBudget: number
  cpm: number
  cpc: number
  startedAt: string
  expiresAt: string
  ageMin: number
  ageMax: number
  format: string
  mediaCount: number
  mediaCheck: AdMediaCheck
  estimate: number | null
}

const HTTP_URL = /^https?:\/\/\S+$/i

/**
 * Kiểm tra lần cuối trước khi gửi: lỗi cứng chặn submit, cảnh báo chỉ nhắc.
 * Hàm thuần để test được toàn bộ rule mà không cần render form.
 */
export function buildAdPreflight(input: AdPreflightInput): AdPreflightIssue[] {
  const issues: AdPreflightIssue[] = []

  const error = (key: string, fieldId?: string, params?: Record<string, string | number>) =>
    issues.push({ level: 'error', key, fieldId, params })
  const warning = (key: string, fieldId?: string, params?: Record<string, string | number>) =>
    issues.push({ level: 'warning', key, fieldId, params })

  const title = input.title.trim()
  if (!title) {
    error('partner.form.preflightTitleMissing', 'ad-title')
  } else if (title.length < 20) {
    warning('partner.form.preflightShortTitle', 'ad-title', { n: 20 })
  }

  if (!input.content.trim()) {
    error('partner.form.preflightContent', 'ad-content')
  }

  const targetUrl = input.targetUrl.trim()
  if (!targetUrl) {
    error('partner.form.preflightUrl', 'ad-target-url')
  } else if (!HTTP_URL.test(targetUrl)) {
    error('partner.form.preflightUrlInvalid', 'ad-target-url')
  }

  if (!(input.budget > 0)) {
    error('partner.form.preflightBudget', 'ad-budget')
  }

  if (input.startedAt && input.expiresAt) {
    const start = new Date(input.startedAt)
    const end = new Date(input.expiresAt)
    if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end <= start) {
      error('partner.form.preflightDateOrder', 'ad-started-at')
    }
  }

  if (input.ageMin > input.ageMax) {
    error('partner.form.preflightAgeOrder', 'ad-age-min')
  }

  // Lỗi/cảnh báo media đã được checkAdMediaFiles tính; chỉ map sang i18n key.
  for (const issue of [...input.mediaCheck.errors, ...input.mediaCheck.warnings]) {
    issues.push({
      level: issue.level,
      key: mediaIssueKey(issue.code),
      params: issue.params,
      fieldId: 'ad-media-input',
    })
  }

  if (input.mediaCount === 0) {
    warning('partner.form.preflightNoMedia', 'ad-media-input')
  }

  if (input.estimate !== null && input.estimate < 10) {
    warning('partner.form.preflightLowBudget', 'ad-budget', { impressions: input.estimate })
  }

  if (input.budget > 0 && input.dailyBudget > input.budget) {
    warning('partner.form.preflightDailyOverBudget', 'ad-daily-budget')
  }

  if (input.cpm === 0 && input.cpc === 0) {
    warning('partner.form.preflightFree', 'ad-cpm-price')
  }

  return issues
}
