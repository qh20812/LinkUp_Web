/**
 * Ước tính lượt hiển thị tối đa từ tổng ngân sách và giá CPM.
 *
 * CPM là giá cho 1.000 lượt hiển thị, nên số lượt = ngân sách / (CPM / 1000).
 * Đây chỉ là con số tham khảo để người mới hình dung quy mô chiến dịch — không
 * dùng để tính tiền và không phải cam kết của hệ thống.
 *
 * Trả `null` khi thiếu dữ liệu (ngân sách/CPM ≤ 0 hoặc không phải số hữu hạn).
 */
export function estimateAdReach({ budget, cpm }: { budget: number; cpm: number }): number | null {
  if (!Number.isFinite(budget) || !Number.isFinite(cpm)) return null
  if (budget <= 0 || cpm <= 0) return null
  return Math.floor(budget / (cpm / 1000))
}

/** Định dạng tiền VND thống nhất cho form, bảng và modal analytics. */
export function formatVnd(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}
