'use client'

import React from 'react'
import useSWR from 'swr'
import { useTranslation } from '../../../hooks/useTranslation'
import { getOverview } from '../../../api/partner'
import StatCard from '../../../components/StatCard'
import type { AdOverview } from '../../../types'
import styles from './Dashboard.module.css'

export default function PartnerDashboardPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useSWR<AdOverview>('/ads-management/overview', () => getOverview())

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('partner.overview.title')}</h1>

      <div className={styles.statsGrid}>
        <StatCard
          title={t('partner.overview.totalBudget')}
          value={isLoading ? '—' : formatCurrency(data?.total_budget ?? 0)}
          icon="bx bx-wallet"
          color="#6366f1"
          loading={isLoading}
          animateValue={data?.total_budget}
        />
        <StatCard
          title={t('partner.overview.totalSpent')}
          value={isLoading ? '—' : formatCurrency(data?.total_spent ?? 0)}
          icon="bx bx-money"
          color="#f59e0b"
          loading={isLoading}
          animateValue={data?.total_spent}
        />
        <StatCard
          title={t('partner.overview.impressions')}
          value={isLoading ? '—' : (data?.impressions ?? 0).toLocaleString()}
          icon="bx bx-show"
          color="#10b981"
          loading={isLoading}
          animateValue={data?.impressions}
        />
        <StatCard
          title={t('partner.overview.clicks')}
          value={isLoading ? '—' : (data?.clicks ?? 0).toLocaleString()}
          icon="bx bx-mouse"
          color="#3b82f6"
          loading={isLoading}
          animateValue={data?.clicks}
        />
        <StatCard
          title={t('partner.overview.ctr')}
          value={isLoading ? '—' : `${(data?.ctr ?? 0).toFixed(1)}%`}
          icon="bx bx-line-chart"
          color="#8b5cf6"
          loading={isLoading}
        />
        <StatCard
          title={t('partner.overview.activeAds')}
          value={isLoading ? '—' : (data?.active_ads ?? 0).toString()}
          icon="bx bx-dollar"
          color="#ef4444"
          loading={isLoading}
          animateValue={data?.active_ads}
        />
      </div>

      {data && (
        <div className={styles.subscriptionCard}>
          <div className={styles.subHeader}>
            <i className="bx bx-package" />
            <span>{t('partner.overview.subscription')}</span>
          </div>
          <div className={styles.subBody}>
            <div className={styles.subRow}>
              <span className={styles.subLabel}>{t('partner.packages.title')}</span>
              <span className={styles.subValue}>{data.subscription_name || '—'}</span>
            </div>
            <div className={styles.subRow}>
              <span className={styles.subLabel}>{t('partner.overview.slotsUsed')}</span>
              <span className={styles.subValue}>{data.slots_used} / {data.max_slots}</span>
            </div>
            {data.expires_at && (
              <div className={styles.subRow}>
                <span className={styles.subLabel}>{t('partner.overview.expiresAt')}</span>
                <span className={styles.subValue}>{new Date(data.expires_at).toLocaleDateString('vi-VN')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
