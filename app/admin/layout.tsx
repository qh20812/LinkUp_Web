'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import AdminSidebar from '../../components/AdminSidebar'
import AdminNavbar from '../../components/AdminNavbar'
import styles from './layout.module.css'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
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
  )
}
