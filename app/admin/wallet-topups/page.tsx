'use client'

import React, { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import {
  adminApproveTopup,
  adminListTopups,
  adminListWallets,
  adminRejectTopup,
} from '../../../api/wallet'
import { formatVnd } from '../../../lib/ads-estimate'
import Modal from '../../../components/Modal'
import Pagination from '../../../components/Pagination'
import MoneyInput from '../../../components/forms/MoneyInput'
import type {
  AdminWalletListResponse,
  WalletTopup,
  WalletTopupListResponse,
} from '../../../types'
import styles from './WalletTopups.module.css'

const PAGE_SIZE = 20

type Tab = 'all' | 'pending' | 'reported' | 'paid' | 'rejected' | 'expired'

const TABS: Tab[] = ['pending', 'reported', 'paid', 'rejected', 'expired', 'all']

function tabQuery(tab: Tab): { status?: string; reported?: boolean } {
  if (tab === 'all') return {}
  if (tab === 'reported') return { status: 'pending', reported: true }
  return { status: tab }
}

function formatDateTime(value: string, locale: string): string {
  if (!value) return '—'
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminWalletTopupsPage() {
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const locale = language === 'en' ? 'en-US' : 'vi-VN'

  const [tab, setTab] = useState<Tab>('pending')
  const [searchInput, setSearchInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [approveTarget, setApproveTarget] = useState<WalletTopup | null>(null)
  const [rejectTarget, setRejectTarget] = useState<WalletTopup | null>(null)
  const [confirmedAmount, setConfirmedAmount] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const query = tabQuery(tab)
  const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
  if (query.status) params.set('status', query.status)
  if (query.reported) params.set('reported', 'true')
  if (keyword) params.set('keyword', keyword)

  const {
    data: topups,
    isLoading,
    mutate: mutateTopups,
  } = useSWR<WalletTopupListResponse>(`/admin/wallet/topups?${params}`, () =>
    adminListTopups({
      page,
      page_size: PAGE_SIZE,
      status: query.status,
      reported: query.reported,
      keyword: keyword || undefined,
    }),
  )

  const { data: wallets, mutate: mutateWallets } = useSWR<AdminWalletListResponse>(
    '/admin/wallets?page=1&page_size=1',
    () => adminListWallets({ page: 1, page_size: 1 }),
  )

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [])

  const handleSearch = (value: string) => {
    setSearchInput(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setKeyword(value.trim())
      setPage(1)
    }, 400)
  }

  const changeTab = (next: Tab) => {
    setTab(next)
    setPage(1)
  }

  const openApprove = (topup: WalletTopup) => {
    setApproveTarget(topup)
    setConfirmedAmount(String(topup.amount))
    setAdminNote('')
  }

  const openReject = (topup: WalletTopup) => {
    setRejectTarget(topup)
    setRejectReason('')
  }

  const refreshAll = () => {
    void mutateTopups()
    void mutateWallets()
  }

  const handleApprove = async () => {
    if (!approveTarget) return
    const value = Number(confirmedAmount)
    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: t('walletAdmin.amount'), type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      await adminApproveTopup(approveTarget.id, {
        confirmed_amount: value,
        note: adminNote.trim(),
      })
      toast({ title: t('walletAdmin.approveSuccess'), type: 'success' })
      setApproveTarget(null)
      refreshAll()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    if (!rejectReason.trim()) {
      toast({ title: t('walletAdmin.reasonRequired'), type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      await adminRejectTopup(rejectTarget.id, rejectReason.trim())
      toast({ title: t('walletAdmin.rejectSuccess'), type: 'success' })
      setRejectTarget(null)
      refreshAll()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const statusBadge = (topup: WalletTopup) => {
    const label = t(`wallet.${topup.status}`)
    const map: Record<string, string> = {
      pending: styles.badgePending,
      paid: styles.badgePaid,
      rejected: styles.badgeRejected,
      expired: styles.badgeMuted,
      cancelled: styles.badgeMuted,
    }
    return <span className={`${styles.badge} ${map[topup.status] ?? styles.badgeMuted}`}>{label}</span>
  }

  const totalPages = Math.max(1, Math.ceil((topups?.total ?? 0) / PAGE_SIZE))

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('walletAdmin.title')}</h1>
        <p className={styles.subtitle}>{t('walletAdmin.subtitle')}</p>
      </div>

      <section className={styles.summaryGrid} aria-label={t('walletAdmin.title')}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{t('walletAdmin.totalBalance')}</span>
          <strong className={styles.summaryValue}>{formatVnd(wallets?.total_balance ?? 0)}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{t('walletAdmin.totalReserved')}</span>
          <strong className={styles.summaryValue}>{formatVnd(wallets?.total_reserved ?? 0)}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{t('walletAdmin.totalTopup')}</span>
          <strong className={styles.summaryValue}>{formatVnd(wallets?.total_topup_all ?? 0)}</strong>
        </div>
      </section>

      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist" aria-label={t('walletAdmin.title')}>
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              className={`${styles.tab} ${tab === item ? styles.tabActive : ''}`}
              onClick={() => changeTab(item)}
            >
              {t(`walletAdmin.tabs${item.charAt(0).toUpperCase()}${item.slice(1)}`)}
            </button>
          ))}
        </div>
        <div className={styles.searchWrap}>
          <i className={`bx bx-search ${styles.searchIcon}`} aria-hidden="true" />
          <input
            className={styles.searchInput}
            type="search"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t('walletAdmin.searchPlaceholder')}
            aria-label={t('walletAdmin.searchPlaceholder')}
          />
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{t('walletAdmin.colCode')}</th>
              <th scope="col">{t('walletAdmin.colUser')}</th>
              <th scope="col" className={styles.num}>{t('walletAdmin.colAmount')}</th>
              <th scope="col">{t('walletAdmin.colReported')}</th>
              <th scope="col">{t('walletAdmin.colCreated')}</th>
              <th scope="col">{t('walletAdmin.colExpires')}</th>
              <th scope="col">{t('walletAdmin.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`}>
                  {Array.from({ length: 7 }).map((__, cellIndex) => (
                    <td key={cellIndex}>
                      <span className={styles.skeleton} />
                    </td>
                  ))}
                </tr>
              ))
            ) : (topups?.data ?? []).length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyCell}>{t('walletAdmin.noRows')}</td>
              </tr>
            ) : (
              topups?.data.map((topup) => (
                <tr key={topup.id}>
                  <td>
                    <span className={styles.mono}>{topup.code}</span>
                    {topup.proof_url && (
                      <a
                        className={styles.proofLink}
                        href={topup.proof_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        title={t('walletAdmin.proof')}
                      >
                        <i className="bx bx-link-external" aria-hidden="true" />
                      </a>
                    )}
                  </td>
                  <td>
                    <div className={styles.userCell}>
                      <strong>{topup.display_name || topup.username || topup.user_id}</strong>
                      {topup.email && <span>{topup.email}</span>}
                    </div>
                  </td>
                  <td className={styles.num}>{formatVnd(topup.amount)}</td>
                  <td>
                    <div className={styles.statusCell}>
                      {statusBadge(topup)}
                      <span className={topup.user_reported_at ? styles.reported : styles.notReported}>
                        {topup.user_reported_at ? t('walletAdmin.reported') : t('walletAdmin.notReported')}
                      </span>
                    </div>
                  </td>
                  <td>{formatDateTime(topup.created_at, locale)}</td>
                  <td>{formatDateTime(topup.expires_at, locale)}</td>
                  <td>
                    {topup.status === 'pending' ? (
                      <div className={styles.rowActions}>
                        <button type="button" className={styles.btnApprove} onClick={() => openApprove(topup)}>
                          {t('walletAdmin.approve')}
                        </button>
                        <button type="button" className={styles.btnReject} onClick={() => openReject(topup)}>
                          {t('walletAdmin.reject')}
                        </button>
                      </div>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      <Modal
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title={t('walletAdmin.approveTitle', { code: approveTarget?.code ?? '' })}
        footer={
          <>
            <button type="button" className={styles.btnGhost} onClick={() => setApproveTarget(null)}>
              {t('walletAdmin.cancel')}
            </button>
            <button type="button" className={styles.btnApprove} onClick={handleApprove} disabled={submitting}>
              {submitting ? t('common.loading') : t('walletAdmin.approve')}
            </button>
          </>
        }
      >
        <p className={styles.hint}>{t('walletAdmin.approveDesc')}</p>
        <dl className={styles.detailList}>
          <div>
            <dt>{t('walletAdmin.code')}</dt>
            <dd className={styles.mono}>{approveTarget?.code}</dd>
          </div>
          <div>
            <dt>{t('walletAdmin.amount')}</dt>
            <dd>{formatVnd(approveTarget?.amount ?? 0)}</dd>
          </div>
          <div>
            <dt>{t('walletAdmin.reportedAt')}</dt>
            <dd>
              {approveTarget?.user_reported_at
                ? formatDateTime(approveTarget.user_reported_at, locale)
                : t('walletAdmin.notReported')}
            </dd>
          </div>
        </dl>
        <label className={styles.label} htmlFor="admin-confirmed-amount">
          {t('walletAdmin.confirmedAmount')}
        </label>
        <MoneyInput
          id="admin-confirmed-amount"
          value={confirmedAmount}
          onValueChange={setConfirmedAmount}
        />
        <label className={styles.label} htmlFor="admin-note">
          {t('walletAdmin.note')}
        </label>
        <textarea
          id="admin-note"
          className={styles.textarea}
          rows={3}
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder={t('walletAdmin.notePlaceholder')}
        />
      </Modal>

      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title={t('walletAdmin.rejectTitle', { code: rejectTarget?.code ?? '' })}
        footer={
          <>
            <button type="button" className={styles.btnGhost} onClick={() => setRejectTarget(null)}>
              {t('walletAdmin.cancel')}
            </button>
            <button
              type="button"
              className={styles.btnDanger}
              onClick={handleReject}
              disabled={submitting || !rejectReason.trim()}
            >
              {submitting ? t('common.loading') : t('walletAdmin.reject')}
            </button>
          </>
        }
      >
        <label className={styles.label} htmlFor="admin-reject-reason">
          {t('walletAdmin.rejectReason')}
        </label>
        <textarea
          id="admin-reject-reason"
          className={styles.textarea}
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder={t('walletAdmin.rejectReasonPlaceholder')}
          required
        />
        <p className={styles.hint}>{t('walletAdmin.reasonRequired')}</p>
      </Modal>
    </div>
  )
}
