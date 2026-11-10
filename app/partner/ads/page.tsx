'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { deleteAd, submitAdForReview, updateAdStatus } from '../../../api/partner'
import { getMySubscription } from '../../../api/package'
import { ApiError } from '../../../api/api'
import { getAdTip } from '../../../lib/ad-tips'
import { swrFetcher, invalidate } from '../../../api/swr'
import Pagination from '../../../components/Pagination'
import AdAnalyticsModal from '../../../components/AdAnalyticsModal'
import type { PartnerAdListItem, PartnerAdListResponse, SubscriptionResponse } from '../../../types'
import styles from './Ads.module.css'

export default function PartnerAdsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(null)

  const [analyticsTarget, setAnalyticsTarget] = useState<PartnerAdListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PartnerAdListItem | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (keyword) params.set('keyword', keyword)
  if (statusFilter) params.set('status', statusFilter)
  const swrKey = `/ads-management?${params}`
  const {
    data: res,
    isLoading: loading,
    error: listError,
    mutate: mutateList,
  } = useSWR(swrKey, (url: string) => swrFetcher<PartnerAdListResponse>(url))
  const items = res?.data ?? []
  const total = res?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // Admin mở nhầm /partner/ads: server trả 400 kèm hướng dẫn dùng /admin/ads.
  // Hiện thông báo riêng thay vì để lỗi thành danh sách trống.
  const isAdminEndpoint =
    listError instanceof ApiError &&
    listError.status === 400 &&
    /partner/i.test(listError.message)

  // Empty state cần biết partner đã có gói chưa để gợi ý mua gói thay vì tạo ad
  // (tạo ad khi chưa có gói sẽ bị server chặn).
  const { error: subscriptionError } = useSWR<SubscriptionResponse>(
    '/ads-management/subscription',
    () => getMySubscription(),
    { shouldRetryOnError: false },
  )
  const needsPlan =
    subscriptionError instanceof ApiError &&
    (subscriptionError.code === 'package.NOT_SUBSCRIBED' || subscriptionError.status === 404)

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

  const handleMenuToggle = (adId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (openMenuId === adId) { closeMenu(); return }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuStyle({ top: rect.bottom + 4, left: rect.right - 180 })
    setOpenMenuId(adId)
  }

  const handleTogglePause = async (ad: PartnerAdListItem) => {
    closeMenu()
    const newStatus = ad.status === 'active' ? 'paused' : 'active'
    setActionLoading(true)
    try {
      await updateAdStatus(ad.id, newStatus)
      toast({ title: t('partner.form.updateSuccess'), type: 'success' })
      invalidate('/ads-management')
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
      toast({ title: t('partner.form.deleteSuccess'), type: 'success' })
      setDeleteTarget(null)
      invalidate('/ads-management')
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  const formatCurrency = (v: number) => {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
    if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
    return v.toLocaleString()
  }

  const statusBadgeClass = (s: string) => {
    const map: Record<string, string> = {
      active: styles.badgeActive,
      paused: styles.badgePaused,
      completed: styles.badgeCompleted,
      pending: styles.badgePending,
      rejected: styles.badgeRejected,
      suspended: styles.badgeSuspended,
    }
    return map[s] ?? ''
  }

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      active: t('partner.ads.active'),
      paused: t('partner.ads.paused'),
      completed: t('partner.ads.completed'),
      pending: t('partner.ads.pending'),
      rejected: t('partner.ads.rejected'),
      suspended: t('partner.ads.suspended'),
    }
    return map[s] ?? s
  }

  // Sửa được cả khi chờ duyệt / bị từ chối (để gửi duyệt lại), nhưng không sửa
  // quảng cáo đã kết thúc hoặc bị admin hạ.
  const canEdit = (s: string) =>
    s === 'active' || s === 'paused' || s === 'pending' || s === 'rejected'
  const canTogglePause = (s: string) => s === 'active' || s === 'paused'

  const handleSubmitForReview = async (ad: PartnerAdListItem) => {
    closeMenu()
    setActionLoading(true)
    try {
      await submitAdForReview(ad.id)
      toast({ title: t('partner.ads.submitSuccess'), type: 'success' })
      invalidate('/ads-management')
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  const skeletonRows = () => (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={styles.skeletonRow}>
          {Array.from({ length: 7 }).map((_, j) => (
            <div key={j} className={styles.skeletonText} />
          ))}
        </div>
      ))}
    </>
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('partner.ads.title')}</h1>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <i className={`bx bx-search ${styles.searchIcon}`} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('partner.ads.searchPlaceholder')}
              value={searchInput}
              onChange={handleSearchChange}
            />
          </div>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <option value="">{t('partner.ads.allStatus')}</option>
            <option value="active">{t('partner.ads.active')}</option>
            <option value="paused">{t('partner.ads.paused')}</option>
            <option value="pending">{t('partner.ads.pending')}</option>
            <option value="rejected">{t('partner.ads.rejected')}</option>
            <option value="suspended">{t('partner.ads.suspended')}</option>
            <option value="completed">{t('partner.ads.completed')}</option>
          </select>
          <Link href="/partner/ads/new" className={styles.btnPrimary}>
            <i className="bx bx-plus" />
            {t('partner.ads.create')}
          </Link>
        </div>
      </div>

      {listError ? (
        <div className={styles.errorState} role="alert">
          <i className="bx bx-error-circle" aria-hidden="true" />
          <h2 className={styles.errorTitle}>
            {isAdminEndpoint
              ? t('partner.ads.adminEndpointTitle')
              : t('partner.ads.listErrorTitle')}
          </h2>
          <p className={styles.errorDesc}>
            {isAdminEndpoint
              ? t('partner.ads.adminEndpointDesc')
              : t('partner.ads.listErrorDesc')}
          </p>
          {!isAdminEndpoint && listError instanceof Error && (
            <p className={styles.errorDetail}>{listError.message}</p>
          )}
          <div className={styles.errorActions}>
            {isAdminEndpoint ? (
              <Link href="/admin/ads" className={styles.btnPrimary}>
                {t('partner.ads.openAdminAds')}
              </Link>
            ) : (
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => { void mutateList() }}
              >
                {t('common.retry')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <span className={styles.colTitle}>{t('partner.form.title')}</span>
          <span className={styles.colStatus}>{t('partner.ads.status')}</span>
          <span className={styles.colBudget}>{t('partner.ads.budget')}</span>
          <span className={styles.colImpressions}>{t('partner.ads.impressions')}</span>
          <span className={styles.colClicks}>{t('partner.ads.clicks')}</span>
          <span className={styles.colCtr}>{t('partner.ads.ctr')}</span>
          <span className={styles.colActions}></span>
        </div>

        {loading ? skeletonRows() : items.length === 0 ? (
          keyword || statusFilter ? (
            <div className={styles.empty}>
              <i className="bx bx-dollar" />
              <p>{t('partner.ads.noAds')}</p>
              <Link href="/partner/ads/new" className={styles.btnPrimary}>
                {t('partner.ads.create')}
              </Link>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <i className="bx bx-rocket" />
              <h2 className={styles.emptyTitle}>{t('partner.ads.emptyTitle')}</h2>
              <p className={styles.emptyDesc}>{t('partner.ads.emptyDesc')}</p>
              <ol className={styles.emptySteps}>
                {[1, 2, 3].map((n) => (
                  <li key={n}>
                    <span className={styles.emptyStepNum}>{n}</span>
                    <div>
                      <strong>{t(`partner.ads.emptyStep${n}Title`)}</strong>
                      <p>{t(`partner.ads.emptyStep${n}Desc`)}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className={styles.emptyActions}>
                <Link href="/partner/ads/new" className={styles.btnPrimary}>
                  <i className="bx bx-plus" /> {t('partner.ads.create')}
                </Link>
                {needsPlan && (
                  <Link href="/packages" className={styles.btnSecondary}>
                    {t('partner.ads.emptyBuyPlan')}
                  </Link>
                )}
                <Link href="/partner/help/ads" className={styles.emptyHelp}>
                  {t('partner.ads.emptyHelp')}
                </Link>
              </div>
            </div>
          )
        ) : items.map((ad) => (
          <div key={ad.id} className={styles.tableRow}>
            <span className={styles.colTitle}>
              <span className={styles.adTitle}>{ad.title}</span>
              {(ad.rejection_reason || ad.suspended_reason) && (
                <span
                  className={styles.rejectionHint}
                  title={ad.rejection_reason || ad.suspended_reason || ''}
                >
                  <i className="bx bx-error-circle" />
                </span>
              )}
              {(() => {
                const tip = getAdTip(ad)
                if (!tip) return null
                const tipKey =
                  tip === 'pending'
                    ? 'tipPending'
                    : tip === 'rejected'
                      ? 'tipRejected'
                      : tip === 'paused'
                        ? 'tipPaused'
                        : tip === 'budgetLow'
                          ? 'tipBudgetLow'
                          : 'tipCompleted'
                const icon =
                  tip === 'pending'
                    ? 'bx-time-five'
                    : tip === 'rejected'
                      ? 'bx-error-circle'
                      : tip === 'paused'
                        ? 'bx-pause-circle'
                        : tip === 'budgetLow'
                          ? 'bx-error'
                          : 'bx-check-circle'
                return (
                  <span className={`${styles.rowTip} ${tip === 'budgetLow' ? styles.rowTipWarn : ''}`}>
                    <i className={`bx ${icon}`} aria-hidden="true" />
                    <span>{t(`partner.ads.${tipKey}`)}</span>
                    {tip === 'rejected' && (
                      <button
                        type="button"
                        className={styles.tipAction}
                        onClick={() => router.push(`/partner/ads/${ad.id}/edit`)}
                      >
                        {t('partner.ads.tipFix')}
                      </button>
                    )}
                    {tip === 'completed' && (
                      <Link href="/partner/ads/new" className={styles.tipAction}>
                        {t('partner.ads.tipCreate')}
                      </Link>
                    )}
                  </span>
                )
              })()}
            </span>
            <span className={styles.colStatus}>
              <span className={`${styles.badge} ${statusBadgeClass(ad.status)}`}>
                {statusLabel(ad.status)}
              </span>
            </span>
            <span className={styles.colBudget}>{formatCurrency(ad.budget)}</span>
            <span className={styles.colImpressions}>{ad.impressions.toLocaleString()}</span>
            <span className={styles.colClicks}>{ad.clicks.toLocaleString()}</span>
            <span className={styles.colCtr}>{ad.ctr.toFixed(1)}%</span>
            <span className={styles.colActions}>
              <button
                className={styles.menuBtn}
                onClick={(e) => handleMenuToggle(ad.id, e)}
                disabled={actionLoading}
              >
                <i className="bx bx-dots-vertical-rounded" />
              </button>
            </span>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className={styles.paginationWrap}>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
        </>
      )}

      {openMenuId && menuStyle && (
        <>
          <div className={styles.menuOverlay} onClick={closeMenu} />
          <div className={styles.contextMenu} style={menuStyle}>
            {(() => {
              const ad = items.find((a) => a.id === openMenuId)
              if (!ad) return null
              return (
                <>
                  <button className={styles.menuItem} onClick={() => { closeMenu(); setAnalyticsTarget(ad) }}>
                    <i className="bx bx-bar-chart" /> {t('partner.nav.analytics')}
                  </button>
                  {canEdit(ad.status) && (
                    <button className={styles.menuItem} onClick={() => { closeMenu(); router.push(`/partner/ads/${ad.id}/edit`) }}>
                      <i className="bx bx-edit" /> {t('partner.ads.edit')}
                    </button>
                  )}
                  {canTogglePause(ad.status) && (
                    <button className={styles.menuItem} onClick={() => handleTogglePause(ad)}>
                      <i className={`bx bx-${ad.status === 'active' ? 'pause' : 'play'}`} />
                      {ad.status === 'active' ? t('partner.ads.paused') : t('partner.ads.active')}
                    </button>
                  )}
                  {ad.status === 'rejected' && (
                    <button className={styles.menuItem} onClick={() => handleSubmitForReview(ad)}>
                      <i className="bx bx-upload" /> {t('partner.ads.submitForReview')}
                    </button>
                  )}
                  <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => { closeMenu(); setDeleteTarget(ad) }}>
                    <i className="bx bx-trash" /> {t('partner.ads.delete')}
                  </button>
                </>
              )
            })()}
          </div>
        </>
      )}

      {analyticsTarget && (
        <AdAnalyticsModal
          open
          adId={analyticsTarget.id}
          onClose={() => setAnalyticsTarget(null)}
        />
      )}

      {deleteTarget && (
        <div className={styles.overlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t('partner.ads.delete')}</h2>
              <button className={styles.modalClose} onClick={() => setDeleteTarget(null)}>
                <i className="bx bx-x" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>{t('partner.ads.deleteConfirm')}</p>
              <p><strong>{deleteTarget.title}</strong></p>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setDeleteTarget(null)}>
                {t('partner.form.cancel')}
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
