'use client'

import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import { useTranslation } from '../hooks/useTranslation'
import { useToast } from '../contexts/ToastContext'
import { getAdAnalytics } from '../api/partner'
import type { AdPerformance } from '../types'
import styles from './AdAnalyticsModal.module.css'

interface AdAnalyticsModalProps {
  open: boolean
  adId: string
  onClose: () => void
}

export default function AdAnalyticsModal({ open, adId, onClose }: AdAnalyticsModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [data, setData] = useState<AdPerformance | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !adId) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true)
    setData(null)
    /* eslint-enable react-hooks/set-state-in-effect */
    getAdAnalytics(adId)
      .then(setData)
      .catch((err) => {
        toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
      })
      .finally(() => setLoading(false))
  }, [open, adId, t, toast])

  const formatNumber = (v: number) => {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
    if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
    return v.toLocaleString()
  }

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { active: styles.badgeActive, paused: styles.badgePaused, completed: styles.badgeCompleted, pending: styles.badgePending, rejected: styles.badgeRejected }
    return map[s] ?? ''
  }

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { active: t('partner.ads.active'), paused: t('partner.ads.paused'), completed: t('partner.ads.completed'), pending: t('partner.ads.pending'), rejected: t('partner.ads.rejected') }
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

          <div className={styles.budgetRow}>
            <span>{t('partner.analytics.totalSpent')}: <strong>{formatCurrency(data.total_spent)}</strong></span>
            <span>{t('partner.analytics.remainingBudget')}: <strong>{formatCurrency(data.remaining_budget)}</strong></span>
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
        </div>
      ) : (
        <div className={styles.empty}>{t('common.error')}</div>
      )}
    </Modal>
  )
}
