import {
  mockFetch,
  restoreFetch,
  getLastFetchPath,
  getLastFetchOptions,
  mockLocalStorage,
} from './test-utils'

mockLocalStorage()

import { createAd, getAdAnalytics, getFeedAds, getOverview, replaceAdMedia, updateAd } from '@/api/partner'

afterEach(() => {
  restoreFetch()
})

const baseInput = {
  title: 'Khuyến mãi',
  content: 'Nội dung quảng cáo',
  format: 'image',
  target_url: 'https://linkup.vn',
  budget: 100000,
  daily_budget: 5000,
  cpm_price: 10,
  cpc_price: 2,
  max_impressions: 1000,
}

describe('createAd', () => {
  it('gửi toàn bộ input trong field data và POST tới /ads-management', async () => {
    mockFetch({ body: { message: 'ok', data: { id: 'ad-1' } } })

    const result = await createAd(baseInput)

    expect(result).toEqual({ message: 'ok', data: { id: 'ad-1' } })
    expect(getLastFetchPath()).toBe('/api/ads-management')
    expect(getLastFetchOptions()?.method).toBe('POST')

    const form = getLastFetchOptions()?.body as FormData
    expect(form).toBeInstanceOf(FormData)
    const parsed = JSON.parse(form.get('data') as string)
    expect(parsed.title).toBe('Khuyến mãi')
    expect(parsed.target_url).toBe('https://linkup.vn')
    expect(parsed.budget).toBe(100000)
    expect(parsed.media).toBeUndefined()
  })

  it('chuẩn hoá started_at/expires_at từ datetime-local sang ISO', async () => {
    mockFetch({ body: { message: 'ok', data: { id: 'ad-1' } } })

    await createAd({ ...baseInput, started_at: '2026-10-27T23:30', expires_at: '2026-12-31T00:00' })

    const form = getLastFetchOptions()?.body as FormData
    const parsed = JSON.parse(form.get('data') as string)
    expect(parsed.started_at).toBe(new Date('2026-10-27T23:30').toISOString())
    expect(parsed.expires_at).toBe(new Date('2026-12-31T00:00').toISOString())
  })

  it('không gửi ngày khi người dùng để trống', async () => {
    mockFetch({ body: { message: 'ok', data: { id: 'ad-1' } } })

    await createAd(baseInput)

    const form = getLastFetchOptions()?.body as FormData
    const parsed = JSON.parse(form.get('data') as string)
    expect(parsed).not.toHaveProperty('started_at')
    expect(parsed).not.toHaveProperty('expires_at')
  })

  it('đính kèm file media khi có', async () => {
    mockFetch({ body: { message: 'ok', data: { id: 'ad-1' } } })
    const file = new File(['x'], 'banner.png', { type: 'image/png' })

    await createAd(baseInput, file)

    const form = getLastFetchOptions()?.body as FormData
    expect(form.get('media')).toBeInstanceOf(File)
    expect((form.get('media') as File).name).toBe('banner.png')
  })
})

describe('updateAd', () => {
  it('gửi JSON và chuẩn hoá ngày sang ISO', async () => {
    mockFetch({ body: { message: 'ok', data: { id: 'ad-1' } } })

    await updateAd('ad-1', { title: 'Mới', budget: 200, started_at: '2026-11-01T08:00' })

    expect(getLastFetchPath()).toBe('/api/ads-management/ad-1')
    expect(getLastFetchOptions()?.method).toBe('PATCH')

    const parsed = JSON.parse(getLastFetchOptions()?.body as string)
    expect(parsed.title).toBe('Mới')
    expect(parsed.started_at).toBe(new Date('2026-11-01T08:00').toISOString())
  })
})

describe('getFeedAds', () => {
  it('gọi đúng route /customer/feed của server', async () => {
    const body = { data: [{ id: 'ad-1', title: 'A', content: 'B', target_url: 'https://x.vn', format: 'image' }] }
    mockFetch({ body })

    const result = await getFeedAds()

    expect(getLastFetchPath()).toBe('/api/customer/feed')
    expect(result).toEqual(body)
  })
})

describe('getAdAnalytics', () => {
  const performance = {
    ad_id: 'ad-1',
    title: 'Khuyến mãi',
    status: 'active',
    format: 'image',
    budget: 1000,
    daily_budget: 0,
    total_spent: 10,
    remaining_budget: 990,
    impressions: 1200,
    unique_reach: 900,
    clicks: 12,
    interactions: 3,
    click_through_rate: 2.5,
    cost_per_click: 100,
    cost_per_thousand_impressions: 200,
    cost: 5,
  }

  it('bóc wrapper { data } và map click_through_rate → ctr', async () => {
    mockFetch({ body: { data: performance } })

    const result = await getAdAnalytics('ad-1', { from: '2026-11-01', to: '2026-11-30' })

    expect(getLastFetchPath()).toContain('/api/ads-management/ad-1/analytics')
    expect(result.impressions).toBe(1200)
    expect(result.ctr).toBe(2.5)
    expect(result).not.toHaveProperty('data')
    expect(result).not.toHaveProperty('click_through_rate')
  })

  it('giữ ctr nếu server đã trả đúng tên', async () => {
    mockFetch({ body: { data: { ...performance, ctr: 3.2 } } })

    const result = await getAdAnalytics('ad-1')

    expect(result.ctr).toBe(3.2)
  })
})

describe('replaceAdMedia', () => {
  it('gửi PUT multipart với toàn bộ file media', async () => {
    mockFetch({ body: { message: 'ok', data: { id: 'ad-1' } } })
    const files = [
      new File(['1'], '1.jpg', { type: 'image/jpeg' }),
      new File(['2'], '2.jpg', { type: 'image/jpeg' }),
    ]

    await replaceAdMedia('ad-1', files)

    expect(getLastFetchPath()).toBe('/api/ads-management/ad-1/media')
    expect(getLastFetchOptions()?.method).toBe('PUT')
    const form = getLastFetchOptions()?.body as FormData
    expect(form.getAll('media')).toHaveLength(2)
    expect((form.getAll('media')[1] as File).name).toBe('2.jpg')
  })
})

describe('getOverview', () => {
  it('bóc wrapper { data } của endpoint overview', async () => {
    const overview = {
      total_budget: 100000,
      total_spent: 25000,
      remaining_budget: 75000,
      impressions: 4000,
      clicks: 120,
      ctr: 3,
      active_ads: 2,
      slots_used: 2,
      max_slots: 5,
      subscription_name: 'Gói Cơ bản',
    }
    mockFetch({ body: { data: overview } })

    const result = await getOverview()

    expect(getLastFetchPath()).toBe('/api/ads-management/overview')
    expect(result.total_budget).toBe(100000)
    expect(result.active_ads).toBe(2)
    expect(result).not.toHaveProperty('data')
  })
})
