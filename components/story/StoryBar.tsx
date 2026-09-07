'use client'

import StoryAvatar from './StoryAvatar'
import styles from './StoryBar.module.css'
import type { StoryFeedItem, StoryItem } from '../../types'
import { useTranslation } from '../../hooks/useTranslation'
import { useState } from 'react'

interface StoryBarProps {
  stories: StoryFeedItem[]
  loading?: boolean
  currentUserId?: string
  scope: 'all' | 'following'
  onScopeChange: (scope: 'all' | 'following') => void
  onSelectStory: (userId: string, stories: StoryItem[]) => void
  onCreateStory: () => void
  onMuteUser: (userId: string) => void
}

export default function StoryBar({
  stories,
  loading = false,
  currentUserId,
  scope,
  onScopeChange,
  onSelectStory,
  onCreateStory,
  onMuteUser,
}: StoryBarProps) {
  const { t } = useTranslation()
  const [menuFor, setMenuFor] = useState<string | null>(null)

  if (loading && stories.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.bar}>
          {['a', 'b', 'c', 'd', 'e', 'f'].map((k) => (
            <div key={k} className={styles.storyItem}>
              <div className={styles.skeletonRing} />
              <div className={styles.skeletonLine} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!currentUserId && stories.length === 0) {
    return null
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        {currentUserId && (
          <div className={styles.storyItem} onClick={onCreateStory}>
            <div className={styles.addIcon}>
              <StoryAvatar
                src=""
                name="Your Story"
                hasStory={false}
                size={56}
              />
              <div className={styles.addBadge}>
                <i className="bx bx-plus" />
              </div>
            </div>
            <span className={styles.storyName}>{t('story.yourStory')}</span>
          </div>
        )}

        {stories.map((item) => {
          const hasViewed = item.stories.every((s) => s.has_viewed)
          return (
            <div
              key={item.user.id}
              className={styles.storyItem}
              onClick={() => onSelectStory(item.user.id, item.stories)}
              onContextMenu={(e) => {
                e.preventDefault()
                setMenuFor(item.user.id)
              }}
            >
              <StoryAvatar
                src={item.user.avatar_uri}
                name={item.user.display_name}
                hasStory
                hasViewed={hasViewed}
                size={56}
              />
              <span className={styles.storyName}>{item.user.display_name}</span>
            </div>
          )
        })}
      </div>

      {menuFor && (
        <div
          className={styles.menuBackdrop}
          onClick={(e) => {
            e.stopPropagation()
            setMenuFor(null)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            setMenuFor(null)
          }}
        >
          <div className={styles.menu} onClick={(e) => e.stopPropagation()}>
            <div className={styles.menuTitle}>
              {stories.find((s) => s.user.id === menuFor)?.user.display_name}
            </div>
            <button
              className={styles.menuItem}
              onClick={() => {
                setMenuFor(null)
                onMuteUser(menuFor)
              }}
            >
              <i className="bx bx-hide" />
              <span>{t('story.muteUser')}</span>
            </button>
          </div>
        </div>
      )}

      {currentUserId && (
        <div className={styles.scopeFilter}>
          <button
            className={`${styles.scopeBtn} ${scope === 'all' ? styles.scopeBtnActive : ''}`}
            onClick={() => onScopeChange('all')}
          >
            {t('story.scopeAll')}
          </button>
          <button
            className={`${styles.scopeBtn} ${scope === 'following' ? styles.scopeBtnActive : ''}`}
            onClick={() => onScopeChange('following')}
          >
            {t('story.scopeFollowing')}
          </button>
        </div>
      )}
    </div>
  )
}