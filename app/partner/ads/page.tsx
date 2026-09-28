'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { deleteAd, updateAdStatus } from '../../../api/partner'
import { swrFetcher, invalidate } from '../../../api/swr'
import Pagination from '../../../components/Pagination'
import AdAnalyticsModal from '../../../components/AdAnalyticsModal'
import type { PartnerAdListItem, PartnerAdListResponse } from '../../../types'
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
  const { data: res, isLoading: loading } = useSWR(swrKey, (url: string) => swrFetcher<PartnerAdListResponse>(url))
  const items = res?.ads ?? []
  const total = res?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

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
    }
    return map[s] ?? s
  }

  const canEdit = (s: string) => s === 'active' || s === 'paused'
  const canTogglePause = (s: string) => s === 'active' || s === 'paused'

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
            <option value="completed">{t('partner.ads.completed')}</option>
          </select>
          <Link href="/partner/ads/new" className={styles.btnPrimary}>
            <i className="bx bx-plus" />
            {t('partner.ads.create')}
          </Link>
        </div>
      </div>

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
          <div className={styles.empty}>
            <i className="bx bx-dollar" />
            <p>{t('partner.ads.noAds')}</p>
            <Link href="/partner/ads/new" className={styles.btnPrimary}>
              {t('partner.ads.create')}
            </Link>
          </div>
        ) : items.map((ad) => (
          <div key={ad.id} className={styles.tableRow}>
            <span className={styles.colTitle}>
              <span className={styles.adTitle}>{ad.title}</span>
              {ad.rejection_reason && (
                <span className={styles.rejectionHint} title={ad.rejection_reason}>
                  <i className="bx bx-error-circle" />
                </span>
              )}
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
