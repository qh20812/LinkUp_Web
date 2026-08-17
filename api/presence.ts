import { request } from './api'
import type {
  PresenceData,
  BatchPresenceInput,
  BatchPresenceResponse,
  PresenceSettingsResponse,
  UpdatePresenceSettingsInput,
  OnlineUsersResponse,
  OnlineCountResponse,
} from '../types'

export const getPresence = (userId: string) =>
  request<PresenceData>(`/presence/online/${encodeURIComponent(userId)}`)

export const batchGetPresence = (userIds: string[]) =>
  request<BatchPresenceResponse>('/presence/batch', {
    method: 'POST',
    body: JSON.stringify({ user_ids: userIds }),
  })

export const getOnlineUsers = () =>
  request<OnlineUsersResponse>('/presence/online')

export const getOnlineCount = () =>
  request<OnlineCountResponse>('/presence/count')

export const getPresenceSettings = () =>
  request<PresenceSettingsResponse>('/presence/settings')

export const updatePresenceSettings = (input: UpdatePresenceSettingsInput) =>
  request<PresenceSettingsResponse>('/presence/settings', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
