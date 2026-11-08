'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useTranslation } from '../../hooks/useTranslation'
import { getMySubscription } from '../../api/package'
import { getMyAds, getOverview } from '../../api/partner'
import type { AdOverview, PartnerAdListResponse, SubscriptionResponse } from '../../types'
import styles from './OnboardingChecklist.module.css'

const DISMISS_KEY = 'onboarding-dismissed:v1'
const APPROVED_STATUSES = ['active', 'paused', 'completed']

/**
 * Checklist 4 bước cho partner mới. Tick theo dữ liệu thật; ẩn được và lưu
 * lựa chọn vào localStorage.
 */
export default function OnboardingChecklist() {
  const { t } = useTranslation()
  // Mặc định ẩn để không nhấp nháy với người đã dismiss; effect đọc localStorage.
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const { data: subscription } = useSWR<SubscriptionResponse>(
    '/ads-management/subscription',
    () => getMySubscription(),
    { shouldRetryOnError: false },
  )
  const { data: ads } = useSWR<PartnerAdListResponse>(
    '/ads-management?page=1&page_size=20',
    () => getMyAds({ page: 1, page_size: 20 }),
  )
  const { data: overview } = useSWR<AdOverview>(
    '/ads-management/overview',
    () => getOverview(),
  )

  if (dismissed) return null

  const hasPlan = !!subscription
  const hasAd = (ads?.total ?? 0) > 0
  const hasApproved = (ads?.data ?? []).some((ad) => APPROVED_STATUSES.includes(ad.status))
  const hasImpressions = (overview?.impressions ?? 0) > 0

  const steps = [
    { key: 'plan', done: hasPlan, label: t('partner.onboarding.stepPlan') },
    { key: 'create', done: hasAd, label: t('partner.onboarding.stepCreate') },
    { key: 'approve', done: hasApproved, label: t('partner.onboarding.stepApprove') },
    { key: 'reach', done: hasImpressions, label: t('partner.onboarding.stepReach') },
  ]
  const completed = steps.filter((step) => step.done).length

  const cta = !hasPlan
    ? { href: '/packages', label: t('partner.onboarding.ctaPlan') }
    : !hasAd
      ? { href: '/partner/ads/new', label: t('partner.onboarding.ctaCreate') }
      : null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <section className={styles.card} aria-labelledby="onboarding-title">
      <div className={styles.header}>
        <div>
          <h2 id="onboarding-title" className={styles.title}>
            {t('partner.onboarding.title')}
          </h2>
          <p className={styles.subtitle}>
            {t('partner.onboarding.subtitle', { done: completed, total: steps.length })}
          </p>
        </div>
        <button
          type="button"
          className={styles.dismiss}
          onClick={dismiss}
          aria-label={t('partner.onboarding.dismiss')}
          title={t('partner.onboarding.dismiss')}
        >
          <i className="bx bx-x" />
        </button>
      </div>

      <div className={styles.progress} aria-hidden="true">
        <span
          className={styles.progressBar}
          style={{ width: `${(completed / steps.length) * 100}%` }}
        />
      </div>

      <ul className={styles.steps}>
        {steps.map((step) => (
          <li
            key={step.key}
            className={step.done ? styles.stepDone : styles.step}
            data-complete={step.done ? 'true' : 'false'}
          >
            <i className={`bx ${step.done ? 'bx-check-circle' : 'bx-circle'}`} aria-hidden="true" />
            <span>{step.label}</span>
          </li>
        ))}
      </ul>

      <div className={styles.actions}>
        {cta && (
          <Link href={cta.href} className={styles.cta}>
            {cta.label}
          </Link>
        )}
        <Link href="/partner/help/ads" className={styles.link}>
          {t('partner.onboarding.help')}
        </Link>
      </div>
    </section>
  )
}
