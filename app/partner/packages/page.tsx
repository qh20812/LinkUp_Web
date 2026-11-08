'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { getPackages, getMySubscription, createMoMoPayment } from '../../../api/package'
import { redirectToExternal } from '../../../lib/navigate'
import type { AdPackage, SubscriptionResponse } from '../../../types'
import styles from './Packages.module.css'

export default function PackagesPage() {
  const { t, language } = useTranslation()
  const { toast } = useToast()

  const { data: packages, isLoading: loadingPkgs } = useSWR<AdPackage[]>('/ads/packages', () => getPackages())
  const { data: sub, isLoading: loadingSub } = useSWR<SubscriptionResponse>('/ads-management/subscription', () => getMySubscription(), {
    shouldRetryOnError: false,
  })

  const [subscribing, setSubscribing] = useState<string | null>(null)

  const handleSubscribe = async (pkgId: string) => {
    if (isActive(pkgId)) return
    setSubscribing(pkgId)
    try {
      // Gói chỉ được kích hoạt sau khi MoMo xác nhận thanh toán (return/IPN),
      // nên ở đây chỉ tạo giao dịch rồi chuyển trình duyệt sang cổng MoMo.
      const res = await createMoMoPayment(pkgId)
      redirectToExternal(res.payment_url)
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
      setSubscribing(null)
    }
  }

  const formatPrice = (v: number) =>
    new Intl.NumberFormat(language === 'en' ? 'en-US' : 'vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(v)

  const isActive = (pkgId: string) => {
    if (!sub) return false
    // Ưu tiên ID; server cũ chưa trả package_id thì so theo tên.
    if (sub.package_id) return sub.package_id === pkgId
    return packages?.find((p) => p.id === pkgId)?.name === sub.package_name
  }

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
              <p className={styles.cardPrice}>{formatPrice(pkg.price_monthly)}<span>{t('packages.perMonth')}</span></p>
              <p className={styles.cardDesc}>{pkg.description}</p>
              <ul className={styles.cardFeatures}>
                <li><i className="bx bx-check" /> {t('packages.slotCount', { n: pkg.max_slots })}</li>
                <li><i className="bx bx-check" /> {t('packages.dayCount', { n: pkg.max_duration_days })}</li>
                {pkg.supports_video && <li><i className="bx bx-check" /> {t('packages.video')}</li>}
                {pkg.supports_carousel && <li><i className="bx bx-check" /> {t('packages.carousel')}</li>}
                {pkg.has_advanced_analytics && <li><i className="bx bx-check" /> {t('packages.advancedAnalytics')}</li>}
              </ul>
              <button
                className={`${styles.btnSubscribe} ${isActive(pkg.id) ? styles.btnSubscribed : ''}`}
                disabled={isActive(pkg.id) || subscribing === pkg.id}
                onClick={() => handleSubscribe(pkg.id)}
              >
                {subscribing === pkg.id ? t('common.loading') : isActive(pkg.id) ? t('partner.packages.subscribed') : t('payment.payNow')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
