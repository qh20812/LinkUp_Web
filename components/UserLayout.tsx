'use client'

import React, { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { SWRConfig } from 'swr'
import LeftSidebar from './LeftSidebar'
import UserNavbar from './UserNavbar'
import RightSidebar from './RightSidebar'
import { NotificationProvider } from '../contexts/NotificationContext'
import { PresenceProvider } from '../contexts/PresenceContext'
import { FollowedUserIdsProvider } from '../contexts/FollowContext'
import { defaultSWRConfig } from '../api/swr'
import styles from './UserLayout.module.css'

const LEFT_KEY = 'linkup.sidebar-left-collapsed'
const RIGHT_KEY = 'linkup.sidebar-right-collapsed'

function readPref(key: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(key) === '1'
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMessages = pathname === '/messages'

  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const leftPersistedRef = useRef(false)
  const rightPersistedRef = useRef(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLeftCollapsed(readPref(LEFT_KEY))
    setRightCollapsed(readPref(RIGHT_KEY))
  }, [])

  useEffect(() => {
    if (leftPersistedRef.current) {
      localStorage.setItem(LEFT_KEY, leftCollapsed ? '1' : '0')
    } else {
      leftPersistedRef.current = true
    }
  }, [leftCollapsed])

  useEffect(() => {
    if (rightPersistedRef.current) {
      localStorage.setItem(RIGHT_KEY, rightCollapsed ? '1' : '0')
    } else {
      rightPersistedRef.current = true
    }
  }, [rightCollapsed])

  const hideRight = isMessages || rightCollapsed
  const layoutClass = `${styles.layout}${leftCollapsed ? ` ${styles.layoutLeftCollapsed}` : ''}${hideRight ? ` ${styles.layoutNoRight}` : ''}`

  return (
    <SWRConfig value={defaultSWRConfig}>
      <NotificationProvider>
        <PresenceProvider>
          <FollowedUserIdsProvider>
            <div className={layoutClass}>
              <div className={styles.left}>
                <LeftSidebar
                  collapsed={leftCollapsed}
                  onToggle={() => setLeftCollapsed((prev) => !prev)}
                />
              </div>
              <div className={styles.center}>
                <UserNavbar
                  rightCollapsed={rightCollapsed}
                  onToggleRight={() => setRightCollapsed((prev) => !prev)}
                  showRightToggle={!isMessages}
                />
                {children}
              </div>
              {!hideRight && (
                <div className={styles.right}>
                  <RightSidebar />
                </div>
              )}
            </div>
          </FollowedUserIdsProvider>
        </PresenceProvider>
      </NotificationProvider>
    </SWRConfig>
  )
}
