import { request, extractErrorMessage } from './api'
import type { StoryAnalytics, StoryFeedItem, StoryItem } from '../types'

export const getFeedStories = () =>
  request<StoryFeedItem[]>('/stories/feed')

export const checkUserStory = (userID: string) =>
  request<{ has_story: boolean }>(`/stories/user/${userID}/active`)

export const getUserStories = (userID: string) =>
  request<{ stories: StoryItem[] }>(`/stories/user/${userID}`)

export const viewStory = (storyID: string) =>
  request<StoryItem>(`/stories/${storyID}`)

export const deleteStory = (storyID: string) =>
  request<{ message: string }>(`/stories/${storyID}`, { method: 'DELETE' })

export const getStoryAnalytics = (storyID: string) =>
  request<StoryAnalytics>(`/stories/${storyID}/analytics`)

export const toggleMuteStoryUser = (targetUserID: string) =>
  request<{ muted: boolean }>(`/stories/mutes/${targetUserID}`, { method: 'PUT' })

export interface StoryDraftItem {
  file: File | null
  caption: string
}

export const createStory = async ({ file, caption }: StoryDraftItem) => {
  const res = await createStories([{ file, caption }])
  return res[0]
}

export const createStories = (items: StoryDraftItem[]) => {
  const formData = new FormData()
  const fileItems = items.filter((item) => item.file !== null)
  fileItems.forEach((item) => {
    formData.append('file', item.file as File)
    formData.append('captions', item.caption)
  })
  if (fileItems.length === 0) {
    formData.append('caption', items[0]?.caption ?? '')
  }

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
    const data: unknown = await res.json()
    if (Array.isArray(data)) return data as StoryItem[]
    return [data] as StoryItem[]
  })
}

export const interactStory = (storyID: string, type: string, emojiId?: string, content?: string) =>
  request<{ message: string }>(`/stories/${storyID}/interact`, {
    method: 'POST',
    body: JSON.stringify({ type, emoji_id: emojiId, content }),
  })

export const reactStory = (storyID: string, emojiId: string) =>
  interactStory(storyID, 'react', emojiId)

export const shareStory = (storyID: string) =>
  interactStory(storyID, 'share')
