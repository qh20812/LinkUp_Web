'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { getPackages, getMySubscription, subscribePackage } from '../../../api/package'
import { invalidate } from '../../../api/swr'
import { storeTokens } from '../../../api/api'
import type { AdPackage, SubscriptionResponse } from '../../../types'
import styles from './Packages.module.css'

export default function PackagesPage() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const { data: packages, isLoading: loadingPkgs } = useSWR<AdPackage[]>('/ads/packages', () => getPackages())
  const { data: sub, isLoading: loadingSub } = useSWR<SubscriptionResponse>('/ads-management/subscription', () => getMySubscription(), {
    shouldRetryOnError: false,
  })

  const [subscribing, setSubscribing] = useState<string | null>(null)

  const handleSubscribe = async (pkgId: string) => {
    setSubscribing(pkgId)
    try {
      const res = await subscribePackage(pkgId)
      if (res.tokens?.access_token) {
        storeTokens(res.tokens)
      }
      toast({ title: t('partner.packages.subscribed'), type: 'success' })
      invalidate('/ads-management/subscription')
      invalidate('/ads-management/overview')
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setSubscribing(null)
    }
  }

  const formatPrice = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

  const isActive = (pkgId: string) => sub?.package_name && packages?.find((p) => p.id === pkgId)?.name === sub.package_name

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('partner.packages.title')}</h1>

      {sub && (
        <div className={styles.currentCard}>
          <div className={styles.currentHeader}>
            <i className="bx bx-package" />
            <span>{t('partner.packages.currentPackage')}</span>
          </div>
          <div className={styles.currentBody}>
            <div className={styles.currentRow}>
              <span>{t('partner.packages.title')}</span>
              <strong>{sub.package_name}</strong>
            </div>
            <div className={styles.currentRow}>
              <span>{t('partner.packages.slotsLeft')}</span>
              <strong>{sub.slots_left} / {sub.max_slots}</strong>
            </div>
            <div className={styles.currentRow}>
              <span>{t('partner.packages.expiresAt')}</span>
              <strong>{new Date(sub.expires_at).toLocaleDateString('vi-VN')}</strong>
            </div>
          </div>
        </div>
      )}

      {loadingPkgs || loadingSub ? (
        <p>{t('common.loading')}</p>
      ) : !packages || packages.length === 0 ? (
        <p className={styles.empty}>{t('partner.packages.noPackages')}</p>
      ) : (
        <div className={styles.grid}>
          {packages.map((pkg) => (
            <div key={pkg.id} className={`${styles.card} ${isActive(pkg.id) ? styles.cardActive : ''}`}>
              <h3 className={styles.cardName}>{pkg.name}</h3>
              <p className={styles.cardPrice}>{formatPrice(pkg.price_monthly)}<span>/tháng</span></p>
              <p className={styles.cardDesc}>{pkg.description}</p>
              <ul className={styles.cardFeatures}>
                <li><i className="bx bx-check" /> {pkg.max_slots} slot</li>
                <li><i className="bx bx-check" /> {pkg.max_duration_days} ngày</li>
                {pkg.supports_video && <li><i className="bx bx-check" /> Video</li>}
                {pkg.supports_carousel && <li><i className="bx bx-check" /> Carousel</li>}
                {pkg.has_advanced_analytics && <li><i className="bx bx-check" /> Phân tích nâng cao</li>}
              </ul>
              <button
                className={`${styles.btnSubscribe} ${isActive(pkg.id) ? styles.btnSubscribed : ''}`}
                disabled={isActive(pkg.id) || subscribing === pkg.id}
                onClick={() => handleSubscribe(pkg.id)}
              >
                {subscribing === pkg.id ? t('common.loading') : isActive(pkg.id) ? t('partner.packages.subscribed') : t('partner.packages.subscribe')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
