import { request } from './api'
import type { AdPackage, CreatePaymentResponse, SubscriptionResponse } from '../types'

export const getPackages = async () => {
  const res = await request<{ data: AdPackage[] }>('/ads/packages')
  return res.data ?? []
}

export const getMySubscription = async () => {
  const res = await request<{ data: SubscriptionResponse }>('/ads-management/subscription')
  return res.data
}

/** Tạo giao dịch MoMo; trả về link để trình duyệt chuyển sang cổng thanh toán. */
export const createMoMoPayment = async (packageId: string): Promise<CreatePaymentResponse> => {
  const res = await request<{ data: CreatePaymentResponse }>('/ads-management/payments/momo', {
    method: 'POST',
    body: JSON.stringify({ package_id: packageId }),
  })
  return res.data
}
