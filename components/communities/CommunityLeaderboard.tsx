'use client'

import useSWR from 'swr'
import ExternalImage from '../ExternalImage'
import { useAuth } from '../../hooks/useAuth'
import { useTranslation } from '../../hooks/useTranslation'
import { getLeaderboard, getMyContribution } from '../../api/contribution'
import styles from './CommunityLeaderboard.module.css'
import type { ContributionSummary, LeaderboardEntry } from '../../types'

interface CommunityLeaderboardProps {
  communityID: string
  isMember: boolean
}

interface LeaderboardResponse {
  page: number
  page_size: number
  data: LeaderboardEntry[]
}

const STAT_ITEMS: { key: keyof ContributionSummary; icon: string; labelKey: string }[] = [
  { key: 'valid_posts', icon: 'bx-edit-alt', labelKey: 'contribution.validPosts' },
  { key: 'quality_comments', icon: 'bx-comment-detail', labelKey: 'contribution.qualityComments' },
  { key: 'positive_reactions', icon: 'bx-heart', labelKey: 'contribution.positiveReactions' },
  { key: 'event_participations', icon: 'bx-flag', labelKey: 'contribution.eventParticipations' },
]

function SkeletonBoard() {
  return (
    <div className={styles.podium} aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={styles.skeletonPodium}>
          <div className={styles.skeletonAvatar} />
          <div className={styles.skeletonLine} style={{ width: '70%' }} />
          <div className={styles.skeletonLine} style={{ width: '45%' }} />
        </div>
      ))}
    </div>
  )
}

export default function CommunityLeaderboard({ communityID, isMember }: CommunityLeaderboardProps) {
  const { t, language } = useTranslation()
  const { user } = useAuth()
  const locale = language === 'en' ? 'en-GB' : 'vi-VN'

  const { data, isLoading, error } = useSWR<LeaderboardResponse>(
    `/communities/${communityID}/contributions/leaderboard?page=1&page_size=20`,
    () => getLeaderboard(communityID, 1, 20),
  )

  const { data: mineData } = useSWR<{ data: ContributionSummary }>(
    isMember ? `/communities/${communityID}/contributions/me` : null,
    () => getMyContribution(communityID),
  )

  const entries = data?.data ?? []
  const mine = mineData?.data
  const podium = entries.slice(0, 3)
  const rest = entries.slice(3)

  const renderBadge = (badgeType: string | null | undefined) =>
    badgeType ? (
      <span className={styles.badgeChip}>
        <i className="bx bxs-star" aria-hidden /> {t('contribution.topContributor')}
      </span>
    ) : null

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>
          <i className="bx bx-medal" aria-hidden /> {t('contribution.leaderboardBadge')}
        </span>
        <h2 className={styles.title}>{t('contribution.leaderboardTitle')}</h2>
        <p className={styles.subtitle}>{t('contribution.leaderboardSubtitle')}</p>
      </div>

      {isLoading ? (
        <SkeletonBoard />
      ) : error ? (
        <div className={styles.empty} role="alert">
          <div className={styles.emptyIconWrap} aria-hidden>
            <i className="bx bx-error" />
          </div>
          <p className={styles.emptyTitle}>{t('contribution.loadError')}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIconWrap} aria-hidden>
            <i className="bx bx-bar-chart-alt-2" />
          </div>
          <p className={styles.emptyTitle}>{t('contribution.noLeaderboard')}</p>
          <p className={styles.emptyHint}>{t('contribution.noLeaderboardHint')}</p>
        </div>
      ) : (
        <div className={`${styles.layout} ${isMember ? '' : styles.layoutSingle}`}>
          <div className={styles.board}>
            <div className={`${styles.podium} ${podium.length < 3 ? styles.podiumFew : ''}`}>
              {podium.map(entry => (
                <article
                  key={entry.user_id}
                  className={`${styles.podiumCard} ${styles[`podium${entry.rank}`] ?? ''} ${
                    entry.user_id === user?.user_id ? styles.me : ''
                  }`}
                >
                  <span className={styles.medal}>{entry.rank}</span>
                  <ExternalImage
                    src={entry.avatar_uri}
                    alt={entry.display_name}
                    className={styles.podiumAvatar}
                  />
                  <span className={styles.podiumName}>{entry.display_name}</span>
                  {renderBadge(entry.badge_type)}
                  <span className={styles.podiumScore}>
                    {entry.contribution_score.toLocaleString(locale)}
                    <em>{t('contribution.score')}</em>
                  </span>
                </article>
              ))}
            </div>

            {rest.length > 0 && (
              <div className={styles.listCard}>
                <div className={styles.listHead} aria-hidden>
                  <span>{t('contribution.rank')}</span>
                  <span className={styles.listHeadName}>{t('contribution.member')}</span>
                  <span>{t('contribution.score')}</span>
                </div>
                <ol className={styles.list}>
                  {rest.map(entry => (
                    <li
                      key={entry.user_id}
                      className={`${styles.row} ${
                        entry.user_id === user?.user_id ? styles.meRow : ''
                      }`}
                    >
                      <span className={styles.rank}>{entry.rank}</span>
                      <ExternalImage
                        src={entry.avatar_uri}
                        alt={entry.display_name}
                        className={styles.rowAvatar}
                      />
                      <div className={styles.rowInfo}>
                        <span className={styles.rowName}>
                          {entry.display_name}
                          {entry.user_id === user?.user_id && (
                            <span className={styles.youChip}>{t('contribution.you')}</span>
                          )}
                        </span>
                        {renderBadge(entry.badge_type)}
                      </div>
                      <span className={styles.rowScore}>
                        {entry.contribution_score.toLocaleString(locale)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {isMember && mine && (
            <aside className={styles.rail} aria-label={t('contribution.yourStats')}>
              <div className={styles.myCard}>
                <span className={styles.eyebrow}>
                  <i className="bx bx-user-circle" aria-hidden /> {t('contribution.yourStats')}
                </span>
                <div className={styles.myScore}>{mine.contribution_score.toLocaleString(locale)}</div>
                <span className={styles.myScoreLabel}>{t('contribution.yourScore')}</span>
                <div className={styles.myChips}>
                  {renderBadge(mine.badge_type)}
                  {mine.promoted_to_mod && (
                    <span className={styles.modChip}>
                      <i className="bx bx-shield-quarter" aria-hidden /> {t('contribution.moderator')}
                    </span>
                  )}
                </div>
                <ul className={styles.statList}>
                  {STAT_ITEMS.map(item => (
                    <li key={item.key} className={styles.statItem}>
                      <span className={styles.statIcon}>
                        <i className={`bx ${item.icon}`} aria-hidden />
                      </span>
                      <span className={styles.statLabel}>{t(item.labelKey)}</span>
                      <span className={styles.statValue}>
                        {Number(mine[item.key] ?? 0).toLocaleString(locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  )
}
