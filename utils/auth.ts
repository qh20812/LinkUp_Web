import type { UserRole } from '../types'

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