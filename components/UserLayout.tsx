'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { SWRConfig } from 'swr'
import LeftSidebar from './LeftSidebar'
import UserNavbar from './UserNavbar'
import RightSidebar from './RightSidebar'
import { NotificationProvider } from '../contexts/NotificationContext'
import { FollowedUserIdsProvider } from '../contexts/FollowContext'
import { PresenceProvider } from '../contexts/PresenceContext'
import { defaultSWRConfig } from '../api/swr'
import styles from './UserLayout.module.css'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMessages = pathname === '/messages'

  return (
    <SWRConfig value={defaultSWRConfig}>
      <NotificationProvider>
        <PresenceProvider>
          <FollowedUserIdsProvider>
          <div className={`${styles.layout} ${isMessages ? styles.layoutNoRight : ''}`}>
            <div className={styles.left}>
              <LeftSidebar />
            </div>
            <div className={styles.center}>
              <UserNavbar />
              {children}
            </div>
            {!isMessages && (
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
