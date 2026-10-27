'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import UserLayout from '../../components/UserLayout'
import PartnerTabs from '../../components/PartnerTabs'
import { getUserRoleFromToken, canAccessPartnerArea } from '../../utils/auth'
import styles from './layout.module.css'

/**
 * Khu partner dùng chung shell với người dùng thường (Track 3: navbar + left
 * sidebar + right sidebar) thay vì một layout quản trị riêng — partner là một
 * vai trò của người dùng, không phải một hệ thống con tách biệt.
 *
 * KHÔNG bọc thêm SWRConfig/NotificationProvider/PresenceProvider ở đây:
 * `UserLayout` đã bọc hết, bọc lại sẽ mở WebSocket thứ hai. Việc đăng xuất khi
 * token hết hạn cũng không cần handler riêng — `request()` trong api/api.ts đã
 * clear session + redirect khi 401 sau khi refresh thất bại.
 */
export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!canAccessPartnerArea(getUserRoleFromToken())) {
      router.replace('/')
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthorized(true)
  }, [router])

  if (!authorized) return null

  return (
    <UserLayout>
      <div className={styles.page}>
        <PartnerTabs />
        {children}
      </div>
    </UserLayout>
  )
}
