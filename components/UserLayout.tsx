'use client'

import React, { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { SWRConfig } from 'swr'
import LeftSidebar from './LeftSidebar'
import UserNavbar from './UserNavbar'
import RightSidebar from './RightSidebar'
import { NotificationProvider } from '../contexts/NotificationContext'
import { PresenceProvider } from '../contexts/PresenceContext'
import { CallProvider } from '../contexts/CallContext'
import CallOverlay from './calls/CallOverlay'
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
          <CallProvider>
            <FollowedUserIdsProvider>
            <div className={layoutClass}>
              <div className={styles.left}>
                <LeftSidebar collapsed={leftCollapsed} />
              </div>
              <div className={styles.center}>
                <UserNavbar
                  leftCollapsed={leftCollapsed}
                  rightCollapsed={rightCollapsed}
                  onToggleLeft={() => setLeftCollapsed((prev) => !prev)}
                  onToggleRight={() => setRightCollapsed((prev) => !prev)}
                />
                {children}
              </div>
              {!hideRight && (
                <div className={styles.right}>
                  <RightSidebar />
                </div>
              )}
            </div>
            <CallOverlay />
            </FollowedUserIdsProvider>
          </CallProvider>
        </PresenceProvider>
      </NotificationProvider>
    </SWRConfig>
  )
}
