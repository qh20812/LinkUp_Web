import { request } from './api'
import type {
  FriendActionResponse,
  FriendListResponse,
  FriendRequestListResponse,
  FriendSuggestionsResponse,
  FriendStatusResponse,
} from '../types'

export const getFriends = (userIdOrPage?: string | number, page?: number, pageSize = 20) => {
  const params = new URLSearchParams()
  if (typeof userIdOrPage === 'string') {
    params.set('user_id', userIdOrPage)
    params.set('page', String(page ?? 1))
  } else {
    params.set('page', String(userIdOrPage ?? 1))
    if (page !== undefined) params.set('page_size', String(page))
  }
  params.set('page_size', String(pageSize))
  return request<FriendListResponse>(`/friends?${params.toString()}`)
}

export const getFriendSuggestions = (page = 1, pageSize = 20) =>
  request<FriendSuggestionsResponse>(`/friends/suggestions?page=${page}&page_size=${pageSize}`)

export const unfriend = (userId: string) =>
  request<FriendActionResponse>(`/friends/${userId}`, {
    method: 'DELETE',
  })

export const getFriendRequests = () =>
  request<FriendRequestListResponse>('/friend-requests')

export const toggleFriendRequest = (userId: string) =>
  request<FriendActionResponse>(`/friend-requests/${userId}`, {
    method: 'POST',
  })

export const acceptFriendRequest = (id: string) =>
  request<FriendActionResponse>(`/friend-requests/${id}/accept`, {
    method: 'PUT',
  })

export const rejectFriendRequest = (id: string) =>
  request<FriendActionResponse>(`/friend-requests/${id}`, {
    method: 'DELETE',
  })

export const getFriendStatus = (userId: string) =>
  request<FriendStatusResponse>(`/friend-status/${userId}`)