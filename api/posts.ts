import { request, extractErrorMessage } from './api'
import type {
  FeedPost,
  FeedResponse,
  EmojiItem,
  TrendingHashtag,
  CreatePostInput,
  CreatePostResponse,
  CommentListResponse,
  CreateCommentResponse,
  UserMediaResponse,
} from '../types'

export const getFeedPosts = (cursor: string | null, pageSize = 10, filter?: string) => {
  const params = new URLSearchParams()
  params.set('page_size', String(pageSize))
  if (cursor) params.set('cursor', cursor)
  if (filter) params.set('filter', filter)
  return request<FeedResponse>(`/posts?${params.toString()}`)
}

export const getPostDetail = (postId: string) =>
  request<{ data: FeedPost }>(`/posts/${postId}`)

export const getComments = (postId: string, page = 1, pageSize = 10, sort: string = 'newest') => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('page_size', String(pageSize))
  params.set('sort', sort)
  return request<CommentListResponse>(`/posts/${postId}/comments?${params.toString()}`)
}

export const createComment = (postId: string, content: string, parentId?: string) =>
  request<CreateCommentResponse>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, ...(parentId ? { parent_id: parentId } : {}) }),
  })

export const sharePost = (postId: string, content?: string) =>
  request<{ message: string }>(`/posts/${postId}/share`, {
    method: 'POST',
    body: JSON.stringify({ content: content ?? '' }),
  })

export const deletePost = (postId: string) =>
  request<{ message: string }>(`/posts/${postId}`, {
    method: 'DELETE',
  })

export const getSavedPosts = (cursor: string | null, pageSize = 10) => {
  const params = new URLSearchParams()
  params.set('page_size', String(pageSize))
  if (cursor) params.set('cursor', cursor)
  return request<FeedResponse>(`/posts/saved?${params.toString()}`)
}

export const getUserPosts = (userID: string, cursor: string | null, pageSize = 10) => {
  const params = new URLSearchParams()
  params.set('page_size', String(pageSize))
  if (cursor) params.set('cursor', cursor)
  return request<FeedResponse>(`/posts/user/${userID}?${params.toString()}`)
}

export const getTrendingHashtags = () =>
  request<{ data: TrendingHashtag[] }>('/trending')

export const reactPost = (postId: string, emojiId: string) =>
  request<{ action: string; message: string }>(`/posts/${postId}/react`, {
    method: 'POST',
    body: JSON.stringify({ emoji_id: emojiId }),
  })

export const toggleCommentReaction = (commentId: string, emojiId: string) =>
  request<{ action: string }>(`/posts/comments/${commentId}/react`, {
    method: 'POST',
    body: JSON.stringify({ emoji_id: emojiId }),
  })

export const savePost = (postId: string) =>
  request<{ action: string; message: string }>(`/posts/${postId}/save`, {
    method: 'POST',
  })

export const getEmojis = () =>
  request<{ data: EmojiItem[] }>('/emojis')

export const createPost = ({ title, content, status, files = [], gifUrl, communityID }: CreatePostInput) => {
  const formData = new FormData()
  if (title) formData.append('title', title)
  if (content) formData.append('content', content)
  if (status) formData.append('status', status)
  if (gifUrl) formData.append('gif_url', gifUrl)
  if (communityID) formData.append('community_id', communityID)
  for (const file of files) formData.append('media', file)

  return fetch('/api/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : ''}`,
    },
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res))
    }
    return (await res.json()) as CreatePostResponse
  })
}

export const pinPost = (postId: string) =>
  request<{ message: string }>(`/posts/${postId}/pin`, {
    method: 'POST',
  })

export const unpinPost = (postId: string) =>
  request<{ message: string }>(`/posts/${postId}/pin`, {
    method: 'DELETE',
  })

export const getUserMedia = (userID: string, page = 1, pageSize = 20) => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('page_size', String(pageSize))
  return request<UserMediaResponse>(`/posts/user/${userID}/media?${params.toString()}`)
}
