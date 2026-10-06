// ===== EmojiFYI (emojifyi.com) — CHỈ giữ helper nhận diện URL cũ =====
// Picker emoji mới lấy từ backend (GET /emojis, render ký tự native), không còn
// gọi API hay CDN emojifyi. Các helper dưới đây GIỮ LẠI để render nội dung cũ
// đã lưu URL cdn.emojifyi.com trong DB (post/tin nhắn/bio).

// ===== Nhận diện URL emojifyi trong text nội dung =====

const EMOJIFYI_URL_RE = /https?:\/\/cdn\.emojifyi\.com\/images\/platforms\/[^\s]+/gi

export function isEmojifyiUrl(url: string): boolean {
  return /https?:\/\/cdn\.emojifyi\.com\/images\/platforms\//i.test(url)
}

/** Cắt các URL emojifyi ra khỏi nội dung (trả về text thuần còn lại). */
export function stripEmojifyiUrls(text: string): string {
  return text.replace(EMOJIFYI_URL_RE, '').replace(/\s+/g, ' ').trim()
}

/** True nếu toàn bộ nội dung chỉ gồm 1 URL emojifyi (+ khoảng trắng). */
export function isSingleEmojifyiUrl(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  EMOJIFYI_URL_RE.lastIndex = 0
  const m = EMOJIFYI_URL_RE.exec(trimmed)
  if (!m || m[0] !== trimmed) return false
  return stripEmojifyiUrls(trimmed) === ''
}

/**
 * onError cho ảnh legacy (CDN ngoài có thể trả 429 khi dồn request).
 * Retry tối đa 3 lần với delay tăng dần + jitter để né storm đồng pha;
 * quá số lượt thì im lặng (giữ alt/broken icon).
 */
export function retryImgOnFail(e: unknown): void {
  const target = (e as { currentTarget?: EventTarget | null } | null)?.currentTarget
  if (!(target instanceof HTMLImageElement)) return
  const img = target
  const tries = Number(img.dataset.retry ?? '0')
  if (tries >= 3) return
  img.dataset.retry = String(tries + 1)
  const base = img.dataset.src || img.src
  img.dataset.src = base
  const delay = 500 * 2 ** tries + Math.floor(Math.random() * 600)
  window.setTimeout(() => {
    if (!img.isConnected) return
    img.src = `${base}${base.includes('?') ? '&' : '?'}retry=${tries + 1}`
  }, delay)
}
