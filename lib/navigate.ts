/**
 * Điều hướng cứng sang URL bên ngoài (cổng thanh toán). Tách riêng để test có
 * thể mock — jsdom không cài đặt `window.location.assign`.
 */
export function redirectToExternal(url: string): void {
  window.location.assign(url)
}
