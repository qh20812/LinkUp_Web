import { canAccessPartnerArea, getPostAuthPath } from '@/utils/auth'
import type { UserRole } from '@/types'

describe('canAccessPartnerArea', () => {
  it('cho PARTNER vào khu quảng cáo', () => {
    expect(canAccessPartnerArea('PARTNER')).toBe(true)
  })

  it('giữ quyền hỗ trợ cho ADMIN và SUPER_ADMIN', () => {
    expect(canAccessPartnerArea('ADMIN')).toBe(true)
    expect(canAccessPartnerArea('SUPER_ADMIN')).toBe(true)
  })

  it('chặn người dùng thường và trạng thái chưa đăng nhập', () => {
    expect(canAccessPartnerArea('USER')).toBe(false)
    expect(canAccessPartnerArea(null)).toBe(false)
    expect(canAccessPartnerArea(undefined)).toBe(false)
  })
})

describe('getPostAuthPath', () => {
  it('điều hướng theo vai trò mạnh nhất trong token', () => {
    const cases: Array<[UserRole | null | undefined, string]> = [
      ['SUPER_ADMIN', '/admin/dashboard'],
      ['ADMIN', '/admin/dashboard'],
      ['PARTNER', '/partner/dashboard'],
      ['USER', '/'],
      [null, '/login'],
    ]

    for (const [role, expected] of cases) {
      expect(getPostAuthPath(role)).toBe(expected)
    }
  })
})
