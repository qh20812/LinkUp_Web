export interface User {
  id: string
  username: string
  email: string
  avatar?: string
  status: 'active' | 'banned' | 'suspended'
  createdAt: string
}

export interface Post {
  id: string
  title: string
  author: User
  status: 'visible' | 'hidden' | 'removed'
  views: number
  likes: number
  comments: number
  createdAt: string
}

export interface Report {
  id: string
  reporter: User
  targetType: 'user' | 'post' | 'comment' | 'group' | 'community'
  targetId: string
  reportType: string
  reason: string
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  createdAt: string
}

export interface Media {
  id: string
  user: User
  fileType: 'image' | 'video' | 'audio'
  url: string
  status: 'normal' | 'flagged' | 'rejected'
  createdAt: string
}

export interface Group {
  id: string
  name: string
  creator: User
  members: number
  status: 'active' | 'hidden' | 'archived' | 'warned'
  createdAt: string
}

export interface Community {
  id: string
  name: string
  creator: User
  members: number
  privacy: 'public' | 'private'
  status: 'active' | 'hidden' | 'archived' | 'warned'
  createdAt: string
}

export interface DashboardStats {
  totalUsers: number
  totalPosts: number
  totalReports: number
  generatedAt: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
