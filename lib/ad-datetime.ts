/**
 * `datetime-local` của trình duyệt dùng giờ địa phương và format
 * "YYYY-MM-DDTHH:mm" (không timezone). Server chỉ nhận RFC3339 nên mọi giá trị
 * gửi lên đều phải chuẩn hoá qua đây; trước đây server bỏ qua lỗi parse khiến
 * ngày chạy của quảng cáo biến mất.
 */
export function toAdISOString(value?: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

/** Đưa chuỗi ISO từ API về dạng mà `<input type="datetime-local">` hiển thị. */
export function toDateTimeLocal(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/**
 * Khoảng thời gian (ISO) cho bộ lọc analytics: `days` ngày tính tới `now`.
 * Kẹp trong [1, 365] để client không gửi khoảng vô nghĩa.
 */
export function adRangeQuery(days: number, now: Date = new Date()): { from: string; to: string } {
  const safeDays = Math.min(365, Math.max(1, Math.floor(days) || 1))
  const to = now
  const from = new Date(to.getTime() - safeDays * 86_400_000)
  return { from: from.toISOString(), to: to.toISOString() }
}
