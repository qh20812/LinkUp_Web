import { request } from './api'
import type { ViewProfileResponse } from '../types'

export const getMyProfile = () =>
  request<{ data: ViewProfileResponse }>('/profile')

export const updateProfile = (input: {
  display_name?: string
  avatar_uri?: string
  bio?: string
}) =>
  request<{ message: string; data: ViewProfileResponse }>('/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })

export const uploadAvatar = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  return fetch('/api/media/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(error.error || `HTTP ${res.status}`)
    }
    return res.json()
  })
}
