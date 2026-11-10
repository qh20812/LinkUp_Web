'use client'

import React from 'react'
import Link from 'next/link'
import { useTranslation } from '../../../../hooks/useTranslation'
import styles from './Help.module.css'

const FAQ_KEYS = [1, 2, 3, 4, 5] as const

export default function WalletHelpPage() {
  const { t } = useTranslation()

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('wallet.helpTitle')}</h1>
        <Link href="/wallet" className={styles.backLink}>
          <i className="bx bx-arrow-back" aria-hidden="true" />
          {t('wallet.backToWallet')}
        </Link>
      </div>

      <p className={styles.intro}>{t('wallet.helpIntro')}</p>

      <section className={styles.warn} aria-label={t('wallet.supportHint')}>
        <i className="bx bx-shield-quarter" aria-hidden="true" />
        <p>{t('wallet.supportHint')}</p>
      </section>

      <div className={styles.faqList}>
        {FAQ_KEYS.map((n) => (
          <section key={n} className={styles.faqItem} aria-labelledby={`wallet-faq-${n}`}>
            <h2 id={`wallet-faq-${n}`} className={styles.faqQuestion}>
              {t(`wallet.helpQ${n}`)}
            </h2>
            <p className={styles.faqAnswer}>{t(`wallet.helpA${n}`)}</p>
          </section>
        ))}
      </div>

      <p className={styles.footNote}>{t('wallet.amountMismatchNote')}</p>

      <Link href="/wallet" className={styles.cta}>
        {t('wallet.backToWallet')}
      </Link>
    </div>
  )
}
