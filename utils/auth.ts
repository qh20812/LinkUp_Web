import type { UserRole } from '../types'

export function getUserRoleFromToken(): UserRole | null {
  try {
    const token = localStorage.getItem('token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role || null
  } catch {
    return null
  }
}

export function getPostAuthPath(role: UserRole | null | undefined): string {
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return '/admin/dashboard'
  }
  if (role === 'PARTNER') {
    return '/partner/dashboard'
  }
  if (role === 'USER') {
    return '/'
  }
  return '/login'
}