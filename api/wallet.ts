import { request } from './api'
import type {
  AdminWalletListResponse,
  WalletResponse,
  WalletTopup,
  WalletTopupCreated,
  WalletTopupListResponse,
  WalletTransactionListResponse,
} from '../types'

/** Số dư ví của người dùng đang đăng nhập. */
export const getWallet = async (): Promise<WalletResponse> => {
  const res = await request<{ data: WalletResponse }>('/wallet')
  return res.data
}

export const listWalletTransactions = (page = 1, pageSize = 20) => {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  return request<WalletTransactionListResponse>(`/wallet/transactions?${params}`)
}

export const listTopups = (page = 1, pageSize = 10) => {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  return request<WalletTopupListResponse>(`/wallet/topups?${params}`)
}

/** Tạo yêu cầu nạp tiền; server trả mã chuyển khoản + URL ảnh QR động. */
export const createTopup = async (amount: number): Promise<WalletTopupCreated> => {
  const res = await request<{ message: string; data: WalletTopupCreated }>('/wallet/topups', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  })
  return res.data
}

/** Báo đã chuyển khoản kèm URL ảnh biên lai (server bắt buộc ảnh). */
export const reportTopup = async (id: string, proofUrl: string): Promise<WalletTopup> => {
  const res = await request<{ message: string; data: WalletTopup }>(`/wallet/topups/${id}/report`, {
    method: 'POST',
    body: JSON.stringify({ proof_url: proofUrl }),
  })
  return res.data
}

export const cancelTopup = (id: string) =>
  request<{ message: string }>(`/wallet/topups/${id}/cancel`, { method: 'POST' })

// ── Admin ────────────────────────────────────────────────────────────

export interface AdminTopupQuery {
  page?: number
  page_size?: number
  status?: string
  keyword?: string
  reported?: boolean
}

export const adminListTopups = (params: AdminTopupQuery) => {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.page_size) search.set('page_size', String(params.page_size))
  if (params.status) search.set('status', params.status)
  if (params.keyword) search.set('keyword', params.keyword)
  if (params.reported) search.set('reported', 'true')
  return request<WalletTopupListResponse>(`/admin/wallet/topups?${search}`)
}

export const adminApproveTopup = async (
  id: string,
  payload: { confirmed_amount?: number; note?: string },
): Promise<WalletTopup> => {
  const res = await request<{ message: string; data: WalletTopup }>(
    `/admin/wallet/topups/${id}/approve`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
  return res.data
}

export const adminRejectTopup = async (id: string, reason: string): Promise<WalletTopup> => {
  const res = await request<{ message: string; data: WalletTopup }>(
    `/admin/wallet/topups/${id}/reject`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  )
  return res.data
}

export const adminListWallets = (params: { page?: number; page_size?: number; keyword?: string } = {}) => {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.page_size) search.set('page_size', String(params.page_size))
  if (params.keyword) search.set('keyword', params.keyword)
  return request<AdminWalletListResponse>(`/admin/wallets?${search}`)
}
