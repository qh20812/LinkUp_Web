'use client'

import React, { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { useTranslation } from '../../../hooks/useTranslation'
import { getDashboardStats, getUsers, getReports } from '../../../api/admin'
import StatCard from '../../../components/StatCard'
import type {
  ChartDataPoint,
  AdminUserListItem,
  AdminReportListItem,
} from '../../../types'
import styles from './Dashboard.module.css'

interface MergedChartPoint {
  date: string
  users: number
  posts: number
  reports: number
}

interface DashboardData {
  total_users: number
  total_posts: number
  total_reports: number
  users_change_percent: number
  posts_change_percent: number
  reports_change_percent: number
  generated_at: string
  chartData: MergedChartPoint[]
}

function mergeChartData(
  users?: ChartDataPoint[],
  posts?: ChartDataPoint[],
  reports?: ChartDataPoint[],
): MergedChartPoint[] {
  const dateMap = new Map<string, MergedChartPoint>()

  for (const point of users ?? []) {
    dateMap.set(point.date, { date: point.date, users: point.count, posts: 0, reports: 0 })
  }
  for (const point of posts ?? []) {
    const existing = dateMap.get(point.date)
    if (existing) {
      existing.posts = point.count
    } else {
      dateMap.set(point.date, { date: point.date, users: 0, posts: point.count, reports: 0 })
    }
  }
  for (const point of reports ?? []) {
    const existing = dateMap.get(point.date)
    if (existing) {
      existing.reports = point.count
    } else {
      dateMap.set(point.date, { date: point.date, users: 0, posts: 0, reports: point.count })
    }
  }

  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentUsers, setRecentUsers] = useState<AdminUserListItem[]>([])
  const [recentReports, setRecentReports] = useState<AdminReportListItem[]>([])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)

        const [allStats, usersChart, postsChart, reportsChart, userList, reportList] = await Promise.all([
          getDashboardStats(),
          getDashboardStats('users'),
          getDashboardStats('posts'),
          getDashboardStats('reports'),
          getUsers(1, 5),
          getReports(1, 5),
        ])

        setData({
          total_users: allStats.total_users,
          total_posts: allStats.total_posts,
          total_reports: allStats.total_reports,
          users_change_percent: allStats.users_change_percent,
          posts_change_percent: allStats.posts_change_percent,
          reports_change_percent: allStats.reports_change_percent,
          generated_at: allStats.generated_at,
          chartData: mergeChartData(usersChart.chart_data, postsChart.chart_data, reportsChart.chart_data),
        })
        setRecentUsers(userList.users)
        setRecentReports(reportList.reports)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('common.error'))
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [t])

  const formatDate = (label: unknown): string => {
    if (typeof label !== 'string') return String(label)
    try {
      return new Date(label).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return label
    }
  }

  const formatChartDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short' })
    } catch {
      return iso
    }
  }

  const now = new Date()
  const periodStart = new Date(now)
  periodStart.setDate(periodStart.getDate() - 7)
  const periodLabel = `${periodStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} – ${now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`

  const formatDateTime = (iso: string): string => {
    try {
      const d = new Date(iso)
      return `${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
    } catch {
      return iso
    }
  }

  const statusBadgeClass = (status: string): string => {
    const map: Record<string, string> = {
      active: styles.badgeActive,
      banned: styles.badgeBanned,
      suspended: styles.badgeSuspended,
      pending: styles.badgePending,
      reviewed: styles.badgeReviewed,
      resolved: styles.badgeResolved,
      dismissed: styles.badgeDismissed,
    }
    return map[status] ?? ''
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
        <h1 className={styles.title}>{t('dashboard.title')}</h1>
        <p className={styles.subtitle}>{periodLabel}</p>
      </header>

      <div className={styles.statsGrid}>
        <StatCard
          title={t('dashboard.totalUsers')}
          value={loading ? '—' : (data?.total_users ?? 0).toLocaleString()}
          icon="bx bx-group"
          color="var(--color-primary)"
          loading={loading}
          animateValue={loading ? undefined : data?.total_users}
          trend={loading ? null : data?.users_change_percent}
        />
        <StatCard
          title={t('dashboard.totalPosts')}
          value={loading ? '—' : (data?.total_posts ?? 0).toLocaleString()}
          icon="bx bx-file"
          color="var(--color-accent)"
          loading={loading}
          animateValue={loading ? undefined : data?.total_posts}
          trend={loading ? null : data?.posts_change_percent}
        />
        <StatCard
          title={t('dashboard.totalReports')}
          value={loading ? '—' : (data?.total_reports ?? 0).toLocaleString()}
          icon="bx bx-flag"
          color="var(--color-danger)"
          loading={loading}
          animateValue={loading ? undefined : data?.total_reports}
          trend={loading ? null : data?.reports_change_percent}
        />
      </div>

      {error && (
        <div className={styles.error}>
          <i className="bx bx-error-circle" />
          <p>{error}</p>
        </div>
      )}

      <section className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <h2 className={styles.chartTitle}>{t('dashboard.recentActivity')}</h2>
          <span className={styles.chartPeriod}>{periodLabel}</span>
        </div>
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
                  stroke="#40E0D0"
                  strokeWidth={2}
                  dot={{ fill: '#40E0D0', r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="posts"
                  name={t('dashboard.postsTrend')}
                  stroke="#FF6F00"
                  strokeWidth={2}
                  dot={{ fill: '#FF6F00', r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="reports"
                  name={t('dashboard.reportsTrend')}
                  stroke="#D32F2F"
                  strokeWidth={2}
                  dot={{ fill: '#D32F2F', r: 3 }}
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
      </section>

      <div className={styles.tablesGrid}>
        {/* Recent Users */}
        <div className={styles.recentCard}>
          <h3 className={styles.recentCardTitle}>{t('dashboard.recentUsers')}</h3>
          {loading ? (
            tableSkeleton()
          ) : recentUsers.length > 0 ? (
            <table className={styles.recentTable}>
              <thead>
                <tr>
                  <th></th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.createdAt')}</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <img
                          src={user.avatar_uri || '/default-avatar.png'}
                          alt=""
                          className={styles.recentAvatar}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{user.display_name || user.username}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${statusBadgeClass(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                      {new Date(user.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.recentEmpty}>{t('dashboard.noUsers')}</div>
          )}
        </div>

        {/* Recent Reports */}
        <div className={styles.recentCard}>
          <h3 className={styles.recentCardTitle}>{t('dashboard.recentReports')}</h3>
          {loading ? (
            tableSkeleton()
          ) : recentReports.length > 0 ? (
            <table className={styles.recentTable}>
              <thead>
                <tr>
                  <th>{t('common.status')}</th>
                  <th>Loại</th>
                  <th>{t('common.createdAt')}</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{report.reporter_username}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {report.report_type}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, textTransform: 'capitalize' }}>{report.target_type}</div>
                      <span className={`${styles.badge} ${statusBadgeClass(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                      {new Date(report.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.recentEmpty}>{t('dashboard.noReports')}</div>
          )}
        </div>
      </div>
    </div>
  )
}
