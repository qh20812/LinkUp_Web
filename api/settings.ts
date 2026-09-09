import { request } from './api'
import type {
  AppearanceSettingsResponse,
  MessageResponse,
  PrivacySettingsResponse,
  SessionsResponse,
  UpdateAppearanceInput,
  UpdatePrivacyInput,
  UserStorageInfo,
} from '../types'

export const getPrivacy = () =>
  request<PrivacySettingsResponse>('/settings/privacy')

export const updatePrivacy = (input: UpdatePrivacyInput) =>
  request<PrivacySettingsResponse>('/settings/privacy', {
    method: 'PUT',
    body: JSON.stringify(input),
  })

export const getStorage = () =>
  request<UserStorageInfo>('/settings/storage')

export const getAppearance = () =>
  request<AppearanceSettingsResponse>('/settings/appearance')

export const updateAppearance = (input: UpdateAppearanceInput) =>
  request<AppearanceSettingsResponse>('/settings/appearance', {
    method: 'PUT',
    body: JSON.stringify(input),
  })

export const getSessions = () =>
  request<SessionsResponse>('/settings/sessions')

export const revokeSession = (id: string) =>
  request<MessageResponse>(`/settings/sessions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })

export const revokeOtherSessions = () =>
  request<MessageResponse>('/settings/sessions/revoke-others', {
    method: 'POST',
  })

export const deactivateAccount = (password: string) =>
  request<MessageResponse>('/settings/deactivate', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
