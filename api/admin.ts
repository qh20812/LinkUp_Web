import { request } from "./api";
import type {
  AdminAdListResponse,
  AdPerformance,
  AdminAnalyticsResponse,
  AdminUserListResponse,
  AdminBanUserResponse,
  AdminUserBanInput,
  AdminPostListResponse,
  AdminHidePostInput,
  AdminReportListResponse,
  AdminReportDetailResponse,
  AdminReportReviewInput,
  AdminMediaListResponse,
  AdminReviewMediaInput,
  AdminGroupListResponse,
  AdminGroupDetailResponse,
  AdminCommunityListResponse,
  AdminCommunityDetailResponse,
  AdminModerateInput,
  AdminWarnInput,
  AdminMediaGroupedResponse,
  AdminModerationLogListResponse,
  ViewProfileResponse,
  AdminSettingsResponse,
  AdminSettingsInput,
} from "../types";

// Dashboard
export const getDashboardStats = (
  type?: string,
  startDate?: string,
  endDate?: string
) => {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  return request<AdminAnalyticsResponse>(`/admin/analytics?${params}`);
};

// Users
export const getUsers = (
  page = 1,
  pageSize = 20,
  search?: string,
  status?: "active" | "banned" | "suspended" // <-- SỬA KIỂU DỮ LIỆU CHẶT CHẼ Ở ĐÂY
) => {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (search) params.set("keyword", search);
  if (status) params.set("status", status);
  return request<AdminUserListResponse>(`/admin/users?${params}`);
};

export const updateUserStatus = (id: string, status: string) =>
  request<{ message: string }>(`/admin/users/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });

export const banUser = (id: string, input: AdminUserBanInput) =>
  request<AdminBanUserResponse>(`/admin/users/${id}/ban`, {
    method: "POST",
    body: JSON.stringify(input),
  });

// Posts
export const getPosts = (
  page = 1,
  pageSize = 20,
  search?: string,
  status?: string
) => {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (search) params.set("keyword", search);
  if (status) params.set("status", status);
  return request<AdminPostListResponse>(`/admin/posts?${params}`);
};

export const hidePost = (id: string, input: AdminHidePostInput) =>
  request<{ message: string }>(`/admin/posts/${id}/hide`, {
    method: "PUT",
    body: JSON.stringify(input), // JSON.stringify trực tiếp đối tượng input { reason }
  });

export const updatePostStatus = (id: string, status: string) =>
  request<{ message: string }>(`/admin/posts/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });

// Reports
export const getReports = (
  page = 1,
  pageSize = 20,
  filters?: { keyword?: string; status?: string; target_type?: string }
) => {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (filters?.keyword) params.set("keyword", filters.keyword);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.target_type) params.set("target_type", filters.target_type);
  return request<AdminReportListResponse>(`/admin/reports?${params}`);
};

export const getReport = (id: string) =>
  request<AdminReportDetailResponse>(`/admin/reports/${id}`);

export const reviewReport = (id: string, input: AdminReportReviewInput) =>
  request<{ message: string }>(`/admin/reports/${id}/decision`, {
    method: "POST",
    body: JSON.stringify(input),
  });

// Media
export const getFlaggedMedia = (page = 1, pageSize = 20, status?: string, keyword?: string) => {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (status) params.set("status", status);
  if (keyword) params.set("keyword", keyword);
  return request<AdminMediaListResponse>(`/admin/media/flagged?${params}`);
};

export const reviewMedia = (id: string, input: AdminReviewMediaInput) =>
  request<{ message: string }>(`/admin/media/${id}/review`, {
    method: "POST",
    body: JSON.stringify(input),
  });

// Groups
export const getGroups = (
  page = 1,
  pageSize = 20,
  search?: string,
  status?: string 
) => {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (search) params.set("keyword", search);
  if (status) params.set("status", status); 
  return request<AdminGroupListResponse>(`/admin/groups?${params}`);
};

export const getGroup = (id: string) =>
  request<AdminGroupDetailResponse>(`/admin/groups/${id}`);

export const hideGroup = (id: string, input: AdminModerateInput) =>
  request<{ message: string }>(`/admin/groups/${id}/hide`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const archiveGroup = (id: string, input: AdminModerateInput) =>
  request<{ message: string }>(`/admin/groups/${id}/archive`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const warnGroup = (id: string, input: AdminWarnInput) =>
  request<{ message: string }>(`/admin/groups/${id}/warn`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const deleteGroup = (id: string, input: AdminModerateInput) =>
  request<{ message: string }>(`/admin/groups/${id}`, {
    method: "DELETE",
    body: JSON.stringify(input),
  });

export const unhideGroup = (id: string, input: AdminModerateInput) =>
  request<{ message: string }>(`/admin/groups/${id}/unhide`, {
    method: "POST",
    body: JSON.stringify(input),
  });

// Communities
export const getCommunities = (
  page = 1,
  pageSize = 20,
  search?: string,
  status?: string,
  privacy?: string
) => {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (search) params.set("keyword", search);
  if (status) params.set("status", status);
  if (privacy) params.set("privacy", privacy);
  return request<AdminCommunityListResponse>(`/admin/communities?${params}`);
};

export const getCommunity = (id: string) =>
  request<AdminCommunityDetailResponse>(`/admin/communities/${id}`);

export const hideCommunity = (id: string, input: AdminModerateInput) =>
  request<{ message: string }>(`/admin/communities/${id}/hide`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const archiveCommunity = (id: string, input: AdminModerateInput) =>
  request<{ message: string }>(`/admin/communities/${id}/archive`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const warnCommunity = (id: string, input: AdminWarnInput) =>
  request<{ message: string }>(`/admin/communities/${id}/warn`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const deleteCommunity = (id: string, input: AdminModerateInput) =>
  request<{ message: string }>(`/admin/communities/${id}`, {
    method: "DELETE",
    body: JSON.stringify(input),
  });

export const cleanupRejectedMedia = () =>
  request<{ cleaned: number }>("/admin/media/cleanup-rejected", {
    method: "POST",
  });

export const getMediaGroupedByUser = (page = 1, pageSize = 20, keyword?: string) => {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (keyword) params.set("keyword", keyword);
  return request<AdminMediaGroupedResponse>(`/admin/media/grouped?${params}`);
};

export const unhideCommunity = (id: string) =>
  request<{ message: string }>(`/admin/communities/${id}/unhide`, {
    method: "POST",
  });

export const getCommunityLogs = (id: string, page = 1, pageSize = 20) => {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return request<AdminModerationLogListResponse>(`/admin/communities/${id}/logs?${params}`);
};

export const unarchiveCommunity = (id: string) =>
  request<{ message: string }>(`/admin/communities/${id}/unarchive`, {
    method: "POST",
  });

// Ads
export const getAds = (page = 1, pageSize = 20, keyword?: string, status?: string) => {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (keyword) params.set("keyword", keyword);
  if (status) params.set("status", status);
  return request<AdminAdListResponse>(`/admin/ads?${params}`);
};

export const updateAdStatus = (id: string, status: string) =>
  request<{ message: string }>(`/admin/ads/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const deleteAd = (id: string) =>
  request<{ message: string }>(`/admin/ads/${id}`, {
    method: "DELETE",
  });

export const getAdminProfile = () =>
  request<ViewProfileResponse>("/profile");

export const getAdAnalytics = async (id: string): Promise<{ data: AdPerformance }> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`/ads-management/${id}/analytics`, { headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export const getAdminSettings = () =>
  request<AdminSettingsResponse>('/admin/settings')

export const updateAdminSettings = (input: AdminSettingsInput) =>
  request<{ message: string }>('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
