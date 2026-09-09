'use client'

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useTranslation } from '../../../hooks/useTranslation'
import { swrFetcher } from '../../../api/swr'
import StatCard from '../../../components/StatCard'
import type {
  AdminAnalyticsResponse,
  ChartDataPoint,
  TopActiveUser,
  TopEngagedPost,
  StatusCount,
} from '../../../types'
import styles from './Dashboard.module.css'

interface MergedChartPoint {
  date: string
  users: number
  posts: number
  reports: number
  comments: number
}

interface DashboardData {
  total_users: number
  total_posts: number
  total_reports: number
  total_comments: number
  total_media: number
  total_groups: number
  total_communities: number
  total_likes: number
  total_shares: number
  total_active_bans: number
  pending_reports: number
  flagged_media_count: number
  active_users_today: number
  users_change_percent: number
  posts_change_percent: number
  reports_change_percent: number
  comments_change_percent: number
  media_change_percent: number
  groups_change_percent: number
  communities_change_percent: number
  generated_at: string
  chartData: MergedChartPoint[]
  top_users?: TopActiveUser[]
  top_posts?: TopEngagedPost[]
  user_status_distribution?: StatusCount[]
  report_status_distribution?: StatusCount[]
}

const STAT_CARDS_CONFIG = [
  { key: 'total_users', icon: 'bx bx-group', color: 'var(--color-primary)', i18nKey: 'totalUsers', changeKey: 'users_change_percent' },
  { key: 'total_posts', icon: 'bx bx-file', color: 'var(--color-accent)', i18nKey: 'totalPosts', changeKey: 'posts_change_percent' },
  { key: 'total_comments', icon: 'bx bx-comment', color: '#0ea5e9', i18nKey: 'total_comments', changeKey: 'comments_change_percent' },
  { key: 'total_groups', icon: 'bx bx-chat', color: '#8b5cf6', i18nKey: 'total_groups', changeKey: 'groups_change_percent' },
  { key: 'total_communities', icon: 'bx bx-buildings', color: '#f59e0b', i18nKey: 'total_communities', changeKey: 'communities_change_percent' },
  { key: 'total_reports', icon: 'bx bx-flag', color: 'var(--color-danger)', i18nKey: 'totalReports', changeKey: 'reports_change_percent' },
] as const

const PIE_COLORS: Record<string, string> = {
  active: '#22c55e',
  banned: '#ef4444',
  suspended: '#f59e0b',
  inactive: '#6b7280',
  pending: '#f97316',
}

function mergeChartData(
  users?: ChartDataPoint[],
  posts?: ChartDataPoint[],
  reports?: ChartDataPoint[],
  comments?: ChartDataPoint[],
): MergedChartPoint[] {
  const dateMap = new Map<string, MergedChartPoint>()

  for (const point of users ?? []) {
    dateMap.set(point.date, { date: point.date, users: point.count, posts: 0, reports: 0, comments: 0 })
  }
  for (const point of posts ?? []) {
    const existing = dateMap.get(point.date)
    if (existing) {
      existing.posts = point.count
    } else {
      dateMap.set(point.date, { date: point.date, users: 0, posts: point.count, reports: 0, comments: 0 })
    }
  }
  for (const point of reports ?? []) {
    const existing = dateMap.get(point.date)
    if (existing) {
      existing.reports = point.count
    } else {
      dateMap.set(point.date, { date: point.date, users: 0, posts: 0, reports: point.count, comments: 0 })
    }
  }
  for (const point of comments ?? []) {
    const existing = dateMap.get(point.date)
    if (existing) {
      existing.comments = point.count
    } else {
      dateMap.set(point.date, { date: point.date, users: 0, posts: 0, reports: 0, comments: point.count })
    }
  }

  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

type Period = '7d' | '30d' | 'thisMonth' | 'lastMonth'

function getDateRange(period: Period): { start: Date; end: Date } {
  const now = new Date()
  switch (period) {
    case '7d': return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7), end: now }
    case '30d': return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30), end: now }
    case 'thisMonth': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start, end }
    }
  }
}

function formatISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<Period>('7d')

  const { start, end } = getDateRange(period)
  const startDate = formatISO(start)
  const endDate = formatISO(end)
  const swrKey = `/admin/analytics?start_date=${startDate}&end_date=${endDate}`

  const { data: raw, error, isLoading: loading } = useSWR(swrKey, (url: string) => swrFetcher<AdminAnalyticsResponse>(url))

  const data = useMemo<DashboardData | null>(() => {
    if (!raw) return null
    return {
      total_users: raw.total_users,
      total_posts: raw.total_posts,
      total_reports: raw.total_reports,
      total_comments: raw.total_comments,
      total_media: raw.total_media,
      total_groups: raw.total_groups,
      total_communities: raw.total_communities,
      total_likes: raw.total_likes,
      total_shares: raw.total_shares,
      total_active_bans: raw.total_active_bans,
      pending_reports: raw.pending_reports,
      flagged_media_count: raw.flagged_media_count,
      active_users_today: raw.active_users_today,
      users_change_percent: raw.users_change_percent,
      posts_change_percent: raw.posts_change_percent,
      reports_change_percent: raw.reports_change_percent,
      comments_change_percent: raw.comments_change_percent,
      media_change_percent: raw.media_change_percent,
      groups_change_percent: raw.groups_change_percent,
      communities_change_percent: raw.communities_change_percent,
      generated_at: raw.generated_at,
      chartData: mergeChartData(
        raw.chart_data_users,
        raw.chart_data_posts,
        raw.chart_data_reports,
        raw.chart_data_comments,
      ),
      top_users: raw.top_users,
      top_posts: raw.top_posts,
      user_status_distribution: raw.user_status_distribution,
      report_status_distribution: raw.report_status_distribution,
    }
  }, [raw])

  const formatDate = (label: unknown): string => {
    if (typeof label !== 'string') return String(label)
    try {
      const d = new Date(label)
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
    } catch {
      return label
    }
  }

  const pad = (n: number) => String(n).padStart(2, '0')

  const formatChartDate = (iso: string): string => {
    try {
      const d = new Date(iso)
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
    } catch {
      return iso
    }
  }

  const formatDateTime = (iso: string): string => {
    try {
      const d = new Date(iso)
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    } catch {
      return iso
    }
  }

  const periodDateRange = getDateRange(period)
  const periodDateLabel = `${pad(periodDateRange.start.getDate())}/${pad(periodDateRange.start.getMonth() + 1)} – ${pad(periodDateRange.end.getDate())}/${pad(periodDateRange.end.getMonth() + 1)}/${periodDateRange.end.getFullYear()}`

  const rankClass = (i: number): string => {
    if (i === 0) return `${styles.topListRank} ${styles.gold}`
    if (i === 1) return `${styles.topListRank} ${styles.silver}`
    if (i === 2) return `${styles.topListRank} ${styles.bronze}`
    return styles.topListRank
  }

  const tableSkeleton = () => (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={styles.tableSkeletonRow}>
          <div className={styles.tableSkeletonAvatar} />
          <div className={styles.tableSkeletonText} />
          <div className={styles.tableSkeletonText} />
        </div>
      ))}
    </>
  )

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('dashboard.pageName')}</h1>
        <p className={styles.subtitle}>{periodDateLabel}</p>
      </header>

      <div className={styles.statsGrid}>
        {STAT_CARDS_CONFIG.map((cfg) => (
          <StatCard
            key={cfg.key}
            title={t(`dashboard.${cfg.i18nKey}`)}
            value={loading ? '—' : (data?.[cfg.key as keyof DashboardData] ?? 0).toLocaleString()}
            icon={cfg.icon}
            color={cfg.color}
            loading={loading}
            animateValue={loading ? undefined : (data?.[cfg.key as keyof DashboardData] as number)}
            trend={loading ? null : (data?.[cfg.changeKey as keyof DashboardData] as number | undefined) ?? null}
          />
        ))}
      </div>

      {error && (
        <div className={styles.error}>
          <i className="bx bx-error-circle" />
          <p>{error}</p>
        </div>
      )}

      <div className={styles.alertBar}>
        <div className={styles.alertItem}>
          <i className="bx bx-flag" style={{ color: 'var(--color-warning)' }} />
          {t('dashboard.pendingReports')}: {loading ? '—' : (data?.pending_reports ?? 0).toLocaleString()}
        </div>
        <div className={styles.alertItem}>
          <i className="bx bx-image" style={{ color: 'var(--color-danger)' }} />
          {t('dashboard.flaggedMedia')}: {loading ? '—' : (data?.flagged_media_count ?? 0).toLocaleString()}
        </div>
        <div className={styles.alertItem}>
          <i className="bx bx-block" style={{ color: 'var(--color-danger)' }} />
          {t('dashboard.activeBans')}: {loading ? '—' : (data?.total_active_bans ?? 0).toLocaleString()}
        </div>
        <div className={styles.alertItem}>
          <i className="bx bx-user-check" style={{ color: 'var(--color-success)' }} />
          {t('dashboard.activeUsersToday')}: {loading ? '—' : (data?.active_users_today ?? 0).toLocaleString()}
        </div>
      </div>

      <section className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <h2 className={styles.chartTitle}>{t('dashboard.recentActivity')}</h2>
          <select
            className={styles.periodSelect}
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
          >
            <option value="7d">{t('dashboard.period7d')}</option>
            <option value="30d">{t('dashboard.period30d')}</option>
            <option value="thisMonth">{t('dashboard.periodThisMonth')}</option>
            <option value="lastMonth">{t('dashboard.periodLastMonth')}</option>
          </select>
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartContainer}>
            {loading ? (
              <div className={styles.chartSkeleton}>
                <div className={styles.chartSkeletonBar} />
                <div className={styles.chartSkeletonBar} />
                <div className={styles.chartSkeletonBar} />
                <div className={styles.chartSkeletonBar} />
                <div className={styles.chartSkeletonBar} />
                <div className={styles.chartSkeletonBar} />
                <div className={styles.chartSkeletonBar} />
              </div>
            ) : data?.chartData && data.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    stroke="var(--color-text-secondary)"
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                    tickFormatter={formatChartDate}
                  />
                  <YAxis
                    stroke="var(--color-text-secondary)"
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                  />
                  <Tooltip
                    labelFormatter={formatDate}
                    contentStyle={{
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text)',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                    name={t('dashboard.usersTrend')}
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-primary)', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="posts"
                    name={t('dashboard.postsTrend')}
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-accent)', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="reports"
                    name={t('dashboard.reportsTrend')}
                    stroke="var(--color-danger)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-danger)', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="comments"
                    name={t('dashboard.commentsTrend')}
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={{ fill: '#0ea5e9', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.empty}>
                <i className="bx bx-bar-chart-alt-2" />
                <p>{t('common.loading')}</p>
              </div>
            )}
            {data?.generated_at && (
              <div className={styles.chartFooter}>
                {t('dashboard.totalGeneratedAt')}: {formatDateTime(data.generated_at)}
              </div>
            )}
          </div>

          <div className={styles.chartContainer}>
            <h3 style={{ font: 'var(--text-h2)', color: 'var(--color-text)', marginBottom: 'var(--space-md)' }}>
              {t('dashboard.userStatusDistribution')}
            </h3>
            {loading ? (
              <div className={styles.chartSkeleton}>
                <div className={styles.chartSkeletonBar} />
                <div className={styles.chartSkeletonBar} />
                <div className={styles.chartSkeletonBar} />
                <div className={styles.chartSkeletonBar} />
                <div className={styles.chartSkeletonBar} />
              </div>
            ) : data?.user_status_distribution && data.user_status_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.user_status_distribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={3}
                  >
                    {data.user_status_distribution.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={PIE_COLORS[entry.status] ?? '#6b7280'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text)',
                    }}
                  />
                  <Legend
                    formatter={(value: string) => (
                      <span className={styles.pieLabel}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.empty}>
                <i className="bx bx-pie-chart-alt-2" />
                <p>{t('common.loading')}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className={styles.tablesGrid}>
        <div className={styles.topListCard}>
          <h3 className={styles.topListTitle}>{t('dashboard.topUsers')}</h3>
          {loading ? (
            tableSkeleton()
          ) : data?.top_users && data.top_users.length > 0 ? (
            <table className={styles.topListTable}>
              <thead>
                <tr>
                  <th></th>
                  <th>{t('dashboard.user')}</th>
                  <th>{t('dashboard.postCount')}</th>
                </tr>
              </thead>
              <tbody>
                {data.top_users.map((user, i) => (
                  <tr key={user.user_id}>
                    <td>
                      <span className={rankClass(i)}>{i + 1}</span>
                    </td>
                    <td>
                      <div className={styles.topListUser}>
                        <Image
                          src={user.avatar_uri || '/default-avatar.svg'}
                          alt=""
                          width={28}
                          height={28}
                          className={styles.topListAvatar}
                          unoptimized
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {user.display_name || user.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.engagementBadge}>
                        <i className="bx bx-file" /> {user.post_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.recentEmpty}>{t('common.noData')}</div>
          )}
        </div>

        <div className={styles.topListCard}>
          <h3 className={styles.topListTitle}>{t('dashboard.topPosts')}</h3>
          {loading ? (
            tableSkeleton()
          ) : data?.top_posts && data.top_posts.length > 0 ? (
            <table className={styles.topListTable}>
              <thead>
                <tr>
                  <th></th>
                  <th>{t('dashboard.title')}</th>
                  <th>{t('dashboard.engagement')}</th>
                </tr>
              </thead>
              <tbody>
                {data.top_posts.map((post, i) => (
                  <tr key={post.post_id}>
                    <td>
                      <span className={rankClass(i)}>{i + 1}</span>
                    </td>
                    <td>
                      <div className={styles.topListPostTitle}>
                        {post.has_media && <i className="bx bx-image" style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--color-primary)' }} />}
                        {post.title || t('posts.noTitle')}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {post.username}
                      </div>
                    </td>
                    <td>
                      <span className={styles.engagementBadge}>
                        <i className="bx bx-show" /> {post.views_count}
                      </span>
                      <span className={styles.engagementBadge} style={{ marginLeft: 8 }}>
                        <i className="bx bx-heart" /> {post.likes_count}
                      </span>
                      <span className={styles.engagementBadge} style={{ marginLeft: 8 }}>
                        <i className="bx bx-message-rounded" /> {post.comments_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.recentEmpty}>{t('common.noData')}</div>
          )}
        </div>
      </div>
    </div>
  )
}
