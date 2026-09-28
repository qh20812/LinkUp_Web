'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { useAuth } from '../../../hooks/useAuth'
import { getPackages, getMySubscription, subscribePackage } from '../../../api/package'
import { clearSWRCache } from '../../../api/swr'
import { storeTokens, refreshSession } from '../../../api/api'
import { getUserRoleFromToken } from '../../../utils/auth'
import type { AdPackage, SubscriptionResponse } from '../../../types'
import styles from './Packages.module.css'

function daysLeftFrom(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000))
}

export default function PackagesPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { isAuthenticated, isPartner, initializing } = useAuth()

  const { data: packages, isLoading: loadingPkgs } = useSWR<AdPackage[]>('/ads/packages', () => getPackages())
  const { data: sub, isLoading: loadingSub } = useSWR<SubscriptionResponse>(
    isAuthenticated && !initializing ? '/ads-management/subscription' : null,
    () => getMySubscription(),
    { shouldRetryOnError: false },
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [subscribing, setSubscribing] = useState(false)

  const daysLeft = sub?.expires_at ? daysLeftFrom(sub.expires_at) : 0

  const formatPrice = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

  const handleSelect = (pkgId: string) => {
    if (!isAuthenticated && !initializing) {
      toast({ title: t('packages.loginRequired'), type: 'warning' })
      window.location.assign('/login?redirect=/packages')
      return
    }
    setSelectedId((prev) => (prev === pkgId ? null : pkgId))
  }

  const handleSubscribe = async () => {
    if (!isAuthenticated && !initializing) {
      toast({ title: t('packages.loginRequired'), type: 'warning' })
      window.location.assign('/login?redirect=/packages')
      return
    }
    if (!selectedId) return

    setSubscribing(true)
    try {
      const res = await subscribePackage(selectedId)

      // JWT claim must say PARTNER (etc.) before entering /partner/* —
      // otherwise partner/layout bounces us back to the feed.
      if (res.tokens?.access_token) {
        storeTokens(res.tokens)
      }

      const hasPartnerAccess = () => {
        const role = getUserRoleFromToken()
        return role === 'PARTNER' || role === 'ADMIN' || role === 'SUPER_ADMIN'
      }

      if (!hasPartnerAccess()) {
        // Fallback A: force refresh so the server re-reads role from DB.
        const refreshed = await refreshSession()
        if (!refreshed || !hasPartnerAccess()) {
          throw new Error(t('packages.sessionError'))
        }
      }

      toast({ title: t('packages.success'), type: 'success' })
      clearSWRCache()
      window.location.assign('/partner/dashboard')
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
      setSubscribing(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t('packages.title')}</h1>
          <p className={styles.subtitle}>{t('packages.subtitle')}</p>
        </div>
        {isPartner && (
          <button className={styles.dashboardBtn} onClick={() => { window.location.assign('/partner/dashboard') }}>
            <i className="bx bx-grid-alt" />
            <span>{t('packages.openDashboard')}</span>
          </button>
        )}
      </div>

      {loadingSub ? null : sub ? (
        <div className={styles.currentCard}>
          <div className={styles.currentHeader}>
            <i className="bx bx-package" />
            <span>{t('packages.currentPackage')}</span>
          </div>
          <div className={styles.currentBody}>
            <div className={styles.currentRow}>
              <span>{t('partner.packages.title')}</span>
              <strong>{sub.package_name}</strong>
            </div>
            <div className={styles.currentRow}>
              <span>{t('packages.daysLeft', { days: daysLeft })}</span>
              <strong>{t('packages.slotsUsed', { used: sub.slots_used, max: sub.max_slots })}</strong>
            </div>
          </div>
        </div>
      ) : (
        <p className={styles.noPackage}>{t('packages.noPackage')}</p>
      )}

      <h2 className={styles.sectionTitle}>{t('packages.select')}</h2>
      <p className={styles.hint}>{t('packages.selectHint')}</p>

      {loadingPkgs ? (
        <p className={styles.empty}>{t('common.loading')}</p>
      ) : !packages || packages.length === 0 ? (
        <p className={styles.empty}>{t('partner.packages.noPackages')}</p>
      ) : (
        <div className={styles.grid}>
          {packages.map((pkg) => (
            <div key={pkg.id} className={`${styles.card} ${selectedId === pkg.id ? styles.cardSelected : ''}`}>
              <h3 className={styles.cardName}>{pkg.name}</h3>
              <p className={styles.cardPrice}>
                {formatPrice(pkg.price_monthly)}
                <span>/tháng</span>
              </p>
              <p className={styles.cardDesc}>{pkg.description}</p>
              <ul className={styles.cardFeatures}>
                <li>
                  <i className="bx bx-check" /> {pkg.max_slots} slot
                </li>
                <li>
                  <i className="bx bx-check" /> {pkg.max_duration_days} ngày
                </li>
                {pkg.supports_video && (
                  <li>
                    <i className="bx bx-check" /> Video
                  </li>
                )}
                {pkg.supports_carousel && (
                  <li>
                    <i className="bx bx-check" /> Carousel
                  </li>
                )}
                {pkg.has_advanced_analytics && (
                  <li>
                    <i className="bx bx-check" /> Phân tích nâng cao
                  </li>
                )}
              </ul>
              <button
                className={`${styles.btnSelect} ${selectedId === pkg.id ? styles.btnSelected : ''}`}
                onClick={() => handleSelect(pkg.id)}
              >
                {selectedId === pkg.id ? t('packages.selected') : t('packages.select')}
              </button>
            </div>
          ))}
        </div>
      )}

      <section className={styles.payment}>
        <h2 className={styles.paymentTitle}>
          <i className="bx bx-credit-card" />
          <span>{t('payment.method')}</span>
        </h2>

        <label className={styles.payOption}>
          <input type="radio" name="paymentMethod" value="free" defaultChecked readOnly />
          <div className={styles.payText}>
            <span className={styles.payLabel}>{t('payment.free')}</span>
            <span className={styles.payDesc}>{t('payment.freeDescription')}</span>
          </div>
        </label>

        <label className={`${styles.payOption} ${styles.payDisabled}`}>
          <input type="radio" name="paymentMethod" value="vnpay" disabled />
          <div className={styles.payText}>
            <span className={styles.payLabel}>
              {t('payment.vnpay')}
              <span className={styles.badge}>{t('payment.vnpayComingSoon')}</span>
            </span>
            <span className={styles.payDesc}>{t('common.comingSoonDesc')}</span>
          </div>
        </label>
      </section>

      <div className={styles.actions}>
        <button
          className={styles.cta}
          disabled={!selectedId || subscribing}
          onClick={handleSubscribe}
        >
          {subscribing ? t('packages.subscribing') : t('payment.free')}
        </button>
        {!selectedId && <p className={styles.ctaHint}>{t('packages.selectHint')}</p>}
      </div>
    </div>
  )
}
