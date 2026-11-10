/** Định dạng thời gian còn lại của mã nạp tiền: mm:ss (00:00 khi đã hết hạn). */
export function formatCountdown(msLeft: number): string {
  if (!Number.isFinite(msLeft) || msLeft <= 0) return '00:00'
  const total = Math.floor(msLeft / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Key i18n cho trạng thái yêu cầu nạp; luôn rơi về `pending` với dữ liệu lạ. */
export function topupStatusKey(status: string): string {
  const allowed = ['pending', 'paid', 'rejected', 'expired', 'cancelled']
  return allowed.includes(status) ? `wallet.${status}` : 'wallet.pending'
}

/** Có được bấm "Tôi đã chuyển khoản" không: chỉ khi còn hạn và chưa báo. */
export function canReportTransfer(expired: boolean, reported: boolean): boolean {
  return !expired && !reported
}
