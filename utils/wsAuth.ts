/**
 * Chờ token trong localStorage rồi gọi `onReady` đúng một lần.
 *
 * Login là điều hướng SPA (`router.push`) nên root layout — nơi mount
 * CallProvider/GroupCallProvider — KHÔNG remount. Nếu hook chỉ thử kết nối
 * một lần lúc mount (lúc đó chưa có token), socket cuộc gọi sẽ không bao giờ
 * mở cho tới khi người dùng F5.
 */
export function waitForToken(
  onReady: () => void,
  intervalMs = 1000,
): () => void {
  if (typeof window === 'undefined') return () => {}

  if (window.localStorage.getItem('token')) {
    onReady()
    return () => {}
  }

  const timer = window.setInterval(() => {
    if (!window.localStorage.getItem('token')) return
    window.clearInterval(timer)
    onReady()
  }, intervalMs)

  return () => window.clearInterval(timer)
}
