'use client'

import React from 'react'
import { useTranslation } from '../../../hooks/useTranslation'
import styles from './Profile.module.css'

export default function AdminProfilePage() {
  const { t } = useTranslation()

  return (
    <div className={styles.page}>
      <div className={styles.comingSoon}>
        <i className="bx bx-info-circle" />
        <h2>{t('common.comingSoon')}</h2>
        <p>{t('common.comingSoonDesc')}</p>
      </div>
    </div>
  )
}
