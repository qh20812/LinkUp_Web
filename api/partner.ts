import { request } from './api'
import type {
  PartnerAdListResponse,
  AdPerformance,
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

export const createAd = (input: CreateAdInput, mediaFile?: File) => {
  const formData = new FormData()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { media: _media, ...rest } = input as CreateAdInput & { media?: File }
  formData.append('data', JSON.stringify(rest))
  if (mediaFile) {
    formData.append('media', mediaFile)
  }
  return request<{ id: string }>('/ads-management', {
    method: 'POST',
    body: formData,
  })
}

export const updateAd = (id: string, input: UpdateAdInput) =>
  request(`/ads-management/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })

export const deleteAd = (id: string) =>
  request(`/ads-management/${id}`, { method: 'DELETE' })

export const updateAdStatus = (id: string, status: string) =>
  request(`/ads-management/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

export const getAdAnalytics = (id: string) =>
  request<AdPerformance>(`/ads-management/${id}/analytics`)

export const getOverview = () =>
  request<AdOverview>('/ads-management/overview')

export interface FeedAd {
  id: string
  title: string
  content: string
  target_url: string
  media_uri: string
  format: string
}

export const getFeedAds = () =>
  request<{ data: FeedAd[] }>('/customer/feed/ads')

export const trackAdAction = (adId: string, action: string) =>
  request(`/customer/ads/${adId}/track`, {
    method: 'POST',
    body: JSON.stringify({ action_type: action }),
  })
