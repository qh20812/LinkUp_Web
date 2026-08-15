import { request, extractErrorMessage } from './api'
import type { StoryFeedItem, StoryItem } from '../types'

export const getFeedStories = () =>
  request<StoryFeedItem[]>('/stories/feed')

export const checkUserStory = (userID: string) =>
  request<{ has_story: boolean }>(`/stories/user/${userID}/active`)

export const getUserStories = (userID: string) =>
  request<{ stories: StoryItem[] }>(`/stories/user/${userID}`)

export const viewStory = (storyID: string) =>
  request<StoryItem>(`/stories/${storyID}`)

export const createStory = (file: File | null, caption: string) => {
  const formData = new FormData()
  if (file) formData.append('file', file)
  formData.append('caption', caption)

  return fetch('/api/stories', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : ''}`,
    },
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      throw new Error(await extractErrorMessage(res))
    }
    return res.json()
  })
}

export const interactStory = (storyID: string, type: string, emojiId?: string, content?: string) =>
  request<{ message: string }>(`/stories/${storyID}/interact`, {
    method: 'POST',
    body: JSON.stringify({ type, emoji_id: emojiId, content }),
  })
