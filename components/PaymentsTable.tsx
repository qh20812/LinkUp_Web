'use client'

import { useTranslation } from '../hooks/useTranslation'
import type { PaymentTransaction } from '../types'
import styles from './PaymentsTable.module.css'

interface PaymentsTableProps {
  rows: PaymentTransaction[]
  showUser?: boolean
  loading?: boolean
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)
}

function formatDate(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN')
}

export default function PaymentsTable({ rows, showUser = false, loading = false }: PaymentsTableProps) {
  const { t } = useTranslation()

  if (loading) {
    return <p className={styles.empty}>{t('common.loading')}</p>
  }
  if (rows.length === 0) {
    return <p className={styles.empty}>{t('payments.noData')}</p>
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t('payments.txnRef')}</th>
            {showUser && <th>{t('payments.user')}</th>}
            <th>{t('payments.package')}</th>
            <th>{t('payments.amount')}</th>
            <th>{t('payments.gateway')}</th>
            <th>{t('payments.status')}</th>
            <th>{t('payments.createdAt')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className={styles.mono}>{row.txn_ref}</td>
              {showUser && <td className={styles.mono}>{row.user_id}</td>}
              <td>{row.package?.name || row.package_id}</td>
              <td>{formatCurrency(row.amount)}</td>
              <td className={styles.gateway}>{row.gateway.toUpperCase()}</td>
              <td>
                <span className={`${styles.badge} ${styles[`badge_${row.status}`] ?? ''}`}>
                  {t(`payments.status_${row.status}`)}
                </span>
              </td>
              <td>{formatDate(row.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
