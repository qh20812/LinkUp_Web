import React from 'react'
import { renderWithProviders, screen, within } from './test-utils'

// usePathname đổi theo từng test; tên biến bắt đầu bằng "mock" để
// babel-plugin-jest-hoist cho phép dùng trong factory của jest.mock.
const mockUsePathname = jest.fn<string, []>()

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
})

// Mock t() trả về chính key: test kiểm chứng component dùng ĐÚNG key i18n,
// không phụ thuộc việc nạp bất đồng bộ vi.json/en.json trong jsdom.
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'vi',
    setLanguage: jest.fn(),
  }),
}))

import PartnerTabs from '@/components/PartnerTabs'

describe('PartnerTabs', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/partner/dashboard')
  })

  it('render đủ 3 tab với href đúng', () => {
    renderWithProviders(<PartnerTabs />)

    const nav = screen.getByRole('navigation')
    const links = within(nav).getAllByRole('link')

    expect(links).toHaveLength(3)
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/partner/dashboard',
      '/partner/ads',
      '/partner/packages',
    ])
  })

  it('dùng đúng key i18n đã có trong locales (không hardcode nhãn)', () => {
    renderWithProviders(<PartnerTabs />)

    expect(screen.getByText('partner.nav.dashboard')).toBeInTheDocument()
    expect(screen.getByText('partner.nav.ads')).toBeInTheDocument()
    expect(screen.getByText('partner.nav.packages')).toBeInTheDocument()
  })

  it('đánh dấu aria-current="page" đúng tab đang mở', () => {
    mockUsePathname.mockReturnValue('/partner/ads')
    renderWithProviders(<PartnerTabs />)

    const current = screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'page')

    expect(current).toHaveLength(1)
    expect(current[0]).toHaveAttribute('href', '/partner/ads')
  })

  it('giữ tab "Quảng cáo" active ở các trang con (tạo mới / sửa)', () => {
    for (const path of ['/partner/ads/new', '/partner/ads/abc-123/edit']) {
      mockUsePathname.mockReturnValue(path)
      const { unmount } = renderWithProviders(<PartnerTabs />)

      const current = screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'page')
      expect(current).toHaveLength(1)
      expect(current[0]).toHaveAttribute('href', '/partner/ads')

      unmount()
    }
  })

  it('không tab nào active khi pathname không thuộc khu partner', () => {
    mockUsePathname.mockReturnValue('/')
    renderWithProviders(<PartnerTabs />)

    expect(
      screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'page'),
    ).toHaveLength(0)
  })

  it('không nhầm route có tiền tố giống (ads-archive không kéo tab Quảng cáo sáng)', () => {
    mockUsePathname.mockReturnValue('/partner/ads-archive')
    renderWithProviders(<PartnerTabs />)

    expect(
      screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'page'),
    ).toHaveLength(0)
  })
})
