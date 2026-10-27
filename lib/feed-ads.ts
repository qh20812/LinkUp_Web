/** Số bài giữa hai quảng cáo liên tiếp trong feed. */
export const AD_EVERY_N_POSTS = 6

/**
 * Vị trí quảng cáo cho bài thứ `idx` (0-based), hoặc null nếu bài này không
 * kèm quảng cáo. Tất định theo `idx` — không dùng state/effect trong render
 * (trước đây gọi setState ngay trong render khiến quảng cáo nhảy lung tung).
 */
export function adIndexForPost(idx: number, adCount: number): number | null {
  if (adCount <= 0 || idx <= 0) return null
  if ((idx + 1) % AD_EVERY_N_POSTS !== 0) return null
  return Math.floor(idx / AD_EVERY_N_POSTS) % adCount
}

/**
 * Ảnh đại diện của quảng cáo trong feed. API trả `media_list` (model Ad), còn
 * `media_uri` chỉ xuất hiện ở danh sách partner — giữ làm fallback.
 */
export function feedAdImageUrl(ad: {
  media_list?: { url?: string | null }[]
  media_uri?: string | null
} | null | undefined): string | null {
  if (!ad) return null
  const fromList = ad.media_list?.find((m) => !!m?.url)?.url
  if (fromList) return fromList
  return ad.media_uri || null
}
