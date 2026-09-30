'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SWRConfig } from 'swr'
import PartnerSidebar from '../../components/PartnerSidebar'
import PartnerNavbar from '../../components/PartnerNavbar'
import { NotificationProvider } from '../../contexts/NotificationContext'
import { defaultSWRConfig, clearSWRCache } from '../../api/swr'
import { clearSession } from '../../api/api'
import { getUserRoleFromToken } from '../../utils/auth'
import styles from './layout.module.css'

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const prevPathname = useRef(pathname)

  useEffect(() => {
    const role = getUserRoleFromToken()
    if (role !== 'PARTNER' && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      router.replace('/')
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthorized(true)
  }, [router])

  useEffect(() => {
    if (localStorage.getItem('sidebar_collapsed') === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(true)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed))
  }, [collapsed])

  const handleMenuToggle = useCallback(() => {
    if (window.innerWidth <= 576) {
      setMobileOpen((prev) => !prev)
    } else {
      setCollapsed((prev) => !prev)
    }
  }, [])

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      setMobileOpen(false)
    }
  }, [pathname])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 576) {
        setMobileOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!authorized) return null

  return (
    <SWRConfig value={{
      ...defaultSWRConfig,
      onError: (err: Error) => {
        if (err.message?.toLowerCase().includes('401') || err.message?.toLowerCase().includes('token')) {
          clearSession()
          clearSWRCache()
          window.location.href = '/login'
        }
      },
    }}>
    <NotificationProvider>
      <div className={styles.layout}>
        <PartnerSidebar collapsed={collapsed} mobileOpen={mobileOpen} />

        {mobileOpen && (
          <div
            className={styles.overlay}
            onClick={() => setMobileOpen(false)}
          />
        )}

        <div className={`${styles.content}${collapsed ? ` ${styles.contentCollapsed}` : ''}`}>
          <PartnerNavbar onMenuToggle={handleMenuToggle} />
          <main className={styles.main}>{children}</main>
        </div>
      </div>
    </NotificationProvider>
    </SWRConfig>
  )
}
