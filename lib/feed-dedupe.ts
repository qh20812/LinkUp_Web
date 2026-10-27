import type { FeedPost } from '@/types'

/**
 * Ẩn bài gốc khi trong danh sách đã có repost của nó — cùng một nội dung thì
 * chỉ hiện một card (card repost, vì kèm ngữ cảnh người share).
 *
 * Giữ nguyên mọi repost, kể cả nhiều người share cùng một bài: đó là các hành
 * động khác nhau, không phải bản trùng.
 */
export function dedupeRepostOriginals(posts: FeedPost[]): FeedPost[] {
  let repostedOriginalIds: Set<string> | null = null
  for (const post of posts) {
    if (!post.shared_from_post_id) continue
    if (!repostedOriginalIds) repostedOriginalIds = new Set()
    repostedOriginalIds.add(post.shared_from_post_id)
  }
  if (!repostedOriginalIds) return posts
  return posts.filter((post) => !repostedOriginalIds.has(post.id))
}
