import { request } from './api'
import type { PaymentListResponse } from '../types'

export interface PaymentQuery {
  page?: number
  page_size?: number
  status?: string
  gateway?: string
}

function toQuery(params: PaymentQuery): string {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.page_size) search.set('page_size', String(params.page_size))
  if (params.status) search.set('status', params.status)
  if (params.gateway) search.set('gateway', params.gateway)
  return search.toString()
}

/** Lịch sử giao dịch của partner đang đăng nhập. */
export const getMyPayments = (params: PaymentQuery = {}) =>
  request<PaymentListResponse>(`/ads-management/payments?${toQuery(params)}`)

/** Lịch sử giao dịch toàn hệ thống (admin). */
export const getAllPayments = (params: PaymentQuery & { user_id?: string } = {}) => {
  const query = toQuery(params)
  const extra = params.user_id ? `&user_id=${encodeURIComponent(params.user_id)}` : ''
  return request<PaymentListResponse>(`/admin/payments?${query}${extra}`)
}
