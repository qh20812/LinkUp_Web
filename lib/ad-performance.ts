import type { AdPerformance } from '../types'

/**
 * Dữ liệu thô từ API thống kê ad.
 *
 * Server trả CTR với tên `click_through_rate` (DTO `AdPerformanceResponse`),
 * trong khi các DTO danh sách/overview lại dùng `ctr`. Nhận cả hai để web không
 * vỡ khi server cũ/mới chạy xen kẽ trong lúc deploy.
 */
export interface AdPerformanceWire extends Omit<AdPerformance, 'ctr'> {
  ctr?: number
  click_through_rate?: number
}

/** Chuẩn hoá response thống kê về `AdPerformance` mà UI đang dùng. */
export function normalizeAdPerformance(wire: AdPerformanceWire): AdPerformance {
  const { click_through_rate, ...rest } = wire
  return { ...rest, ctr: wire.ctr ?? click_through_rate ?? 0 }
}
