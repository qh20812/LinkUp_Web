import { request } from './api'
import type { AdPackage, SubscriptionResponse, TokenResponse } from '../types'

export interface SubscribeResult {
  data: SubscriptionResponse
  /** Present when the server reissued tokens after the role upgrade (B). */
  tokens?: TokenResponse
}

export const getPackages = async () => {
  const res = await request<{ data: AdPackage[] }>('/ads/packages')
  return res.data ?? []
}

export const getMySubscription = async () => {
  const res = await request<{ data: SubscriptionResponse }>('/ads-management/subscription')
  return res.data
}

export const subscribePackage = async (packageId: string): Promise<SubscribeResult> => {
  const res = await request<SubscribeResult>('/ads-management/subscribe', {
    method: 'POST',
    body: JSON.stringify({ package_id: packageId }),
  })
  return res
}
