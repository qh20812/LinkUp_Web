import type { UserRole } from '../types'

export interface SidebarNavItem {
  /** i18n key dưới `sidebar.*` */
  key: string
  href: string
  /** Tên icon Boxicons, không kèm tiền tố `bx` */
  icon: string
}

/**
 * Nav chính của LeftSidebar. Tách khỏi component để kiểm thử được mà không phải
 * dựng cả cây provider (NotificationContext mở WebSocket, PresenceContext…).
 */
const BASE_NAV_ITEMS: readonly SidebarNavItem[] = [
  { key: 'home', href: '/', icon: 'bxs-home' },
  { key: 'notifications', href: '/notifications', icon: 'bxs-bell' },
  { key: 'messages', href: '/messages', icon: 'bxs-message-dots' },
  { key: 'friends', href: '/friends', icon: 'bxs-group' },
  { key: 'communities', href: '/communities', icon: 'bxs-chat' },
  { key: 'saved', href: '/saved', icon: 'bxs-bookmark' },
]

/**
 * Mục "Kênh đối tác" chỉ dành cho người có vai trò PARTNER. Đặt ngay trước
 * `profile` để nav giữ 8 mục, không nhét thêm 3 mục con của partner vào đây —
 * điều hướng trong khu partner do `PartnerTabs` đảm nhiệm.
 */
const PARTNER_NAV_ITEM: SidebarNavItem = {
  key: 'partnerHub',
  href: '/partner/dashboard',
  icon: 'bxs-bar-chart-alt-2',
}

const PROFILE_NAV_ITEM: SidebarNavItem = { key: 'profile', href: '/profile', icon: 'bxs-user' }

export function navItemsFor(isPartner: boolean): SidebarNavItem[] {
  const items = [...BASE_NAV_ITEMS]
  if (isPartner) items.push(PARTNER_NAV_ITEM)
  items.push(PROFILE_NAV_ITEM)
  return items
}

/**
 * Mục nào đang active với `pathname` hiện tại. `/partner` là một khu duy nhất
 * (dashboard/ads/packages) nên mọi route con đều giữ mục "Kênh đối tác" sáng.
 */
export function isNavItemActive(item: SidebarNavItem, pathname: string): boolean {
  if (item.href === '/') return pathname === '/'
  if (item.href === '/profile') return pathname === '/profile'
  if (item.href === PARTNER_NAV_ITEM.href) return matchesSegment(pathname, '/partner')
  return matchesSegment(pathname, item.href)
}

/**
 * So khớp theo ranh giới segment: `/messages` active cho `/messages/abc` nhưng
 * KHÔNG active cho `/messages-archive` (startsWith trần sẽ báo sai).
 */
function matchesSegment(pathname: string, href: string): boolean {
  if (pathname === href) return true
  return pathname.startsWith(href.endsWith('/') ? href : `${href}/`)
}

/** Vai trò nào thấy mục partner: chỉ PARTNER (không phải ADMIN/SUPER_ADMIN). */
export function showsPartnerNavItem(role: UserRole | null | undefined): boolean {
  return role === 'PARTNER'
}
