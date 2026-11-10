'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { swrFetcher } from '../../../api/swr'
import { useTranslation } from '../../../hooks/useTranslation'
import Pagination from '../../../components/Pagination'
import PaymentsTable from '../../../components/PaymentsTable'
import type { PaymentListResponse } from '../../../types'
import styles from './Payments.module.css'

const PAGE_SIZE = 20

export default function PartnerPaymentsPage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [gateway, setGateway] = useState('')

  const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
  if (status) params.set('status', status)
  if (gateway) params.set('gateway', gateway)

  const { data, isLoading } = useSWR<PaymentListResponse>(`/ads-management/payments?${params}`, (url: string) =>
    swrFetcher<PaymentListResponse>(url),
  )

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('payments.title')}</h1>
        <Link href="/packages" className={styles.cta}>
          {t('packages.select')}
        </Link>
      </div>

      <div className={styles.toolbar}>
        <select className={styles.select} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">{t('payments.allStatuses')}</option>
          <option value="pending">{t('payments.status_pending')}</option>
          <option value="success">{t('payments.status_success')}</option>
          <option value="failed">{t('payments.status_failed')}</option>
          <option value="cancelled">{t('payments.status_cancelled')}</option>
        </select>
        <select className={styles.select} value={gateway} onChange={(e) => { setGateway(e.target.value); setPage(1) }}>
          <option value="">{t('payments.allGateways')}</option>
          <option value="momo">MoMo</option>
          <option value="vnpay">VNPay</option>
        </select>
      </div>

      <PaymentsTable rows={data?.data ?? []} loading={isLoading} />

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      <p className={styles.hint}>{t('payments.retryHint')}</p>
    </div>
  )
}
