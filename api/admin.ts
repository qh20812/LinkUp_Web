import { request } from './api'
import type {
  ApiResponse,
  PaginatedResponse,
  DashboardStats,
  User,
  Post,
  Report,
  Media,
  Group,
  Community,
} from '../types'

// Dashboard
export const getDashboardStats = () =>
  request<ApiResponse<DashboardStats>>('/admin/dashboard/stats')

// Users
export const getUsers = (page = 1, pageSize = 20, search?: string) =>
  request<ApiResponse<PaginatedResponse<User>>>(
    `/admin/users?page=${page}&pageSize=${pageSize}${search ? `&search=${search}` : ''}`
  )

export const getUser = (id: string) =>
  request<ApiResponse<User>>(`/admin/users/${id}`)

export const banUser = (id: string, reason: string, duration: number) =>
  request<ApiResponse<User>>(`/admin/users/${id}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason, duration }),
  })

export const updateUserStatus = (id: string, status: string) =>
  request<ApiResponse<User>>(`/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

// Posts
export const getPosts = (page = 1, pageSize = 20, search?: string) =>
  request<ApiResponse<PaginatedResponse<Post>>>(
    `/admin/posts?page=${page}&pageSize=${pageSize}${search ? `&search=${search}` : ''}`
  )

export const getPost = (id: string) =>
  request<ApiResponse<Post>>(`/admin/posts/${id}`)

export const hidePost = (id: string, reason: string) =>
  request<ApiResponse<Post>>(`/admin/posts/${id}/hide`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })

export const updatePostStatus = (id: string, status: string) =>
  request<ApiResponse<Post>>(`/admin/posts/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

// Reports
export const getReports = (page = 1, pageSize = 20, search?: string) =>
  request<ApiResponse<PaginatedResponse<Report>>>(
    `/admin/reports?page=${page}&pageSize=${pageSize}${search ? `&search=${search}` : ''}`
  )

export const getReport = (id: string) =>
  request<ApiResponse<Report>>(`/admin/reports/${id}`)

export const reviewReport = (id: string, action: string, note?: string) =>
  request<ApiResponse<Report>>(`/admin/reports/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ action, note }),
  })

// Media
export const getMedia = (page = 1, pageSize = 20, search?: string) =>
  request<ApiResponse<PaginatedResponse<Media>>>(
    `/admin/media?page=${page}&pageSize=${pageSize}${search ? `&search=${search}` : ''}`
  )

export const approveMedia = (id: string) =>
  request<ApiResponse<Media>>(`/admin/media/${id}/approve`, { method: 'POST' })

export const rejectMedia = (id: string, reason: string) =>
  request<ApiResponse<Media>>(`/admin/media/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })

// Groups
export const getGroups = (page = 1, pageSize = 20, search?: string) =>
  request<ApiResponse<PaginatedResponse<Group>>>(
    `/admin/groups?page=${page}&pageSize=${pageSize}${search ? `&search=${search}` : ''}`
  )

export const getGroup = (id: string) =>
  request<ApiResponse<Group>>(`/admin/groups/${id}`)

export const hideGroup = (id: string) =>
  request<ApiResponse<Group>>(`/admin/groups/${id}/hide`, { method: 'POST' })

export const archiveGroup = (id: string) =>
  request<ApiResponse<Group>>(`/admin/groups/${id}/archive`, { method: 'POST' })

export const warnGroup = (id: string, reason: string) =>
  request<ApiResponse<Group>>(`/admin/groups/${id}/warn`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })

export const deleteGroup = (id: string) =>
  request<ApiResponse<Group>>(`/admin/groups/${id}`, { method: 'DELETE' })

// Communities
export const getCommunities = (page = 1, pageSize = 20, search?: string) =>
  request<ApiResponse<PaginatedResponse<Community>>>(
    `/admin/communities?page=${page}&pageSize=${pageSize}${search ? `&search=${search}` : ''}`
  )

export const getCommunity = (id: string) =>
  request<ApiResponse<Community>>(`/admin/communities/${id}`)

export const hideCommunity = (id: string) =>
  request<ApiResponse<Community>>(`/admin/communities/${id}/hide`, { method: 'POST' })

export const archiveCommunity = (id: string) =>
  request<ApiResponse<Community>>(`/admin/communities/${id}/archive`, { method: 'POST' })

export const warnCommunity = (id: string, reason: string) =>
  request<ApiResponse<Community>>(`/admin/communities/${id}/warn`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })

export const deleteCommunity = (id: string) =>
  request<ApiResponse<Community>>(`/admin/communities/${id}`, { method: 'DELETE' })
