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

/**
 * Trang `/partner/*` là khu của người bán quảng cáo. ADMIN/SUPER_ADMIN vẫn vào
 * được để hỗ trợ/kiểm tra thay đối tác (hành vi này có từ trước), nhưng chỉ
 * PARTNER mới thấy mục "Kênh đối tác" trên sidebar.
 */
export function canAccessPartnerArea(role: UserRole | null | undefined): boolean {
  return role === 'PARTNER' || role === 'ADMIN' || role === 'SUPER_ADMIN'
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