import { request } from './api'

export interface BlockResponse {
  status: string
  message: string
}

export const blockUser = (userId: string) =>
  request<BlockResponse>('/blocks', {
    method: 'POST',
    body: JSON.stringify({ target_user_id: userId }),
  })

export const getBlockedUsers = () =>
  request<{ blocked_user_id: string; blocked_at: string }[]>('/blocks')
