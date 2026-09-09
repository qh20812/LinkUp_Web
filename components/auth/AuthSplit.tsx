'use client'

import React from 'react'
import Image from 'next/image'
import { useTranslation } from '../../hooks/useTranslation'
import styles from './AuthSplit.module.css'

function BrandPane() {
  const { t } = useTranslation()

  return (
    <div className={styles.brandInner}>
      <div className={styles.brandLogo}>
        <Image src="/S-Logo-Rmbg.png" alt="LinkUp" width={48} height={48} className={styles.brandLogoImg} />
        <span className={styles.brandName}>LinkUp</span>
      </div>
      <h2 className={styles.brandText}>{t('brand.headline')}</h2>
      <p className={styles.brandTagline}>{t('brand.tagline')}</p>
    </div>
  )
}

export default function AuthSplit({
  side,
  children,
}: {
  side?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className={styles.split}>
      <aside className={styles.brandPane}>{side ?? <BrandPane />}</aside>
      <div className={styles.formPane}>{children}</div>
    </div>
  )
}