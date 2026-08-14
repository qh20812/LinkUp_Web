import { request } from './api'
import type {
  FollowSuggestionsResponse,
  FollowToggleResponse,
  FollowListResponse,
} from '../types'

export const getFollowSuggestions = (page = 1, pageSize = 5) =>
  request<FollowSuggestionsResponse>(`/follow/suggestions?page=${page}&page_size=${pageSize}`)

export const followUser = (userId: string) =>
  request<FollowToggleResponse>(`/follow/${userId}`, {
    method: 'POST',
  })

export const getFollowStats = (userId: string) =>
  request<{ follower_count: number; following_count: number; is_following?: boolean }>(`/follow/stats/${userId}`)

export const getFollowers = (userId: string, page = 1, pageSize = 20) =>
  request<FollowListResponse>(`/follow/${userId}/followers?page=${page}&page_size=${pageSize}`)

export const getFollowing = (userId: string, page = 1, pageSize = 20) =>
  request<FollowListResponse>(`/follow/${userId}/following?page=${page}&page_size=${pageSize}`)
