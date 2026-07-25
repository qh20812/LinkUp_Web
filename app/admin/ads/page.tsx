'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { getAds, updateAdStatus, deleteAd, getAdAnalytics } from '../../../api/admin'
import type { AdminAdListItem, AdminAdListResponse, AdPerformance } from '../../../types'
import styles from './Ads.module.css'

function getUserRoleFromToken(): string | null {
  try {
    const token = localStorage.getItem('token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role || null
  } catch {
    return null
  }
}

export default function AdsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [ads, setAds] = useState<AdminAdListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const [searchInput, setSearchInput] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(null)

  const [analyticsTarget, setAnalyticsTarget] = useState<AdminAdListItem | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AdPerformance | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  const [statusTarget, setStatusTarget] = useState<AdminAdListItem | null>(null)
  const [statusValue, setStatusValue] = useState<string>('')

  const [deleteTarget, setDeleteTarget] = useState<AdminAdListItem | null>(null)

  const [actionLoading, setActionLoading] = useState(false)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const [userRole] = useState<string | null>(() => getUserRoleFromToken())
  const canDelete = userRole === null || userRole === 'SUPER_ADMIN'
  const canSetActive = userRole === null || userRole === 'SUPER_ADMIN'

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res: AdminAdListResponse = await getAds(page, pageSize, keyword || undefined, statusFilter || undefined)
        if (!cancelled) {
          setAds(res.ads ?? [])
          setTotal(res.total)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('common.error'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [page, keyword, statusFilter, pageSize, t, refreshKey])

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

  const handleOpenAnalytics = async (ad: AdminAdListItem) => {
    setAnalyticsTarget(ad)
    setAnalyticsData(null)
    setAnalyticsLoading(true)
    try {
      const res = await getAdAnalytics(ad.id)
      setAnalyticsData(res.data)
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const handleConfirmStatusChange = async () => {
    if (!statusTarget || !statusValue) return
    setActionLoading(true)
    try {
      await updateAdStatus(statusTarget.id, statusValue)
      toast({ title: t('ads.statusUpdated'), type: 'success' })
      setStatusTarget(null)
      setStatusValue('')
      setRefreshKey((k) => k + 1)
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
      setRefreshKey((k) => k + 1)
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
    }
    return map[status] ?? ''
  }

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      active: t('ads.active'),
      paused: t('ads.paused'),
      completed: t('ads.completed'),
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
            <p>{error}</p>
          </div>
        ) : ads.length === 0 ? (
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
                {ads.map((ad, idx) => (
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
        <div className={styles.overlay} onClick={() => { setAnalyticsTarget(null); setAnalyticsData(null) }}>
          <div className={`${styles.modal} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t('ads.analyticsTitle')}</h2>
              <button className={styles.modalClose} onClick={() => { setAnalyticsTarget(null); setAnalyticsData(null) }}>
                <i className="bx bx-x" />
              </button>
            </div>
            <div className={styles.modalBody}>
              {analyticsLoading ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>{t('common.loading')}</p>
              ) : analyticsData ? (
                <>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t('posts.title')}</span>
                    <span className={styles.detailValue}>{analyticsData.title}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t('ads.partner')}</span>
                    <span className={styles.detailValue}>{analyticsTarget.partner_name}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>{t('ads.status')}</span>
                    <span className={styles.detailValue}>
                      <span className={`${styles.badge} ${statusBadgeClass(analyticsData.status)}`}>
                        {statusLabel(analyticsData.status)}
                      </span>
                    </span>
                  </div>
                  <div className={styles.detailRow} style={{ borderBottom: '1px solid var(--color-divider)', marginBottom: 'var(--space-lg)' }}>
                    <span className={styles.detailLabel}>{t('ads.budget')}</span>
                    <span className={styles.detailValue}>{formatCurrency(analyticsData.budget)}</span>
                  </div>
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{formatNumber(analyticsData.impressions)}</div>
                      <div className={styles.statLabel}>{t('ads.impressions')}</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={`${styles.statValue} ${styles.statHighlight}`}>{formatNumber(analyticsData.clicks)}</div>
                      <div className={styles.statLabel}>{t('ads.clicks')}</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={`${styles.statValue} ${styles.statHighlight}`}>{formatNumber(analyticsData.interactions)}</div>
                      <div className={styles.statLabel}>{t('ads.interactions')}</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{formatCtr(analyticsData.ctr)}</div>
                      <div className={styles.statLabel}>{t('ads.ctr')}</div>
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>{t('common.error')}</p>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => { setAnalyticsTarget(null); setAnalyticsData(null) }}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusTarget && (
        <div className={styles.overlay} onClick={() => { setStatusTarget(null); setStatusValue('') }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t('ads.confirmChangeStatus')}</h2>
              <button className={styles.modalClose} onClick={() => { setStatusTarget(null); setStatusValue('') }}>
                <i className="bx bx-x" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.confirmText}>
                {t('ads.changeStatusTo')}: <strong>{statusTarget.title}</strong>
              </p>
              <div className={styles.radioGroup}>
                {['active', 'paused', 'completed'].map((s) => {
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
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => { setStatusTarget(null); setStatusValue('') }}>
                {t('common.cancel')}
              </button>
              <button className={styles.btnPrimary} disabled={actionLoading || !statusValue || statusValue === statusTarget.status} onClick={handleConfirmStatusChange}>
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
