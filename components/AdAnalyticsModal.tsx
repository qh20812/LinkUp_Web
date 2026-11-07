'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Modal from './Modal'
import { useTranslation } from '../hooks/useTranslation'
import { useToast } from '../contexts/ToastContext'
import { getAdAnalytics } from '../api/partner'
import { getAdAnalytics as getAdminAdAnalytics } from '../api/admin'
import { adRangeQuery } from '../lib/ad-datetime'
import type { AdPerformance } from '../types'
import styles from './AdAnalyticsModal.module.css'

const RANGE_DAYS = [7, 30, 90]

interface AdAnalyticsModalProps {
  open: boolean
  adId: string
  onClose: () => void
  /** Admin xem ad của partner qua endpoint admin; mặc định là partner. */
  scope?: 'partner' | 'admin'
}

export default function AdAnalyticsModal({ open, adId, onClose, scope = 'partner' }: AdAnalyticsModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [data, setData] = useState<AdPerformance | null>(null)
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState(30)

  useEffect(() => {
    if (!open || !adId) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true)
    setData(null)
    /* eslint-enable react-hooks/set-state-in-effect */
    const fetchAnalytics = scope === 'admin' ? getAdminAdAnalytics : getAdAnalytics
    fetchAnalytics(adId, adRangeQuery(days))
      .then(setData)
      .catch((err) => {
        toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
      })
      .finally(() => setLoading(false))
  }, [open, adId, t, toast, scope, days])

  const formatNumber = (v: number) => {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
    if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
    return v.toLocaleString()
  }

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { active: styles.badgeActive, paused: styles.badgePaused, completed: styles.badgeCompleted, pending: styles.badgePending, rejected: styles.badgeRejected, suspended: styles.badgeSuspended }
    return map[s] ?? ''
  }

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { active: t('partner.ads.active'), paused: t('partner.ads.paused'), completed: t('partner.ads.completed'), pending: t('partner.ads.pending'), rejected: t('partner.ads.rejected'), suspended: t('partner.ads.suspended') }
    return map[s] ?? s
  }

  return (
    <Modal open={open} onClose={onClose} title={t('partner.analytics.title')}>
      {loading ? (
        <div className={styles.loading}>{t('common.loading')}</div>
      ) : data ? (
        <div className={styles.content}>
          <div className={styles.header}>
            <span className={styles.adTitle}>{data.title}</span>
            <span className={`${styles.badge} ${statusBadge(data.status)}`}>{statusLabel(data.status)}</span>
          </div>

          <div className={styles.rangeRow} role="group" aria-label={t('partner.analytics.range')}>
            {RANGE_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                className={`${styles.rangeBtn} ${days === d ? styles.rangeBtnActive : ''}`}
                onClick={() => setDays(d)}
              >
                {t('partner.analytics.lastNDays', { n: String(d) })}
              </button>
            ))}
          </div>

          {data.limited && (
            <p className={styles.limited}>
              {t('partner.analytics.limited30')}{' '}
              <Link href="/packages">{t('partner.analytics.upgrade')}</Link>
            </p>
          )}

          <div className={styles.budgetRow}>
            <span>{t('partner.analytics.totalSpent')}: <strong>{formatCurrency(data.total_spent)}</strong></span>
            <span>{t('partner.analytics.remainingBudget')}: <strong>{formatCurrency(data.remaining_budget)}</strong></span>
            <span>{t('partner.analytics.rangeCost')}: <strong>{formatCurrency(data.cost ?? 0)}</strong></span>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{formatNumber(data.impressions)}</div>
              <div className={styles.statLabel}>{t('partner.analytics.impressions')}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{formatNumber(data.clicks)}</div>
              <div className={styles.statLabel}>{t('partner.analytics.clicks')}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{data.ctr.toFixed(1)}%</div>
              <div className={styles.statLabel}>{t('partner.analytics.ctr')}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{formatNumber(data.interactions)}</div>
              <div className={styles.statLabel}>{t('partner.analytics.interactions')}</div>
            </div>
          </div>

          <div className={styles.costRow}>
            <span>{t('partner.analytics.cpc')}: <strong>{formatCurrency(data.cost_per_click)}</strong></span>
            <span>{t('partner.analytics.cpm')}: <strong>{formatCurrency(data.cost_per_thousand_impressions)}</strong></span>
          </div>

          {data.format === 'video' && (
            <div className={styles.videoRow}>
              <span>{t('partner.analytics.videoStarts')}: {formatNumber(data.video_starts ?? 0)}</span>
              <span>{t('partner.analytics.videoCompletions')}: {formatNumber(data.video_completions ?? 0)}</span>
            </div>
          )}

          {data.series && data.series.length > 0 && (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.series} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    name={t('partner.analytics.impressions')}
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    name={t('partner.analytics.clicks')}
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.empty}>{t('common.error')}</div>
      )}
    </Modal>
  )
}
