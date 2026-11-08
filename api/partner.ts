import { request } from './api'
import { normalizeAdPerformance, type AdPerformanceWire } from '../lib/ad-performance'
import type {
  PartnerAdListResponse,
  PartnerAdListItem,
  AdOverview,
  CreateAdInput,
  UpdateAdInput,
} from '../types'

export const getMyAds = (params: {
  page?: number
  page_size?: number
  keyword?: string
  status?: string
}) => {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.page_size) searchParams.set('page_size', String(params.page_size))
  if (params.keyword) searchParams.set('keyword', params.keyword)
  if (params.status) searchParams.set('status', params.status)
  return request<PartnerAdListResponse>(`/ads-management?${searchParams}`)
}

import { toAdISOString } from '../lib/ad-datetime'

export { toAdISOString }

export const createAd = (input: CreateAdInput, mediaFiles?: File | File[]) => {
  const formData = new FormData()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { media: _media, ...rest } = input as CreateAdInput & { media?: File }
  const payload = {
    ...rest,
    started_at: toAdISOString(rest.started_at),
    expires_at: toAdISOString(rest.expires_at),
  }
  formData.append('data', JSON.stringify(payload))
  const files = mediaFiles == null ? [] : Array.isArray(mediaFiles) ? mediaFiles : [mediaFiles]
  for (const file of files) {
    formData.append('media', file)
  }
  return request<{ message: string; data: PartnerAdListItem }>('/ads-management', {
    method: 'POST',
    body: formData,
  })
}

export const updateAd = (id: string, input: UpdateAdInput) =>
  request(`/ads-management/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...input,
      started_at: toAdISOString(input.started_at),
      expires_at: toAdISOString(input.expires_at),
    }),
  })

export const deleteAd = (id: string) =>
  request(`/ads-management/${id}`, { method: 'DELETE' })

/** Gửi lại quảng cáo bị từ chối vào hàng đợi duyệt. */
export const submitAdForReview = (id: string) =>
  request<{ message: string; data: PartnerAdListItem }>(`/ads-management/${id}/submit`, {
    method: 'POST',
  })

export const updateAdStatus = (id: string, status: string) =>
  request(`/ads-management/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

export const getAdAnalytics = async (
  id: string,
  range?: { from: string; to: string },
) => {
  const query = range
    ? `?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`
    : ''
  // Controller bọc response trong { data: report } — trước đây web trả nguyên
  // wrapper nên mọi field (impressions, ctr…) đều undefined.
  const res = await request<{ data: AdPerformanceWire }>(`/ads-management/${id}/analytics${query}`)
  return normalizeAdPerformance(res.data)
}

export const getOverview = async () => {
  const res = await request<{ data: AdOverview }>('/ads-management/overview')
  return res.data
}

export interface FeedAdMedia {
  url: string
  media_type?: string
}

export interface FeedAd {
  id: string
  title: string
  content: string
  target_url: string
  format: string
  /** API trả `media_list`; `media_uri` chỉ là fallback cho dữ liệu cũ. */
  media_list?: FeedAdMedia[]
  media_uri?: string
}

export const getFeedAds = () =>
  request<{ data: FeedAd[] }>('/customer/feed')

export const trackAdAction = (adId: string, action: string) =>
  request(`/customer/ads/${adId}/track`, {
    method: 'POST',
    body: JSON.stringify({ action_type: action }),
  })
