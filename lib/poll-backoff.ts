/**
 * Số vòng poll nên bỏ qua sau `failures` lần lỗi liên tiếp.
 *
 * Poll nền (thông báo) chạy mỗi 60s. Khi backend tắt/khởi động lại — `air`
 * rebuild, deploy, mất mạng — mỗi vòng sẽ ném lỗi và làm ngập console (dev
 * overlay của Next bắt mọi console.error có Error object). Giãn nhịp theo cấp
 * số nhân để backend có thời gian sống lại mà không cần người dùng F5.
 *
 * Với interval 60s: lỗi 1 lần → nghỉ 1 vòng, 2 → 3 vòng, 3 → 7 vòng,
 * từ 4 lần trở lên → 15 vòng (≈16 phút).
 */
export const POLL_BACKOFF_STEPS = [0, 1, 3, 7, 15] as const;

export function pollSkipRounds(failures: number): number {
  if (!Number.isFinite(failures) || failures <= 0) return 0;
  const index = Math.min(Math.floor(failures), POLL_BACKOFF_STEPS.length - 1);
  return POLL_BACKOFF_STEPS[index];
}
