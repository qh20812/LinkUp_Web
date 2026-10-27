import React from 'react'
import { renderWithProviders, screen, mockLocalStorage, waitFor } from './test-utils'

const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => '/partner/dashboard',
}))

// Layout người dùng thật mở WebSocket + Presence + SWR; ở đây chỉ cần xác nhận
// layout partner ĐI QUA UserLayout (đúng shell Track 3) chứ không dựng chrome
// riêng, nên mock lại thành một khung đánh dấu.
jest.mock('@/components/UserLayout', () => {
  return function MockUserLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="user-layout">{children}</div>
  }
})

jest.mock('@/components/PartnerTabs', () => {
  return function MockPartnerTabs() {
    return <nav data-testid="partner-tabs" />
  }
})

import PartnerLayout from '@/app/partner/layout'

/** Token giả: chỉ cần 3 phần và payload chứa `role` để getUserRoleFromToken đọc. */
function tokenWithRole(role: string): string {
  const payload = Buffer.from(JSON.stringify({ role })).toString('base64')
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`
}

function setRole(role: string | null) {
  if (role === null) {
    window.localStorage.removeItem('token')
    return
  }
  window.localStorage.setItem('token', tokenWithRole(role))
}

describe('PartnerLayout', () => {
  let storage: ReturnType<typeof mockLocalStorage>

  beforeEach(() => {
    storage = mockLocalStorage()
    mockReplace.mockClear()
  })

  afterEach(() => {
    storage.clear()
  })

  it.each(['PARTNER', 'ADMIN', 'SUPER_ADMIN'])('cho %s vào và render trong UserLayout', async (role) => {
    setRole(role)
    renderWithProviders(
      <PartnerLayout>
        <p>noi dung partner</p>
      </PartnerLayout>,
    )

    await waitFor(() => expect(screen.getByText('noi dung partner')).toBeInTheDocument())
    expect(screen.getByTestId('user-layout')).toBeInTheDocument()
    expect(screen.getByTestId('partner-tabs')).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('chặn USER thường và đẩy về trang chủ', async () => {
    setRole('USER')
    renderWithProviders(
      <PartnerLayout>
        <p>noi dung partner</p>
      </PartnerLayout>,
    )

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'))
    expect(screen.queryByText('noi dung partner')).not.toBeInTheDocument()
    expect(screen.queryByTestId('user-layout')).not.toBeInTheDocument()
  })

  it('chặn cả khi chưa đăng nhập (không có token)', async () => {
    setRole(null)
    renderWithProviders(
      <PartnerLayout>
        <p>noi dung partner</p>
      </PartnerLayout>,
    )

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'))
    expect(screen.queryByText('noi dung partner')).not.toBeInTheDocument()
  })
})
