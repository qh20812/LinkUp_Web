'use client'

import React from 'react'
import Modal from '../Modal'
import { useTranslation } from '../../hooks/useTranslation'
import { formatVnd } from '../../lib/ads-estimate'
import type { WalletBalance } from '../../types'
import styles from './WalletPurchaseModal.module.css'

interface WalletPurchaseModalProps {
  open: boolean
  packageName: string
  amount: number
  wallet?: WalletBalance
  submitting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function WalletPurchaseModal({
  open,
  packageName,
  amount,
  wallet,
  submitting,
  onClose,
  onConfirm,
}: WalletPurchaseModalProps) {
  const { t } = useTranslation()

  const formatMoney = (v: number) => formatVnd(v)

  const available = wallet?.available ?? 0
  const after = available - amount
  const insufficient = amount > available

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={t('payment.confirmTitle')}
      footer={
        <>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={submitting}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={onConfirm}
            disabled={submitting || insufficient}
          >
            {submitting ? t('payment.paying') : t('payment.confirmPay')}
          </button>
        </>
      }
    >
      <p className={styles.intro}>{t('payment.confirmIntro')}</p>

      <dl className={styles.summary}>
        <div className={styles.row}>
          <dt>{t('payment.packageLabel')}</dt>
          <dd>{packageName}</dd>
        </div>
        <div className={styles.row}>
          <dt>{t('payment.price')}</dt>
          <dd className={styles.amount}>{formatMoney(amount)}</dd>
        </div>
        <div className={styles.row}>
          <dt>{t('payment.walletBalance')}</dt>
          <dd>{formatMoney(available)}</dd>
        </div>
        <div className={`${styles.row} ${styles.total}`}>
          <dt>{t('payment.walletAfter')}</dt>
          <dd className={insufficient ? styles.negative : styles.positive}>
            {formatMoney(Math.max(after, 0))}
          </dd>
        </div>
      </dl>

      {insufficient ? (
        <p className={styles.warn} role="alert">
          {t('payment.insufficientWallet', { amount: formatMoney(amount - available) })}
        </p>
      ) : (
        <p className={styles.hint}>{t('payment.confirmHint')}</p>
      )}
    </Modal>
  )
}
