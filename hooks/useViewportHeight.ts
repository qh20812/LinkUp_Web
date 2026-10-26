'use client'

import { useEffect } from 'react'

/**
 * Xuất chiều cao visual viewport ra biến CSS `--app-vh` (px) trên <html>.
 *
 * Bàn phím ảo không làm layout viewport co lại trên iOS Safari, và Chrome
 * Android mặc định chỉ co "visual" viewport (`interactive-widget=resizes-visual`)
 * — nên `100dvh` vẫn giữ nguyên chiều cao lúc chưa mở bàn phím. Mọi màn hình
 * dựng theo kiểu hộp cao cố định (workspace chat) sẽ để composer nằm sau bàn
 * phím. `visualViewport.height` đúng trong cả ba chế độ `interactive-widget`,
 * nên CSS dùng `var(--app-vh, 100dvh)` thay cho đơn vị viewport.
 *
 * Bỏ qua khi đang pinch-zoom: lúc đó visual viewport được đo bằng CSS pixel đã
 * chia cho scale, lấy làm chiều cao trang sẽ làm layout sập.
 */
export function useViewportHeight(): void {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const root = document.documentElement
    let frame = 0

    const apply = () => {
      frame = 0
      if (vv.scale > 1.05) return
      root.style.setProperty('--app-vh', `${Math.round(vv.height)}px`)
    }

    // Bàn phím mở/đóng và thanh địa chỉ trượt bắn rất nhiều event liên tiếp;
    // gộp về một lần ghi mỗi frame.
    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(apply)
    }

    apply()
    vv.addEventListener('resize', schedule)
    vv.addEventListener('scroll', schedule)
    window.addEventListener('orientationchange', schedule)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      vv.removeEventListener('resize', schedule)
      vv.removeEventListener('scroll', schedule)
      window.removeEventListener('orientationchange', schedule)
      root.style.removeProperty('--app-vh')
    }
  }, [])
}
