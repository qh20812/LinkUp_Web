'use client'

import React from 'react'
import { useTranslation } from '../../../hooks/useTranslation'
import styles from './Ads.module.css'

export default function AdsPage() {
  const { t } = useTranslation()

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('nav.ads')}</h1>
      </div>
      <div className={styles.content}>
        <div className={styles.empty}>
          <i className="bx bx-dollar-circle" />
          <p>{t('common.comingSoon')}</p>
        </div>
      </div>
    </div>
  )
}
