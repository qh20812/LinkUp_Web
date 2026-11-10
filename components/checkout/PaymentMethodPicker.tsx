'use client'

import React from 'react'
import Link from 'next/link'
import { useTranslation } from '../../hooks/useTranslation'
import type { PaymentMethodOption, WalletBalance } from '../../types'
import styles from './PaymentMethodPicker.module.css'

interface PaymentMethodPickerProps {
  methods: PaymentMethodOption[]
  value: string
  onChange: (key: string) => void
  /** Số dư ví — chỉ cần khi phương thức wallet đang bật. */
  wallet?: WalletBalance
  /** Giá gói đang chọn, dùng để cảnh báo thiếu tiền. */
  amount: number
  disabled?: boolean
}

const OPTION_META: Record<string, { label: string; description: string; icon: string }> = {
  wallet: { label: 'payment.wallet', description: 'payment.walletDescription', icon: 'bx-wallet' },
  momo: { label: 'payment.momo', description: 'payment.momoDescription', icon: 'bx-mobile-alt' },
  vnpay: { label: 'payment.vnpay', description: 'payment.vnpayDescription', icon: 'bx-credit-card-front' },
}

export default function PaymentMethodPicker({
  methods,
  value,
  onChange,
  wallet,
  amount,
  disabled = false,
}: PaymentMethodPickerProps) {
  const { t, language } = useTranslation()
  const enabled = methods.filter((method) => method.enabled)

  const formatMoney = (v: number) =>
    new Intl.NumberFormat(language === 'en' ? 'en-US' : 'vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(v)

  const shortfall = Math.max(0, amount - (wallet?.available ?? 0))

  return (
    <fieldset className={styles.section} disabled={disabled}>
      <legend className={styles.title}>
        <i className="bx bx-credit-card" aria-hidden="true" />
        <span>{t('payment.method')}</span>
      </legend>

      {enabled.length === 0 ? (
        <p className={styles.empty}>{t('payment.noMethod')}</p>
      ) : (
        <div className={styles.options}>
          {enabled.map((method) => {
            const meta = OPTION_META[method.key] ?? {
              label: method.key,
              description: '',
              icon: 'bx-credit-card',
            }
            const checked = value === method.key
            return (
              <label
                key={method.key}
                className={`${styles.option} ${checked ? styles.optionSelected : ''}`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.key}
                  checked={checked}
                  onChange={() => onChange(method.key)}
                  className={styles.radio}
                />
                <i className={`bx ${meta.icon} ${styles.icon}`} aria-hidden="true" />
                <span className={styles.text}>
                  <span className={styles.label}>{t(meta.label)}</span>
                  {meta.description && <span className={styles.desc}>{t(meta.description)}</span>}
                  {method.key === 'wallet' && wallet && (
                    <span className={styles.balance}>
                      {t('payment.walletAvailable', { amount: formatMoney(wallet.available) })}
                    </span>
                  )}
                  {method.key === 'wallet' && shortfall > 0 && (
                    <span className={styles.warn}>
                      {t('payment.walletShort', { amount: formatMoney(shortfall) })}{' '}
                      <Link href="/wallet" className={styles.topupLink}>
                        {t('payment.topUp')}
                      </Link>
                    </span>
                  )}
                </span>
              </label>
            )
          })}
        </div>
      )}
    </fieldset>
  )
}
