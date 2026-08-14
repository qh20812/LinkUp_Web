import { request, rawRequest, extractErrorMessage } from './api'
import type {
  ChatInviteItem,
  ChatInviteResponse,
  ChatListResponse,
  CreateDirectChatResponse,
  MessageResponse,
} from '../types'

export const listChats = () => request<ChatListResponse>('/chats')

export const listChatInvites = () =>
  request<{ data: ChatInviteItem[] }>('/chats/invites')

export const createDirectChat = (targetUserId: string) =>
  request<CreateDirectChatResponse>('/chats/direct', {
    method: 'POST',
    body: JSON.stringify({ target_user_id: targetUserId }),
  })

export const createChatInvite = (targetUserId: string) =>
  request<{ invite_id: string; message?: string }>('/chats/invite', {
    method: 'POST',
    body: JSON.stringify({ target_user_id: targetUserId }),
  })

export const respondChatInvite = (inviteId: string, accept: boolean) =>
  request<ChatInviteResponse>('/chats/invite/respond', {
    method: 'POST',
    body: JSON.stringify({ invite_id: inviteId, accept }),
  })

// Mở chat với người dùng. Trả về { needInvite: true } nếu đối phương là người lạ
// không cho phép nhắn tin — caller nên gửi lời mời chat.
export async function startDirectChat(
  targetUserId: string,
): Promise<{ needInvite: true } | { chatId: string }> {
  const res = await rawRequest('/chats/direct', {
    method: 'POST',
    body: JSON.stringify({ target_user_id: targetUserId }),
  })
  if (res.ok) {
    const data = (await res.json()) as CreateDirectChatResponse
    return { chatId: data.chat_id }
  }
  const body = await res.json().catch(() => null)
  if (body && body.error === 'chat.NOT_PARTICIPANT') {
    return { needInvite: true }
  }
  throw new Error(await extractErrorMessage(res))
}

export const deleteChat = (chatId: string) =>
  request<MessageResponse>(`/chats/${chatId}`, { method: 'DELETE' })

export const searchFriends = (keyword: string) =>
  request<{
    users: Array<{ id: string; username: string; display_name: string; avatar_uri: string }>
    message?: string
  }>(`/friends/search?keyword=${encodeURIComponent(keyword)}`)

export const searchUsers = (keyword: string) =>
  request<{
    users: Array<{ id: string; username: string; display_name: string; avatar_uri: string }>
    message?: string
  }>(`/search?keyword=${encodeURIComponent(keyword)}&type=users`)