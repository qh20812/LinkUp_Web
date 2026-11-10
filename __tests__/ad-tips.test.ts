import { getAdTip } from '@/lib/ad-tips'
import type { PartnerAdListItem } from '@/types'

function ad(overrides: Partial<PartnerAdListItem>): PartnerAdListItem {
  return {
    id: 'ad-1',
    title: 'Ad',
    content: '',
    format: 'image',
    target_url: 'https://linkup.vn',
    status: 'active',
    budget: 100000,
    daily_budget: 0,
    cpm_price: 25000,
    cpc_price: 1000,
    max_impressions: 0,
    total_spent: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    media_uri: '',
    target_gender: 'all',
    target_age_min: 0,
    target_age_max: 100,
    target_locations: [],
    created_at: '2026-11-01T00:00:00Z',
    ...overrides,
  }
}

describe('getAdTip', () => {
  it('trả tip theo trạng thái', () => {
    expect(getAdTip(ad({ status: 'pending' }))).toBe('pending')
    expect(getAdTip(ad({ status: 'rejected' }))).toBe('rejected')
    expect(getAdTip(ad({ status: 'paused' }))).toBe('paused')
    expect(getAdTip(ad({ status: 'completed' }))).toBe('completed')
    expect(getAdTip(ad({ status: 'suspended' }))).toBeNull()
  })

  it('cảnh báo sắp hết ngân sách khi active và đã dùng >= 80%', () => {
    expect(getAdTip(ad({ status: 'active', budget: 100000, total_spent: 79999 }))).toBeNull()
    expect(getAdTip(ad({ status: 'active', budget: 100000, total_spent: 80000 }))).toBe('budgetLow')
  })

  it('không chia cho 0 khi ad miễn phí/không đặt ngân sách', () => {
    expect(getAdTip(ad({ status: 'active', budget: 0, total_spent: 0 }))).toBeNull()
  })
})
