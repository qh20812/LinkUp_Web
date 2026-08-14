import { request, extractErrorMessage } from './api'
import type { ViewProfileResponse } from '../types'

export const getMyProfile = () =>
  request<ViewProfileResponse>('/profile')

export const getProfileByUserID = (userID: string) =>
  request<ViewProfileResponse>(`/profile/${userID}`)

export const updateProfile = (input: {
  display_name?: string
  avatar_uri?: string
  bio?: string
  is_private_profile?: boolean
  is_private_posts?: boolean
  allow_stranger_friend_request?: boolean
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
      throw new Error(await extractErrorMessage(res))
    }
    return res.json()
  })
}
