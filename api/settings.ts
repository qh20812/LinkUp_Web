import { request } from './api'
import type {
  MessageResponse,
  PrivacySettingsResponse,
  SessionsResponse,
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

export const requestEmailChange = (newEmail: string, password: string) =>
  request<MessageResponse>('/settings/email/request', {
    method: 'POST',
    body: JSON.stringify({ new_email: newEmail, password }),
  })

export const verifyEmailChange = (token: string) =>
  request<MessageResponse>('/settings/email/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
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
