'use client'

import React from 'react'
import { SWRConfig } from 'swr'
import LeftSidebar from './LeftSidebar'
import UserNavbar from './UserNavbar'
import RightSidebar from './RightSidebar'
import { NotificationProvider } from '../contexts/NotificationContext'
import { FollowedUserIdsProvider } from '../contexts/FollowContext'
import { defaultSWRConfig } from '../api/swr'
import styles from './UserLayout.module.css'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={defaultSWRConfig}>
      <NotificationProvider>
        <FollowedUserIdsProvider>
        <div className={styles.layout}>
          <div className={styles.left}>
            <LeftSidebar />
          </div>
          <div className={styles.center}>
            <UserNavbar />
            {children}
          </div>
          <div className={styles.right}>
            <RightSidebar />
          </div>
        </div>
        </FollowedUserIdsProvider>
      </NotificationProvider>
    </SWRConfig>
  )
}
