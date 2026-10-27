import {
  mockFetch,
  restoreFetch,
  getLastFetchPath,
  getLastFetchOptions,
  mockLocalStorage,
} from './test-utils'

mockLocalStorage()

import { createAd, getFeedAds, updateAd } from '@/api/partner'

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
