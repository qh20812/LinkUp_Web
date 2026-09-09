'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { SWRConfig } from 'swr'
import LeftSidebar from './LeftSidebar'
import UserNavbar from './UserNavbar'
import RightSidebar from './RightSidebar'
import NotificationBanner from './NotificationBanner'
import { NotificationProvider } from '../contexts/NotificationContext'
import { PresenceProvider } from '../contexts/PresenceContext'
import { FollowedUserIdsProvider } from '../contexts/FollowContext'
import { defaultSWRConfig } from '../api/swr'
import styles from './UserLayout.module.css'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMessages = pathname === '/messages'

  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      setLeftOpen(false)
      setRightOpen(false)
    }
  }, [pathname])

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (!mobile) setLeftOpen(false)
      if (window.innerWidth > 1024) setRightOpen(false)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!leftOpen && !rightOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLeftOpen(false)
        setRightOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [leftOpen, rightOpen])

  const closeDrawers = useCallback(() => {
    setLeftOpen(false)
    setRightOpen(false)
  }, [])

  return (
    <SWRConfig value={defaultSWRConfig}>
      <NotificationProvider>
        <NotificationBanner />
        <PresenceProvider>
          <FollowedUserIdsProvider>
            <div className={`${styles.layout}${isMessages ? ` ${styles.noRight}` : ''}`}>
              <div className={`${styles.left}${leftOpen ? ` ${styles.leftOpen}` : ''}`}>
                <LeftSidebar />
              </div>
              <div className={styles.center}>
                {(!isMessages || isMobile) && (
                  <UserNavbar
                    leftOpen={leftOpen}
                    onToggleLeft={() => setLeftOpen((prev) => !prev)}
                    rightOpen={rightOpen}
                    onToggleRight={() => setRightOpen((prev) => !prev)}
                    showRightToggle={!isMessages}
                  />
                )}
                {children}
              </div>
              {!isMessages && (
                <div className={`${styles.right}${rightOpen ? ` ${styles.rightOpen}` : ''}`}>
                  <RightSidebar />
                </div>
              )}
              {(leftOpen || rightOpen) && (
                <div className={styles.backdrop} onClick={closeDrawers} />
              )}
            </div>
          </FollowedUserIdsProvider>
        </PresenceProvider>
      </NotificationProvider>
    </SWRConfig>
  )
}
