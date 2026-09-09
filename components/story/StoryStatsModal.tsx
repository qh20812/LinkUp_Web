'use client'

import { useEffect, useRef, useState } from 'react'
import ExternalImage from '../ExternalImage'
import { EmojiImage } from '../messages/EmojiImage'
import styles from './StoryViewer.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import type { StoryAnalytics, StoryAnalyticsViewer } from '../../types'

export function timeAgo(dateStr: string, t: (key: string) => string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return t('post.justNow')
  if (mins < 60) return t('post.minutesAgo').replace('{minutes}', String(mins))
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t('post.hoursAgo').replace('{hours}', String(hrs))
  const days = Math.floor(hrs / 24)
  return t('post.daysAgo').replace('{days}', String(days))
}

function viewerName(v: StoryAnalyticsViewer): string {
  return v.display_name || v.user_id
}

function ViewerAvatar({ src, name }: { src?: string; name: string }) {
  if (src) {
    return <ExternalImage src={src} alt={name} className={styles.statsRowAvatar} />
  }
  return (
    <div className={styles.statsRowAvatar}>
      <i className="bx bxs-user" aria-hidden="true" />
    </div>
  )
}

interface StoryStatsModalProps {
  analytics: StoryAnalytics | null
  loading: boolean
  error: boolean
  emojiList: { id: string; code: string; image_uri: string }[]
  onClose: () => void
}

export default function StoryStatsModal({ analytics, loading, error, emojiList, onClose }: StoryStatsModalProps) {
  const { t } = useTranslation()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<'views' | 'reacts' | 'replies'>('views')
  const [reactTab, setReactTab] = useState<string | null>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    overlay.focus()

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusables = Array.from(
        overlay.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute('disabled'))
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && (active === first || !overlay.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !overlay.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    overlay.addEventListener('keydown', handleTab)

    return () => {
      overlay.removeEventListener('keydown', handleTab)
      previouslyFocused?.focus?.()
    }
  }, [])

  if (loading) {
    return (
      <div ref={overlayRef} tabIndex={-1} className={styles.statsOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-label={t('story.analytics')}>
        <div className={styles.statsModal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.statsHeader}>
            <h3 className={styles.statsTitle}>{t('story.analytics')}</h3>
            <button className={styles.statsClose} onClick={onClose} aria-label={t('common.close')}>
              <i className="bx bx-x" />
            </button>
          </div>
          <div className={styles.statsList}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={styles.statsRow} aria-hidden="true">
                <div className={`${styles.statsRowAvatar} ${styles.skeletonBlock}`} />
                <div className={styles.statsRowBody}>
                  <div className={`${styles.skeletonLine} ${styles.skeletonWide}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonNarrow}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div ref={overlayRef} tabIndex={-1} className={styles.statsOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-label={t('story.analytics')}>
        <div className={styles.statsModal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.statsHeader}>
            <h3 className={styles.statsTitle}>{t('story.analytics')}</h3>
            <button className={styles.statsClose} onClick={onClose} aria-label={t('common.close')}>
              <i className="bx bx-x" />
            </button>
          </div>
          <div className={styles.statsEmpty}>{t('story.analyticsError')}</div>
        </div>
      </div>
    )
  }

  const viewers = analytics.viewers ?? []
  const reactors = reactTab
    ? viewers.filter((v) => v.emoji_id === reactTab)
    : viewers.filter((v) => v.emoji_id)
  const repliers = viewers.filter((v) => (v.messages?.length ?? 0) > 0)

  const reactCounts = new Map<string, number>()
  for (const v of viewers) {
    if (v.emoji_id) reactCounts.set(v.emoji_id, (reactCounts.get(v.emoji_id) ?? 0) + v.click_count)
  }

  return (
    <div ref={overlayRef} tabIndex={-1} className={styles.statsOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-label={t('story.analytics')}>
      <div className={styles.statsModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.statsHeader}>
          <h3 className={styles.statsTitle}>{t('story.analytics')}</h3>
          <button className={styles.statsClose} onClick={onClose} aria-label={t('common.close')}>
            <i className="bx bx-x" />
          </button>
        </div>

        <div className={styles.summaryRow}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryNum}>{analytics.total_views ?? 0}</span>
            <span className={styles.summaryLabel}>{t('story.views')}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryNum}>{analytics.total_shares ?? 0}</span>
            <span className={styles.summaryLabel}>{t('story.shares')}</span>
          </div>
        </div>

        <div className={styles.statsTabs} role="tablist" aria-label={t('story.analytics')}>
          {(['views', 'reacts', 'replies'] as const).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              className={`${styles.statsTab} ${tab === k ? styles.statsTabActive : ''}`}
              onClick={() => setTab(k)}
            >
              {t(`story.statsTab.${k}`)}
            </button>
          ))}
        </div>

        <div className={styles.statsList}>
          {tab === 'views' &&
            viewers.map((v, i) => (
              <div key={`${v.user_id}-${i}`} className={styles.statsRow}>
                <ViewerAvatar src={v.avatar_uri} name={viewerName(v)} />
                <div className={styles.statsRowBody}>
                  <span className={styles.statsRowName}>{viewerName(v)}</span>
                  <span className={styles.statsRowSub}>
                    {timeAgo(v.viewed_at, t)}
                    {Boolean(v.emoji_id) && ' · ' + (emojiList.find((e) => e.id === v.emoji_id)?.code ?? '')}
                  </span>
                </div>
              </div>
            ))}

          {tab === 'reacts' && (
            <>
              <div className={styles.reactFilter}>
                <button
                  className={`${styles.reactFilterBtn} ${reactTab === null ? styles.reactFilterActive : ''}`}
                  onClick={() => setReactTab(null)}
                >
                  {t('story.allReacts')}
                </button>
                {emojiList
                  .filter((e) => reactCounts.has(e.id))
                  .map((e) => (
                    <button
                      key={e.id}
                      className={`${styles.reactFilterBtn} ${reactTab === e.id ? styles.reactFilterActive : ''}`}
                      onClick={() => setReactTab(e.id)}
                    >
                      <EmojiImage emoji={e} className={styles.reactFilterImg} />
                      <span>{reactCounts.get(e.id)}</span>
                    </button>
                  ))}
              </div>
              {reactors.map((v, i) => (
                <div key={`${v.user_id}-${i}`} className={styles.statsRow}>
                  <ViewerAvatar src={v.avatar_uri} name={viewerName(v)} />
                  <div className={styles.statsRowBody}>
                    <span className={styles.statsRowName}>{viewerName(v)}</span>
                    <span className={styles.statsRowSub}>
                      {v.click_count}× {emojiList.find((e) => e.id === v.emoji_id)?.code ?? ''}
                    </span>
                  </div>
                </div>
              ))}
              {reactors.length === 0 && (
                <div className={styles.statsEmpty}>{t('story.noReacts')}</div>
              )}
            </>
          )}

          {tab === 'replies' && (
            <>
              {repliers.map((v, i) => (
                <div key={`${v.user_id}-${i}`} className={styles.statsRow}>
                  <ViewerAvatar src={v.avatar_uri} name={viewerName(v)} />
                  <div className={styles.statsRowBody}>
                    <span className={styles.statsRowName}>{viewerName(v)}</span>
                    {(v.messages ?? []).map((m, j) => (
                      <span key={j} className={styles.statsReply}>{m}</span>
                    ))}
                  </div>
                </div>
              ))}
              {repliers.length === 0 && (
                <div className={styles.statsEmpty}>{t('story.noReplies')}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}