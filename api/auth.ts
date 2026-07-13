import { request } from './api'
import type { AuthResponse } from '../types'

export const login = (email: string, password: string) =>
  request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const changePassword = (oldPassword: string, newPassword: string) =>
  request<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  })
