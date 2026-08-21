import { request } from './api'
import type {
  CommunityListResponse,
  CommunityDetailResponse,
  CommunityMember,
  CommunityRule,
  FeedPost,
} from '../types'

export const listCommunities = (keyword?: string, page = 1, pageSize = 12) => {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (keyword) params.set('keyword', keyword)
  return request<CommunityListResponse>(`/communities?${params.toString()}`)
}

export const listJoinedCommunities = (keyword?: string, page = 1, pageSize = 20) => {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (keyword) params.set('keyword', keyword)
  return request<CommunityListResponse>(`/communities/joined?${params.toString()}`)
}

export const listCreatedCommunities = (keyword?: string, page = 1, pageSize = 20) => {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (keyword) params.set('keyword', keyword)
  return request<CommunityListResponse>(`/communities/created?${params.toString()}`)
}

export const getCommunityDetail = (communityID: string) =>
  request<CommunityDetailResponse>(`/communities/${communityID}`)

export const getCommunityPosts = (communityID: string, cursor?: string, pageSize = 10) => {
  const params = new URLSearchParams({ page_size: String(pageSize) })
  if (cursor) params.set('cursor', cursor)
  return request<{ posts: FeedPost[] }>(`/communities/${communityID}/posts?${params.toString()}`)
}

export const joinCommunity = (communityID: string, code?: string, invitationID?: string) => {
  const body: Record<string, string> = {}
  if (code) body.code = code
  if (invitationID) body.invitation_id = invitationID
  return request<{ message: string }>(`/communities/${communityID}/join`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export const leaveCommunity = (communityID: string) =>
  request<{ message: string }>(`/communities/${communityID}/leave`, {
    method: 'DELETE',
  })

export const getCommunityMembers = (communityID: string) =>
  request<{ members: CommunityMember[] }>(`/communities/${communityID}/members`)

export const getCommunityRules = (communityID: string) =>
  request<{ rules: CommunityRule[] }>(`/communities/${communityID}/rules`)

export const createCommunityRule = (
  communityID: string,
  data: { category: string; title: string; content?: string; position?: number },
) =>
  request<{ rule_id: string }>(`/communities/${communityID}/rules`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateCommunityRule = (
  communityID: string,
  ruleID: string,
  data: { category?: string; title?: string; content?: string; position?: number },
) =>
  request<{ rule_id: string }>(`/communities/${communityID}/rules/${ruleID}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

export const deleteCommunityRule = (communityID: string, ruleID: string) =>
  request<{ message: string }>(`/communities/${communityID}/rules/${ruleID}`, {
    method: 'DELETE',
  })
