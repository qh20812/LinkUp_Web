'use client'

import React from 'react'
import Link from 'next/link'
import { useTranslation } from '../../../../hooks/useTranslation'
import styles from './Help.module.css'

/** Các trạng thái ad, khớp state machine ở server. */
const STATUSES = ['pending', 'active', 'paused', 'rejected', 'suspended', 'completed'] as const

/**
 * Trợ giúp ngắn cho người lần đầu tạo quảng cáo. Nội dung phải khớp hành vi
 * thật của hệ thống: ad mới luôn Chờ duyệt, chỉ trừ tiền khi đang chạy, và
 * ad bị tạm ngưng thì partner không tự bật lại được.
 */
export default function AdsHelpPage() {
  const { t } = useTranslation()

  const sections = [
    { icon: 'bx-image', title: t('partner.help.prepareTitle'), body: t('partner.help.prepareBody') },
    { icon: 'bx-wallet', title: t('partner.help.budgetTitle'), body: t('partner.help.budgetBody') },
    { icon: 'bx-calendar', title: t('partner.help.scheduleTitle'), body: t('partner.help.scheduleBody') },
    { icon: 'bx-time-five', title: t('partner.help.approvalTitle'), body: t('partner.help.approvalBody') },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('partner.help.title')}</h1>
        <p className={styles.intro}>{t('partner.help.intro')}</p>
        <div className={styles.headerActions}>
          <Link href="/partner/ads/new" className={styles.btnPrimary}>
            <i className="bx bx-plus" aria-hidden="true" /> {t('partner.ads.create')}
          </Link>
          <Link href="/partner/ads" className={styles.btnGhost}>
            {t('partner.help.backToList')}
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        {sections.map((section) => (
          <section key={section.title} className={styles.card} aria-labelledby={`help-${section.icon}`}>
            <h2 id={`help-${section.icon}`} className={styles.cardTitle}>
              <i className={`bx ${section.icon}`} aria-hidden="true" /> {section.title}
            </h2>
            <p className={styles.cardBody}>{section.body}</p>
          </section>
        ))}

        <section className={styles.card} aria-labelledby="help-statuses">
          <h2 id="help-statuses" className={styles.cardTitle}>
            <i className="bx bx-list-check" aria-hidden="true" /> {t('partner.help.statusTitle')}
          </h2>
          <dl className={styles.statusList}>
            {STATUSES.map((status) => (
              <div key={status} className={styles.statusRow}>
                <dt>{t(`partner.ads.${status}`)}</dt>
                <dd>{t(`partner.help.status_${status}`)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.card} aria-labelledby="help-manage">
          <h2 id="help-manage" className={styles.cardTitle}>
            <i className="bx bx-edit" aria-hidden="true" /> {t('partner.help.manageTitle')}
          </h2>
          <p className={styles.cardBody}>{t('partner.help.manageBody')}</p>
        </section>

        <section className={styles.card} aria-labelledby="help-targeting">
          <h2 id="help-targeting" className={styles.cardTitle}>
            <i className="bx bx-target-lock" aria-hidden="true" /> {t('partner.help.targetingTitle')}
          </h2>
          <p className={styles.cardBody}>{t('partner.help.targetingBody')}</p>
        </section>
      </div>
    </div>
  )
}
