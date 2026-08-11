import { request } from './api'
import type {
  ChatListResponse,
  CreateDirectChatResponse,
  MessageResponse,
} from '../types'

export const listChats = () => request<ChatListResponse>('/chats')

export const createDirectChat = (targetUserId: string) =>
  request<CreateDirectChatResponse>('/chats/direct', {
    method: 'POST',
    body: JSON.stringify({ target_user_id: targetUserId }),
  })

export const deleteChat = (chatId: string) =>
  request<MessageResponse>(`/chats/${chatId}`, { method: 'DELETE' })

export const searchUsers = (keyword: string) =>
  request<{
    users: Array<{ id: string; username: string; display_name: string; avatar_uri: string }>
    message?: string
  }>(`/search?keyword=${encodeURIComponent(keyword)}&type=users`)
