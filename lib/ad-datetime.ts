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
