'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { SWRConfig } from 'swr'
import AdminSidebar from '../../components/AdminSidebar'
import AdminNavbar from '../../components/AdminNavbar'
import { NotificationProvider } from '../../contexts/NotificationContext'
import { defaultSWRConfig } from '../../api/swr'
import styles from './layout.module.css'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed))
  }, [collapsed])
  const pathname = usePathname()
  const prevPathname = useRef(pathname)

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

  return (
    <SWRConfig value={{
      ...defaultSWRConfig,
      onError: (err: Error) => {
        if (err.message?.toLowerCase().includes('401') || err.message?.toLowerCase().includes('token')) {
          localStorage.removeItem('token')
          localStorage.removeItem('admin_profile')
          window.location.href = '/login'
        }
      },
    }}>
    <NotificationProvider>
      <div className={styles.layout}>
        <AdminSidebar collapsed={collapsed} mobileOpen={mobileOpen} />

        {mobileOpen && (
          <div
            className={styles.overlay}
            onClick={() => setMobileOpen(false)}
          />
        )}

        <div className={`${styles.content}${collapsed ? ` ${styles.contentCollapsed}` : ''}`}>
          <AdminNavbar onMenuToggle={handleMenuToggle} />
          <main className={styles.main}>{children}</main>
        </div>
      </div>
    </NotificationProvider>
    </SWRConfig>
  )
}