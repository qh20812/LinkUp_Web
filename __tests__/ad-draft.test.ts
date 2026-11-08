import {
  AD_DRAFT_TTL_MS,
  adDraftKey,
  clearAdDraft,
  loadAdDraft,
  saveAdDraft,
  type AdDraftData,
} from '@/lib/ad-draft'
import { mockLocalStorage } from './test-utils'

const data: AdDraftData = {
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
  targetProvinces: ['01'],
}

beforeEach(() => {
  mockLocalStorage()
})

describe('ad draft', () => {
  it('lưu và đọc lại theo identity', () => {
    saveAdDraft(data, 'user-1')

    expect(loadAdDraft('user-1')?.data).toEqual(data)
    expect(loadAdDraft('user-2')).toBeNull()
  })

  it('bỏ qua và xoá nháp quá TTL', () => {
    saveAdDraft(data, 'user-1')
    const key = adDraftKey('user-1')
    const raw = JSON.parse(localStorage.getItem(key) as string)
    raw.savedAt = Date.now() - AD_DRAFT_TTL_MS - 1000
    localStorage.setItem(key, JSON.stringify(raw))

    expect(loadAdDraft('user-1')).toBeNull()
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('bỏ qua JSON hỏng, version lạ hoặc thiếu field', () => {
    const key = adDraftKey('user-1')
    localStorage.setItem(key, '{not-json')
    expect(loadAdDraft('user-1')).toBeNull()

    localStorage.setItem(key, JSON.stringify({ version: 99, savedAt: Date.now(), data }))
    expect(loadAdDraft('user-1')).toBeNull()

    localStorage.setItem(key, JSON.stringify({ version: 1, savedAt: Date.now(), data: { title: 'x' } }))
    expect(loadAdDraft('user-1')).toBeNull()
  })

  it('xoá nháp', () => {
    saveAdDraft(data, 'user-1')
    clearAdDraft('user-1')
    expect(loadAdDraft('user-1')).toBeNull()
  })

  it('mặc định dùng sub trong JWT làm identity', () => {
    const payload = window.btoa(JSON.stringify({ sub: 'user-9' }))
    localStorage.setItem('token', `header.${payload}.signature`)

    saveAdDraft(data)

    expect(localStorage.getItem('ad-draft:v1:user-9')).toBeTruthy()
  })
})
