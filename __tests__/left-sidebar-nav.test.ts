import {
  navItemsFor,
  isNavItemActive,
  showsPartnerNavItem,
  type SidebarNavItem,
} from '@/components/leftSidebarNav'
import type { UserRole } from '@/types'

const hrefs = (items: SidebarNavItem[]) => items.map((i) => i.href)

describe('navItemsFor', () => {
  it('người dùng thường thấy 7 mục, không có mục partner', () => {
    const items = navItemsFor(false)

    expect(items).toHaveLength(7)
    expect(hrefs(items)).not.toContain('/partner/dashboard')
    expect(hrefs(items)).toEqual([
      '/',
      '/notifications',
      '/messages',
      '/friends',
      '/communities',
      '/saved',
      '/profile',
    ])
  })

  it('partner thấy thêm đúng 1 mục, đứng ngay trước profile', () => {
    const items = navItemsFor(true)

    expect(items).toHaveLength(8)
    const partnerIndex = hrefs(items).indexOf('/partner/dashboard')
    const profileIndex = hrefs(items).indexOf('/profile')

    expect(partnerIndex).toBeGreaterThan(-1)
    expect(profileIndex).toBe(partnerIndex + 1)
  })

  it('không có href hay key trùng nhau (React key + Link target)', () => {
    for (const isPartner of [false, true]) {
      const items = navItemsFor(isPartner)

      expect(new Set(hrefs(items)).size).toBe(items.length)
      expect(new Set(items.map((i) => i.key)).size).toBe(items.length)
    }
  })

  it('mục partner dùng key i18n đã có (`sidebar.partnerHub`) và icon không kèm tiền tố bx', () => {
    const partnerItem = navItemsFor(true).find((i) => i.href === '/partner/dashboard')

    expect(partnerItem?.key).toBe('partnerHub')
    // LeftSidebar render `<i className={`bx ${item.icon}`} />` — thêm "bx " vào
    // icon sẽ ra class "bx bx bx-..." và mất glyph.
    expect(partnerItem?.icon).toBe('bxs-bar-chart-alt-2')
  })

  it('trả về mảng mới, không để lộ tham chiếu tới hằng số nội bộ', () => {
    const first = navItemsFor(false)
    first.push({ key: 'x', href: '/x', icon: 'bx-x' })

    expect(navItemsFor(false)).toHaveLength(7)
  })
})

describe('isNavItemActive', () => {
  const item = (href: string): SidebarNavItem => ({ key: 'k', href, icon: 'bx-x' })

  it('home chỉ active đúng "/"', () => {
    expect(isNavItemActive(item('/'), '/')).toBe(true)
    expect(isNavItemActive(item('/'), '/friends')).toBe(false)
  })

  it('profile chỉ active đúng "/profile" (không active ở profile người khác)', () => {
    expect(isNavItemActive(item('/profile'), '/profile')).toBe(true)
    expect(isNavItemActive(item('/profile'), '/profile/user-1')).toBe(false)
  })

  it('các mục thường active cả ở route con', () => {
    expect(isNavItemActive(item('/notifications'), '/notifications')).toBe(true)
    expect(isNavItemActive(item('/messages'), '/messages/abc')).toBe(true)
    expect(isNavItemActive(item('/communities'), '/communities')).toBe(true)
  })

  it('"Kênh đối tác" sáng ở cả 3 trang con lẫn form tạo/sửa quảng cáo', () => {
    for (const path of [
      '/partner/dashboard',
      '/partner/ads',
      '/partner/ads/new',
      '/partner/ads/abc-123/edit',
      '/partner/packages',
    ]) {
      expect(isNavItemActive(item('/partner/dashboard'), path)).toBe(true)
    }
  })

  it('"Kênh đối tác" không sáng ở ngoài khu partner', () => {
    expect(isNavItemActive(item('/partner/dashboard'), '/')).toBe(false)
    expect(isNavItemActive(item('/partner/dashboard'), '/partners')).toBe(false)
  })

  it('không match theo tiền tố nửa vời (không dùng startsWith trần)', () => {
    expect(isNavItemActive(item('/messages'), '/messages-archive')).toBe(false)
    expect(isNavItemActive(item('/friends'), '/friendship')).toBe(false)
  })
})

describe('showsPartnerNavItem', () => {
  it('chỉ PARTNER thấy mục partner trên sidebar', () => {
    const cases: Array<[UserRole | null | undefined, boolean]> = [
      ['PARTNER', true],
      ['USER', false],
      // ADMIN/SUPER_ADMIN vào được /partner để hỗ trợ, nhưng sidebar của họ
      // không có mục này — tránh trộn việc quản trị với việc bán quảng cáo.
      ['ADMIN', false],
      ['SUPER_ADMIN', false],
      [null, false],
      [undefined, false],
    ]

    for (const [role, expected] of cases) {
      expect(showsPartnerNavItem(role)).toBe(expected)
    }
  })
})
