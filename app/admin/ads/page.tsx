'use client'

import React, { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { swrFetcher, invalidate } from '../../../api/swr'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { updateAdStatus, deleteAd } from '../../../api/admin'
import { getUserRoleFromToken } from '../../../utils/auth'
import AdAnalyticsModal from '../../../components/AdAnalyticsModal'
import type { AdminAdListItem, AdminAdListResponse } from '../../../types'
import styles from './Ads.module.css'
import { toErrorMessage } from '../../../utils/errorMessage'

export default function AdsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [searchInput, setSearchInput] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(null)

  const [analyticsTarget, setAnalyticsTarget] = useState<AdminAdListItem | null>(null)

  const [statusTarget, setStatusTarget] = useState<AdminAdListItem | null>(null)
  const [statusValue, setStatusValue] = useState<string>('')
  const [rejectionReason, setRejectionReason] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<AdminAdListItem | null>(null)

  const [actionLoading, setActionLoading] = useState(false)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (keyword) params.set('keyword', keyword)
  if (statusFilter) params.set('status', statusFilter)
  const swrKey = `/admin/ads?${params}`
  const { data: res, error, isLoading: loading } = useSWR(swrKey, (url: string) => swrFetcher<AdminAdListResponse>(url))
  const items = res?.ads ?? []
  const total = res?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const [userRole] = useState(() => getUserRoleFromToken())
  const canDelete = userRole === null || userRole === 'SUPER_ADMIN'
  const canSetActive = userRole === null || userRole === 'SUPER_ADMIN'

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setKeyword(e.target.value)
      setPage(1)
    }, 400)
  }

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value)
    setPage(1)
  }

  const closeMenu = () => {
    setOpenMenuId(null)
    setMenuStyle(null)
  }

  useEffect(() => {
    if (!openMenuId) return
    const handleClick = () => closeMenu()
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [openMenuId])

  const handleOpenAnalytics = (ad: AdminAdListItem) => {
    setAnalyticsTarget(ad)
  }

  const handleConfirmStatusChange = async () => {
    if (!statusTarget || !statusValue) return
    if (statusValue === 'rejected' && !rejectionReason.trim()) return
    setActionLoading(true)
    try {
      await updateAdStatus(statusTarget.id, statusValue, statusValue === 'rejected' ? rejectionReason : undefined)
      toast({ title: t('ads.statusUpdated'), type: 'success' })
      setStatusTarget(null)
      setStatusValue('')
      setRejectionReason('')
      invalidate('/admin/ads')
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      await deleteAd(deleteTarget.id)
      toast({ title: t('ads.deleteSuccess'), type: 'success' })
      setDeleteTarget(null)
      invalidate('/admin/ads')
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = []
    pages.push(1)
    const left = Math.max(2, page - 1)
    const right = Math.min(totalPages - 1, page + 1)
    if (left > 2) pages.push('...')
    for (let i = left; i <= right; i++) pages.push(i)
    if (right < totalPages - 1) pages.push('...')
    if (totalPages > 1) pages.push(totalPages)
    return pages
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value)
  }

  const formatNumber = (value: number): string => {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M'
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K'
    return value.toLocaleString()
  }

  const formatCtr = (value: number): string => {
    return value.toFixed(1) + '%'
  }

  const statusBadgeClass = (status: string): string => {
    const map: Record<string, string> = {
      active: styles.badgeActive,
      paused: styles.badgePaused,
      completed: styles.badgeCompleted,
      pending: styles.badgePending,
      rejected: styles.badgeRejected,
    }
    return map[status] ?? ''
  }

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      active: t('ads.active'),
      paused: t('ads.paused'),
      completed: t('ads.completed'),
      pending: t('ads.pending'),
      rejected: t('ads.rejected'),
    }
    return map[status] ?? status
  }

  const ctrClass = (value: number): string => {
    if (value >= 3) return styles.cellCtrGood
    if (value >= 1) return styles.cellCtrAvg
    return styles.cellCtrLow
  }

  const skeletonRows = () => (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={styles.skeletonRow}>
          <div className={styles.skeletonText} />
          <div className={styles.skeletonText} />
          <div className={styles.skeletonText} />
          <div className={styles.skeletonText} />
          <div className={styles.skeletonText} />
          <div className={styles.skeletonText} />
          <div className={styles.skeletonText} />
        </div>
      ))}
    </>
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('ads.title')}</h1>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <i className={`bx bx-search ${styles.searchIcon}`} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('ads.searchPlaceholder')}
              value={searchInput}
              onChange={handleSearchChange}
            />
          </div>
          <select className={styles.filterSelect} value={statusFilter} onChange={handleStatusFilterChange}>
            <option value="">{t('ads.allStatuses')}</option>
            <option value="active">{t('ads.active')}</option>
            <option value="paused">{t('ads.paused')}</option>
            <option value="pending">{t('ads.pending')}</option>
            <option value="rejected">{t('ads.rejected')}</option>
            <option value="completed">{t('ads.completed')}</option>
          </select>
        </div>
      </div>

      <div className={styles.card}>
        {loading ? (
          skeletonRows()
        ) : error ? (
          <div className={styles.empty}>
            <i className="bx bx-error-circle" />
            <p>{toErrorMessage(error)}</p>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <i className="bx bx-dollar-circle" />
            <p>{t('ads.noData')}</p>
          </div>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('posts.title')}</th>
                  <th>{t('ads.partner')}</th>
                  <th>{t('ads.status')}</th>
                  <th>{t('ads.budget')}</th>
                  <th>{t('ads.impressions')}</th>
                  <th>{t('ads.clicks')} / {t('ads.ctr')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((ad, idx) => (
                  <tr key={ad.id}>
                    <td className={styles.cellDate}>{(page - 1) * pageSize + idx + 1}</td>
                    <td>
                      <div className={styles.titleCell}>{ad.title || '—'}</div>
                    </td>
                    <td>
                      <div className={styles.cellPartner}>
                        <span className={styles.partnerName}>{ad.partner_name}</span>
                        <span className={styles.partnerDisplayName}>{ad.partner_display_name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${statusBadgeClass(ad.status)}`}>
                        {statusLabel(ad.status)}
                      </span>
                    </td>
                    <td className={styles.cellBudget}>{formatCurrency(ad.budget)}</td>
                    <td className={styles.cellDate}>{formatNumber(ad.impressions)}</td>
                    <td className={`${styles.cellCtr} ${ctrClass(ad.ctr)}`}>
                      {formatNumber(ad.clicks)} / {formatCtr(ad.ctr)}
                    </td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actionMenuWrap}>
                        <button
                          className={styles.actionsBtn}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (openMenuId === ad.id) {
                              closeMenu()
                            } else {
                              const btn = e.currentTarget as HTMLElement
                              const rect = btn.getBoundingClientRect()
                              const menuH = canDelete ? 170 : 120
                              let top = rect.bottom + 4
                              if (top + menuH > window.innerHeight) top = rect.top - 4 - menuH
                              let left = rect.right - 180
                              if (left < 8) left = 8
                              setMenuStyle({ top, left })
                              setOpenMenuId(ad.id)
                            }
                          }}>
                          <i className="bx bx-dots-vertical-rounded" />
                        </button>
                        {openMenuId === ad.id && menuStyle && (
                          <div
                            className={styles.actionMenu}
                            style={{ position: 'fixed', top: menuStyle.top, left: menuStyle.left, zIndex: 1000 }}
                            onClick={(e) => e.stopPropagation()}>
                            <button
                              className={styles.actionMenuItem}
                              onClick={() => {
                                handleOpenAnalytics(ad)
                                closeMenu()
                              }}>
                              <i className="bx bx-line-chart" /> {t('ads.viewAnalytics')}
                            </button>
                            <button
                              className={styles.actionMenuItem}
                              onClick={() => {
                                setStatusTarget(ad)
                                setStatusValue(ad.status)
                                closeMenu()
                              }}>
                              <i className="bx bx-transfer" /> {t('ads.changeStatus')}
                            </button>
                            {canDelete && (
                              <button
                                className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
                                onClick={() => {
                                  setDeleteTarget(ad)
                                  closeMenu()
                                }}>
                                <i className="bx bx-trash" /> {t('ads.deleteAd')}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <i className="bx bx-chevron-left" /> {t('common.prevPage')}
                </button>
                {getPageNumbers().map((p, i) =>
                  typeof p === 'string' ? (
                    <span key={`e${i}`} className={styles.pageInfo}>{p}</span>
                  ) : (
                    <button
                      key={p}
                      className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                      onClick={() => setPage(p)}>
                      {p}
                    </button>
                  )
                )}
                <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  {t('common.nextPage')} <i className="bx bx-chevron-right" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {analyticsTarget && (
        <AdAnalyticsModal
          open
          adId={analyticsTarget.id}
          onClose={() => setAnalyticsTarget(null)}
        />
      )}

      {statusTarget && (
        <div className={styles.overlay} onClick={() => { setStatusTarget(null); setStatusValue(''); setRejectionReason('') }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t('ads.confirmChangeStatus')}</h2>
              <button className={styles.modalClose} onClick={() => { setStatusTarget(null); setStatusValue(''); setRejectionReason('') }}>
                <i className="bx bx-x" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.confirmText}>
                {t('ads.changeStatusTo')}: <strong>{statusTarget.title}</strong>
              </p>
              <div className={styles.radioGroup}>
                {['active', 'paused', 'completed', 'rejected'].map((s) => {
                  const isAllowed = s !== 'active' || canSetActive
                  return (
                    <label
                      key={s}
                      className={`${styles.radioItem} ${statusValue === s ? styles.radioItemActive : ''} ${!isAllowed ? styles.radioLabelDisabled : ''}`}
                      onClick={() => isAllowed && setStatusValue(s)}>
                      <input
                        type="radio"
                        className={styles.radio}
                        name="adStatus"
                        value={s}
                        checked={statusValue === s}
                        onChange={() => isAllowed && setStatusValue(s)}
                        disabled={!isAllowed}
                      />
                      <div>
                        <div className={`${styles.radioLabel} ${!isAllowed ? styles.radioLabelDisabled : ''}`}>
                          {statusLabel(s)}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
              {statusValue === 'rejected' && (
                <div style={{ marginTop: 'var(--space-md)' }}>
                  <label className={styles.confirmText} style={{ fontWeight: 600, display: 'block', marginBottom: 'var(--space-sm)' }}>
                    Lý do từ chối:
                  </label>
                  <textarea
                    className={styles.rejectionInput}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="Nhập lý do từ chối..."
                  />
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => { setStatusTarget(null); setStatusValue(''); setRejectionReason('') }}>
                {t('common.cancel')}
              </button>
              <button
                className={styles.btnPrimary}
                disabled={actionLoading || !statusValue || statusValue === statusTarget.status || (statusValue === 'rejected' && !rejectionReason.trim())}
                onClick={handleConfirmStatusChange}>
                {actionLoading ? t('common.loading') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.overlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t('ads.deleteAd')}</h2>
              <button className={styles.modalClose} onClick={() => setDeleteTarget(null)}>
                <i className="bx bx-x" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.confirmText}>
                {t('ads.confirmDelete')}<br />
                <strong>{deleteTarget.title}</strong><br /><br />
                {t('ads.confirmDeleteMessage')}
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setDeleteTarget(null)}>
                {t('common.cancel')}
              </button>
              <button className={styles.btnDanger} disabled={actionLoading} onClick={handleConfirmDelete}>
                {actionLoading ? t('common.loading') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
