import type { FeedPost } from '../types'

export interface RemovedPost {
  post: FeedPost | null
  index: number
  posts: FeedPost[]
}

/**
 * Bỏ một bài khỏi danh sách feed, giữ lại vị trí cũ để có thể hoàn tác.
 * Trả về danh sách mới (không sửa mảng đầu vào) + bài đã bỏ.
 */
export function removePostById(posts: FeedPost[], postId: string): RemovedPost {
  const index = posts.findIndex((p) => p.id === postId)
  if (index < 0) {
    return { post: null, index: -1, posts }
  }
  return {
    post: posts[index],
    index,
    posts: [...posts.slice(0, index), ...posts.slice(index + 1)],
  }
}

/**
 * Chèn lại bài vào đúng vị trí cũ (dùng cho "Hoàn tác" ẩn bài).
 * Index vượt quá độ dài hiện tại thì thêm vào cuối; bài đã có thì giữ nguyên.
 */
export function insertPostAt(posts: FeedPost[], index: number, post: FeedPost): FeedPost[] {
  if (posts.some((p) => p.id === post.id)) {
    return posts
  }
  const at = index < 0 ? posts.length : Math.min(index, posts.length)
  return [...posts.slice(0, at), post, ...posts.slice(at)]
}
