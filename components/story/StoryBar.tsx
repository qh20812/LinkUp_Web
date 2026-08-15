'use client'

import StoryAvatar from './StoryAvatar'
import styles from './StoryBar.module.css'
import type { StoryFeedItem, StoryItem } from '../../types'
import { useTranslation } from '../../hooks/useTranslation'

interface StoryBarProps {
  stories: StoryFeedItem[]
  currentUserId?: string
  onSelectStory: (userId: string, stories: StoryItem[]) => void
  onCreateStory: () => void
}

export default function StoryBar({
  stories,
  currentUserId,
  onSelectStory,
  onCreateStory,
}: StoryBarProps) {
  const { t } = useTranslation()

  if (!currentUserId && stories.length === 0) {
    return null
  }

  return (
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
  )
}
