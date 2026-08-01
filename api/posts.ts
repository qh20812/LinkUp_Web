import { request } from './api'
import type { FeedResponse, EmojiItem, TrendingHashtag, CreatePostInput, CreatePostResponse } from '../types'

export const getFeedPosts = (cursor: string | null, pageSize = 10, filter?: string) => {
  const params = new URLSearchParams()
  params.set('page_size', String(pageSize))
  if (cursor) params.set('cursor', cursor)
  if (filter) params.set('filter', filter)
  return request<FeedResponse>(`/posts?${params.toString()}`)
}

export const getSavedPosts = (cursor: string | null, pageSize = 10) => {
  const params = new URLSearchParams()
  params.set('page_size', String(pageSize))
  if (cursor) params.set('cursor', cursor)
  return request<FeedResponse>(`/posts/saved?${params.toString()}`)
}

export const getTrendingHashtags = () =>
  request<{ data: TrendingHashtag[] }>('/trending')

export const reactPost = (postId: string, emojiId: string) =>
  request<{ action: string; message: string }>(`/posts/${postId}/react`, {
    method: 'POST',
    body: JSON.stringify({ emoji_id: emojiId }),
  })

export const savePost = (postId: string) =>
  request<{ action: string; message: string }>(`/posts/${postId}/save`, {
    method: 'POST',
  })

export const getEmojis = () =>
  request<{ data: EmojiItem[] }>('/emojis')

export const createPost = ({ title, content, status, files = [] }: CreatePostInput) => {
  const formData = new FormData()
  if (title) formData.append('title', title)
  if (content) formData.append('content', content)
  if (status) formData.append('status', status)
  for (const file of files) formData.append('media', file)

  return fetch('/api/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : ''}`,
    },
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || `HTTP ${res.status}`)
    }
    return (await res.json()) as CreatePostResponse
  })
}
