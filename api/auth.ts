import { request } from './api'
import type { AuthResponse, RegisterResponse, VerifyEmailResponse, ResendVerificationResponse, ForgotPasswordResponse, VerifyResetTokenResponse, ResetPasswordResponse, TokenPayload } from '../types'

export const login = (email: string, password: string) =>
  request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const register = (displayName: string, email: string, password: string) =>
  request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ display_name: displayName, email, password }),
  })

export const googleLogin = (idToken: string) =>
  request<AuthResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  })

export const verifyEmail = (token: string) =>
  request<VerifyEmailResponse>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })

export const resendVerification = (email: string) =>
  request<ResendVerificationResponse>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

export const forgotPassword = (email: string) =>
  request<ForgotPasswordResponse>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

export const verifyResetToken = (token: string) =>
  request<VerifyResetTokenResponse>('/auth/verify-reset-token', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })

export const resetPassword = (token: string, newPassword: string) =>
  request<ResetPasswordResponse>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword }),
  })

export const changePassword = (oldPassword: string, newPassword: string) =>
  request<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  })

export const logout = () =>
  request<{ message: string }>('/auth/logout', { method: 'POST' })

export function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      user_id: payload.user_id,
      email: payload.email,
      role: payload.role,
      token_type: payload.token_type,
      token_version: payload.token_version,
    }
  } catch {
    return null
  }
}

export function getTokenPayload(): TokenPayload | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('token')
  if (!token) return null
  return decodeToken(token)
}
