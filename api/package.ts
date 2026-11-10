import { request } from './api'
import type {
  AdPackage,
  CreatePaymentResponse,
  PaymentMethodsResponse,
  SubscriptionResponse,
  WalletPurchaseResponse,
} from '../types'

export const getPackages = async () => {
  const res = await request<{ data: AdPackage[] }>('/ads/packages')
  return res.data ?? []
}

export const getMySubscription = async () => {
  const res = await request<{ data: SubscriptionResponse }>('/ads-management/subscription')
  return res.data
}

/**
 * Phương thức thanh toán gói đang bật — server tắt MoMo/VNPay bằng env và chỉ
 * trả các phương thức có đủ cấu hình merchant.
 */
export const getPaymentMethods = async (): Promise<PaymentMethodsResponse> => {
  const res = await request<{ data: PaymentMethodsResponse }>('/ads-management/payment-methods')
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

/** Tạo link thanh toán VNPay (sandbox/production theo env server). */
export const createVNPayPayment = async (packageId: string): Promise<CreatePaymentResponse> => {
  const res = await request<{ data: CreatePaymentResponse }>('/ads-management/payments/vnpay', {
    method: 'POST',
    body: JSON.stringify({ package_id: packageId }),
  })
  return res.data
}

/**
 * Mua gói bằng ví trả trước. Gói được kích hoạt ngay trong cùng transaction.
 *
 * `idempotencyKey` phải giữ nguyên khi retry cùng một lần mua: server dùng nó
 * để dựng `txn_ref` và không trừ tiền lần hai.
 */
export const createWalletPayment = async (
  packageId: string,
  idempotencyKey: string,
): Promise<{
  message: string
  data: WalletPurchaseResponse
  tokens?: { access_token: string; refresh_token?: string }
}> => {
  return request('/ads-management/payments/wallet', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ package_id: packageId }),
  })
}

/** Khoá chống trùng cho một lần bấm mua gói (crypto.randomUUID có fallback). */
export function newPaymentRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
