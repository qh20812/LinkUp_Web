'use client'

import styles from './StoryBar.module.css'
import type { StoryFeedItem, StoryItem } from '../../types'
import ExternalImage from '../ExternalImage'
import { useTranslation } from '../../hooks/useTranslation'
import { useEffect, useState } from 'react'

interface StoryBarProps {
  stories: StoryFeedItem[]
  loading?: boolean
  currentUserId?: string
  onSelectStory: (userId: string, stories: StoryItem[]) => void
  onCreateStory: () => void
  onMuteUser: (userId: string) => void
}

function StoryPreview({ story, viewed }: { story: StoryItem; viewed: boolean }) {
  if (!story.media_uri) {
    return (
      <div className={`${styles.previewFallback} ${viewed ? styles.viewed : ''}`}>
        <i className="bx bx-image-alt" aria-hidden="true" />
        {story.caption && <span className={styles.previewFallbackText}>{story.caption}</span>}
      </div>
    )
  }

  if (story.media_type === 'video') {
    return (
      <video
        className={`${styles.previewMedia} ${viewed ? styles.viewed : ''}`}
        src={story.media_uri}
        muted
        playsInline
        loop
        preload="metadata"
      />
    )
  }

  return (
    <ExternalImage
      src={story.media_uri}
      alt={story.caption}
      className={`${styles.previewMedia} ${viewed ? styles.viewed : ''}`}
    />
  )
}

export default function StoryBar({
  stories,
  loading = false,
  currentUserId,
  onSelectStory,
  onCreateStory,
  onMuteUser,
}: StoryBarProps) {
  const { t } = useTranslation()
  const [menuAnchor, setMenuAnchor] = useState<{ userId: string; top: number; right: number } | null>(null)

  const openMenu = (e: React.MouseEvent<HTMLElement>, userId: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuAnchor({
      userId,
      top: rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right - 12),
    })
  }

  useEffect(() => {
    if (!menuAnchor) return
    const close = () => setMenuAnchor(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [menuAnchor])

  if (loading && stories.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.bar}>
          {['a', 'b', 'c', 'd', 'e', 'f'].map((k) => (
            <div key={k} className={styles.skeletonCard} />
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
          <div
            className={`${styles.storyItem} ${styles.yourStory}`}
            onClick={onCreateStory}
            role="button"
            tabIndex={0}
          >
            <div className={styles.yourStoryCard}>
              <span className={styles.yourStoryIcon}>
                <i className="bx bx-plus" aria-hidden="true" />
              </span>
              <span className={styles.yourStoryLabel}>
                {t('story.yourStory')}
              </span>
            </div>
          </div>
        )}

        {stories.map((item) => {
          const hasViewed = item.stories.every((s) => s.has_viewed)
          const preview = item.stories[0]
          return (
            <div
              key={item.user.id}
              className={`${styles.storyItem} ${styles.previewCard}`}
              onClick={() => onSelectStory(item.user.id, item.stories)}
              onContextMenu={(e) => {
                e.preventDefault()
                if (item.user.id !== currentUserId) openMenu(e, item.user.id)
              }}
            >
              <div className={styles.previewMediaWrap}>
                {preview ? (
                  <StoryPreview story={preview} viewed={hasViewed} />
                ) : (
                  <div className={styles.previewFallback}>
                    <i className="bx bxs-user" aria-hidden="true" />
                  </div>
                )}
                <div className={styles.gradient} />

                {item.user.id !== currentUserId && (
                  <button
                    type="button"
                    className={styles.moreBtn}
                    aria-label={t('story.moreActions')}
                    title={t('story.moreActions')}
                    onClick={(e) => {
                      e.stopPropagation()
                      openMenu(e, item.user.id)
                    }}
                  >
                    <i className="bx bx-dots-vertical-rounded" aria-hidden="true" />
                  </button>
                )}

                <div className={styles.overlay}>
                  <div className={`${styles.ring} ${hasViewed ? styles.ringViewed : ''}`}>
                    <div className={styles.ringInner}>
                      <ExternalImage
                        src={item.user.avatar_uri}
                        alt={item.user.display_name}
                        className={styles.avatarOverlay}
                      />
                    </div>
                  </div>
                  <span className={styles.storyName}>{item.user.display_name}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {menuAnchor && (
        <div
          className={styles.menuBackdrop}
          onClick={(e) => {
            e.stopPropagation()
            setMenuAnchor(null)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            setMenuAnchor(null)
          }}
        >
          <div
            className={styles.menu}
            style={{ top: menuAnchor.top, right: menuAnchor.right }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.menuTitle}>
              {stories.find((s) => s.user.id === menuAnchor.userId)?.user.display_name}
            </div>
            {menuAnchor.userId !== currentUserId && (
              <button
                className={styles.menuItem}
                onClick={() => {
                  setMenuAnchor(null)
                  onMuteUser(menuAnchor.userId)
                }}
              >
                <i className="bx bx-hide" />
                <span>{t('story.muteUser')}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
