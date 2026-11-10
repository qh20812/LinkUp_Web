'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import {
  cancelTopup,
  createTopup,
  getWallet,
  listTopups,
  listWalletTransactions,
  reportTopup,
} from '../../api/wallet'
import { formatVnd } from '../../lib/ads-estimate'
import { canReportTransfer, formatCountdown, topupStatusKey } from '../../lib/wallet'
import Modal from '../Modal'
import Pagination from '../Pagination'
import type {
  WalletResponse,
  WalletTopup,
  WalletTopupCreated,
  WalletTopupListResponse,
  WalletTransactionListResponse,
} from '../../types'
import styles from './WalletView.module.css'

const PAGE_SIZE = 10
const PRESETS = [50000, 100000, 200000, 500000]

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

export default function WalletView() {
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const locale = language === 'en' ? 'en-US' : 'vi-VN'

  const [amount, setAmount] = useState('')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<WalletTopupCreated | null>(null)
  const [reported, setReported] = useState(false)
  const [proofUrl, setProofUrl] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [reportTargetId, setReportTargetId] = useState<string | null>(null)
  const [reporting, setReporting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [topupPage, setTopupPage] = useState(1)
  const [ledgerPage, setLedgerPage] = useState(1)
  const paidNoticeRef = useRef<string | null>(null)

  const {
    data: wallet,
    mutate: mutateWallet,
  } = useSWR<WalletResponse>('/wallet', () => getWallet(), { refreshInterval: 30000 })

  const {
    data: topups,
    mutate: mutateTopups,
  } = useSWR<WalletTopupListResponse>(
    `/wallet/topups?page=${topupPage}&page_size=${PAGE_SIZE}`,
    () => listTopups(topupPage, PAGE_SIZE),
    { refreshInterval: created ? 15000 : 60000 },
  )

  const { data: ledger } = useSWR<WalletTransactionListResponse>(
    `/wallet/transactions?page=${ledgerPage}&page_size=${PAGE_SIZE}`,
    () => listWalletTransactions(ledgerPage, PAGE_SIZE),
  )

  // Đồng hồ đếm ngược chỉ chạy khi đang có mã chưa xử lý.
  useEffect(() => {
    if (!created) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [created])

  const latestCreated: WalletTopup | undefined = created
    ? topups?.data.find((item) => item.id === created.id)
    : undefined

  // Quản trị viên duyệt xong: báo + cập nhật số dư mà không cần tải lại trang.
  useEffect(() => {
    if (!created || !latestCreated) return
    if (latestCreated.status !== 'paid') return
    if (paidNoticeRef.current === created.id) return
    paidNoticeRef.current = created.id
    toast({ title: t('wallet.paidToast'), type: 'success' })
    setCreated(null)
    setReported(false)
    void mutateWallet()
    void mutateTopups()
  }, [created, latestCreated, t, toast, mutateWallet, mutateTopups])

  const expiresInMs = created ? new Date(created.expires_at).getTime() - now : 0
  const expired = !!created && expiresInMs <= 0

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: t('wallet.copied'), type: 'success' })
    } catch {
      toast({ title: value, type: 'info' })
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: t('wallet.amountPlaceholder'), type: 'error' })
      return
    }
    setCreating(true)
    try {
      const res = await createTopup(value)
      setCreated(res)
      setReported(false)
      setProofUrl('')
      setNow(Date.now())
      paidNoticeRef.current = null
      setAmount('')
      void mutateTopups()
      toast({ title: t('wallet.topupSuccess'), type: 'success' })
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  const handleReport = async () => {
    const targetID = reportTargetId ?? created?.id
    if (!targetID) return
    setReporting(true)
    try {
      await reportTopup(targetID, proofUrl.trim() || undefined)
      if (created?.id === targetID) setReported(true)
      setReportOpen(false)
      setReportTargetId(null)
      toast({ title: t('wallet.reportSuccess'), type: 'success' })
      void mutateTopups()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setReporting(false)
    }
  }

  const openReport = (id: string) => {
    setReportTargetId(id)
    setProofUrl('')
    setReportOpen(true)
  }

  const handleCancel = async () => {
    if (!created) return
    if (!window.confirm(t('wallet.cancelConfirm'))) return
    setCancelling(true)
    try {
      await cancelTopup(created.id)
      setCreated(null)
      setReported(false)
      toast({ title: t('wallet.cancelSuccess'), type: 'success' })
      void mutateTopups()
      void mutateWallet()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setCancelling(false)
    }
  }

  const topupTotalPages = Math.max(1, Math.ceil((topups?.total ?? 0) / PAGE_SIZE))
  const ledgerTotalPages = Math.max(1, Math.ceil((ledger?.total ?? 0) / PAGE_SIZE))

  const statusLabel = (status: string) => t(topupStatusKey(status))

  const statusClass = (status: string) => {
    const map: Record<string, string> = {
      pending: styles.badgePending,
      paid: styles.badgePaid,
      rejected: styles.badgeRejected,
      expired: styles.badgeMuted,
      cancelled: styles.badgeMuted,
    }
    return map[status] ?? styles.badgeMuted
  }

  const ledgerAmount = (type: string, value: number) => {
    if (type === 'spend') return formatVnd(-value)
    if (type === 'release') return formatVnd(value)
    return formatVnd(value)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('wallet.title')}</h1>
          <p className={styles.subtitle}>{t('wallet.subtitle')}</p>
        </div>
        <Link href="/wallet/help" className={styles.helpLink}>
          <i className="bx bx-help-circle" aria-hidden="true" />
          {t('wallet.helpLink')}
        </Link>
      </div>

      <section className={styles.summaryGrid} aria-label={t('wallet.title')}>
        <div className={`${styles.summaryCard} ${styles.summaryPrimary}`}>
          <span className={styles.summaryLabel}>{t('wallet.available')}</span>
          <strong className={styles.summaryValue}>{formatVnd(wallet?.available ?? 0)}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{t('wallet.reserved')}</span>
          <strong className={styles.summaryValue}>{formatVnd(wallet?.reserved ?? 0)}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{t('wallet.totalTopup')}</span>
          <strong className={styles.summaryValue}>{formatVnd(wallet?.total_topup ?? 0)}</strong>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{t('wallet.totalSpent')}</span>
          <strong className={styles.summaryValue}>{formatVnd(wallet?.total_spent ?? 0)}</strong>
        </div>
      </section>

      {created ? (
        <section className={styles.qrCard} aria-labelledby="wallet-qr-title">
          <div className={styles.qrHead}>
            <h2 id="wallet-qr-title" className={styles.sectionTitle}>
              <i className="bx bx-qr" aria-hidden="true" /> {t('wallet.qrTitle')}
            </h2>
            <span className={`${styles.badge} ${statusClass('pending')}`}>
              {reported ? t('wallet.reported') : t('wallet.pending')}
            </span>
          </div>

          <div className={styles.qrBody}>
            <div className={styles.qrImageWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.qrImage}
                src={created.qr_url}
                alt={t('wallet.qrAlt', {
                  bank: created.bank.bank_name || created.bank.bank_bin,
                  code: created.code,
                })}
              />
              <p className={expired ? styles.countdownExpired : styles.countdown}>
                {expired
                  ? t('wallet.expired')
                  : t('wallet.expiresIn', { time: formatCountdown(expiresInMs) })}
              </p>
            </div>

            <div className={styles.bankPane}>
              <h3 className={styles.subHeading}>{t('wallet.bankInfo')}</h3>
              <dl className={styles.bankList}>
                <div className={styles.bankRow}>
                  <dt>{t('wallet.bankName')}</dt>
                  <dd>{created.bank.bank_name || created.bank.bank_bin}</dd>
                </div>
                <div className={styles.bankRow}>
                  <dt>{t('wallet.accountNo')}</dt>
                  <dd>
                    <span className={styles.mono}>{created.bank.account_no}</span>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => handleCopy(created.bank.account_no)}
                    >
                      <i className="bx bx-copy" aria-hidden="true" /> {t('wallet.copy')}
                    </button>
                  </dd>
                </div>
                <div className={styles.bankRow}>
                  <dt>{t('wallet.accountName')}</dt>
                  <dd>{created.bank.account_name}</dd>
                </div>
                <div className={styles.bankRow}>
                  <dt>{t('wallet.amount')}</dt>
                  <dd>
                    <strong className={styles.amountStrong}>{formatVnd(created.amount)}</strong>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => handleCopy(String(created.amount))}
                    >
                      <i className="bx bx-copy" aria-hidden="true" /> {t('wallet.copy')}
                    </button>
                  </dd>
                </div>
                <div className={styles.bankRow}>
                  <dt>{t('wallet.memo')}</dt>
                  <dd>
                    <span className={styles.memo}>{created.code}</span>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => handleCopy(created.code)}
                    >
                      <i className="bx bx-copy" aria-hidden="true" /> {t('wallet.copy')}
                    </button>
                  </dd>
                </div>
              </dl>

              <p className={styles.warnNote}>
                <i className="bx bx-shield-quarter" aria-hidden="true" /> {t('wallet.supportHint')}
              </p>
              <p className={styles.hint}>{t('wallet.amountMismatchNote')}</p>

              <div className={styles.qrActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => openReport(created.id)}
                  disabled={!canReportTransfer(expired, reported)}
                >
                  <i className="bx bx-check-circle" aria-hidden="true" />
                  {reported ? t('wallet.reported') : t('wallet.reportTransferred')}
                </button>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={handleCancel}
                  disabled={cancelling || reported}
                >
                  {t('wallet.cancelTopup')}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className={styles.topupCard} aria-labelledby="wallet-topup-title">
          <h2 id="wallet-topup-title" className={styles.sectionTitle}>
            <i className="bx bx-wallet" aria-hidden="true" /> {t('wallet.topupTitle')}
          </h2>
          <form className={styles.topupForm} onSubmit={handleCreate}>
            <div className={styles.presets} role="group" aria-label={t('wallet.preset')}>
              {PRESETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.preset} ${Number(amount) === value ? styles.presetActive : ''}`}
                  onClick={() => setAmount(String(value))}
                >
                  {formatVnd(value)}
                </button>
              ))}
            </div>
            <label className={styles.label} htmlFor="wallet-amount">
              {t('wallet.amount')}
            </label>
            <div className={styles.amountRow}>
              <input
                id="wallet-amount"
                className={styles.input}
                type="number"
                inputMode="numeric"
                min={10000}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t('wallet.amountPlaceholder')}
              />
              <button type="submit" className={styles.btnPrimary} disabled={creating}>
                {creating ? t('wallet.creating') : t('wallet.createTopup')}
              </button>
            </div>
            <p className={styles.hint}>{t('wallet.amountMismatchNote')}</p>
          </form>
        </section>
      )}

      <section className={styles.tableSection} aria-labelledby="wallet-topups-title">
        <h2 id="wallet-topups-title" className={styles.sectionTitle}>
          {t('wallet.topupHistory')}
        </h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('wallet.colCode')}</th>
                <th scope="col" className={styles.num}>{t('wallet.colAmount')}</th>
                <th scope="col">{t('wallet.colStatus')}</th>
                <th scope="col">{t('wallet.colCreated')}</th>
                <th scope="col">{t('wallet.colExpires')}</th>
                <th scope="col">{t('wallet.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {(topups?.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>{t('wallet.noTopups')}</td>
                </tr>
              ) : (
                topups?.data.map((item) => (
                  <tr key={item.id}>
                    <td><span className={styles.mono}>{item.code}</span></td>
                    <td className={styles.num}>{formatVnd(item.confirmed_amount ?? item.amount)}</td>
                    <td>
                      <span className={`${styles.badge} ${statusClass(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td>{formatDateTime(item.created_at, locale)}</td>
                    <td>{formatDateTime(item.expires_at, locale)}</td>
                    <td>
                      {item.status === 'pending' && !item.user_reported_at ? (
                        <button
                          type="button"
                          className={styles.reportBtn}
                          onClick={() => openReport(item.id)}
                        >
                          {t('wallet.reportTransferred')}
                        </button>
                      ) : item.user_reported_at ? (
                        <span className={styles.reportedTag}>{t('wallet.reported')}</span>
                      ) : (
                        <span className={styles.noteCell}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {topupTotalPages > 1 && (
          <div className={styles.pagination}>
            <Pagination page={topupPage} totalPages={topupTotalPages} onChange={setTopupPage} />
          </div>
        )}
      </section>

      <section className={styles.tableSection} aria-labelledby="wallet-ledger-title">
        <h2 id="wallet-ledger-title" className={styles.sectionTitle}>{t('wallet.ledger')}</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('wallet.colType')}</th>
                <th scope="col" className={styles.num}>{t('wallet.colAmount')}</th>
                <th scope="col" className={styles.num}>{t('wallet.colBalanceAfter')}</th>
                <th scope="col">{t('wallet.colNote')}</th>
                <th scope="col">{t('wallet.colCreated')}</th>
              </tr>
            </thead>
            <tbody>
              {(ledger?.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>{t('wallet.noTransactions')}</td>
                </tr>
              ) : (
                ledger?.data.map((row) => (
                  <tr key={row.id}>
                    <td>{t(`wallet.type_${row.type}`)}</td>
                    <td className={`${styles.num} ${row.type === 'spend' ? styles.amountOut : styles.amountIn}`}>
                      {ledgerAmount(row.type, row.amount)}
                    </td>
                    <td className={styles.num}>{formatVnd(row.balance_after)}</td>
                    <td className={styles.noteCell}>{row.note || '—'}</td>
                    <td>{formatDateTime(row.created_at, locale)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {ledgerTotalPages > 1 && (
          <div className={styles.pagination}>
            <Pagination page={ledgerPage} totalPages={ledgerTotalPages} onChange={setLedgerPage} />
          </div>
        )}
      </section>

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title={t('wallet.reportTitle')}
        footer={
          <>
            <button type="button" className={styles.btnGhost} onClick={() => setReportOpen(false)}>
              {t('common.cancel')}
            </button>
            <button type="button" className={styles.btnPrimary} onClick={handleReport} disabled={reporting}>
              {reporting ? t('common.loading') : t('wallet.reportTransferred')}
            </button>
          </>
        }
      >
        <p className={styles.hint}>{t('wallet.reportDesc')}</p>
        <label className={styles.label} htmlFor="wallet-proof">
          {t('wallet.proofUrl')}
        </label>
        <input
          id="wallet-proof"
          className={styles.input}
          type="url"
          value={proofUrl}
          onChange={(e) => setProofUrl(e.target.value)}
          placeholder="https://"
        />
        <p className={styles.hint}>{t('wallet.proofHint')}</p>
      </Modal>
    </div>
  )
}
