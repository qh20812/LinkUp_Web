'use client'

import React, { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { getReports, getReport, reviewReport } from '../../../api/admin'
import { swrFetcher, invalidate } from '../../../api/swr'
import type { AdminReportListItem, AdminReportDetailResponse, AdminReportListResponse } from '../../../types'
import Pagination from '../../../components/Pagination'
import Modal from '../../../components/Modal'
import styles from './Reports.module.css'

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

export default function ReportsPage() {
  const { t, language } = useTranslation()
  const { toast } = useToast()

  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [targetTypeFilter, setTargetTypeFilter] = useState('')
  const [userRole] = useState<string | null>(() => getUserRoleFromToken())
  const canMutate = userRole === null || userRole === 'SUPER_ADMIN'

  const [searchInput, setSearchInput] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (keyword) params.set("keyword", keyword)
  if (statusFilter) params.set("status", statusFilter)
  if (targetTypeFilter) params.set("target_type", targetTypeFilter)
  const swrKey = `/admin/reports?${params}`

  const { data: res, error, isLoading: loading } = useSWR(swrKey, (url: string) => swrFetcher<AdminReportListResponse>(url))

  const reports = res?.reports ?? []
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

  const handleTargetTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetTypeFilter(e.target.value)
    setPage(1)
  }

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuStyle, setMenuStyle] = useState<{top: number; left: number} | null>(null)
  const [detailTarget, setDetailTarget] = useState<AdminReportDetailResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<AdminReportListItem | null>(null)
  const [reviewAction, setReviewAction] = useState<string>('cancel')
  const [reviewReason, setReviewReason] = useState('')
  const [reviewDuration, setReviewDuration] = useState('permanent')
  const [reviewing, setReviewing] = useState(false)

  const closeMenu = () => {
    setOpenMenuId(null)
    setMenuStyle(null)
  }

   const getAvailableActions = (report: AdminReportListItem): string[] => {
     switch (report.target_type) {
       case 'post': return ['cancel', 'hide']
       case 'user': return ['cancel', 'ban']
       case 'comment': return ['cancel', 'hide']
       default: return ['cancel']
     }
   }

  useEffect(() => {
    if (!openMenuId) return
    const handleClick = () => closeMenu()
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [openMenuId])

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return iso
    }
  }

  const statusBadgeClass = (status: string): string => {
    const map: Record<string, string> = {
      pending: styles.badgePending,
      reviewed: styles.badgeReviewed,
      resolved: styles.badgeResolved,
      rejected: styles.badgeRejected,
    }
    return map[status] ?? ''
  }

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      pending: t('reports.pending'),
      reviewed: t('reports.reviewed'),
      resolved: t('reports.resolved'),
      rejected: t('reports.rejected'),
    }
    return map[status] ?? status
  }

  const targetTypeLabel = (type: string): string => {
    const map: Record<string, string> = {
      user: t('reports.user'),
      post: t('reports.post'),
      comment: t('reports.comment'),
    }
    return map[type] ?? type
  }

  const reportTypeLabel = (type: string): string => type

  const targetIdLabel = (report: AdminReportListItem): string => {
    if (report.target_post_id) return report.target_post_id
    if (report.target_user_id) return report.target_user_id
    if (report.target_comment_id) return report.target_comment_id
    return '-'
  }

  const resetReview = () => {
    setReviewTarget(null)
    setReviewAction('cancel')
    setReviewReason('')
    setReviewDuration('permanent')
    setReviewing(false)
  }

  const handleReview = async () => {
    if (!reviewTarget) return
    setReviewing(true)
    try {
      await reviewReport(reviewTarget.id, {
        action: reviewAction,
        reason: reviewAction === 'cancel' ? undefined : reviewReason,
        duration: reviewAction === 'ban' ? reviewDuration : undefined,
      })
      toast({ title: t('reports.reviewSuccess'), type: 'success' })
      resetReview()
      invalidate('/admin/reports')
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setReviewing(false)
    }
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
        </div>
      ))}
    </>
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('reports.title')}</h1>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <i className={`bx bx-search ${styles.searchIcon}`} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('reports.searchPlaceholder')}
              value={searchInput}
              onChange={handleSearchChange}
            />
          </div>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <option value="">{t('reports.allStatuses')}</option>
            <option value="pending">{t('reports.pending')}</option>
            <option value="reviewed">{t('reports.reviewed')}</option>
            <option value="resolved">{t('reports.resolved')}</option>
            <option value="rejected">{t('reports.rejected')}</option>
          </select>
          <select
            className={styles.filterSelect}
            value={targetTypeFilter}
            onChange={handleTargetTypeFilterChange}
          >
            <option value="">{t('reports.allTargetTypes')}</option>
            <option value="user">{t('reports.user')}</option>
            <option value="post">{t('reports.post')}</option>
            <option value="comment">{t('reports.comment')}</option>
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
        ) : reports.length === 0 ? (
          <div className={styles.empty}>
            <i className="bx bx-flag" />
            <p>{t('dashboard.noReports')}</p>
          </div>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('reports.reporter')}</th>
                  <th>{t('reports.targetType')}</th>
                  <th>{t('reports.reportType')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.createdAt')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div className={styles.cellReporter}>
                        <span className={styles.reporterName}>{report.reporter_username}</span>
                        <span className={styles.reporterEmail}>{report.reporter_email}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgeTargetType}`}>
                        {targetTypeLabel(report.target_type)}
                      </span>
                    </td>
                    <td>{reportTypeLabel(report.report_type)}</td>
                    <td>
                      <span className={`${styles.badge} ${statusBadgeClass(report.status)}`}>
                        {statusLabel(report.status)}
                      </span>
                    </td>
                    <td className={styles.cellDate}>{formatDate(report.created_at)}</td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actionMenuWrap}>
                        <button
                          className={styles.actionsBtn}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (openMenuId === report.id) {
                              closeMenu()
                            } else {
                              const btn = e.currentTarget as HTMLElement
                              const rect = btn.getBoundingClientRect()
                              const menuH = 130
                              let top = rect.bottom + 4
                              if (top + menuH > window.innerHeight) top = rect.top - 4 - menuH
                              let left = rect.right - 180
                              if (left < 8) left = 8
                              setMenuStyle({ top, left })
                              setOpenMenuId(report.id)
                            }
                          }}
                        >
                          <i className="bx bx-dots-vertical-rounded" />
                        </button>
                        {openMenuId === report.id && menuStyle && (
                          <div className={styles.actionMenu} style={{ position: 'fixed', top: menuStyle.top, left: menuStyle.left, zIndex: 1000 }} onClick={(e) => e.stopPropagation()}>
                            <button
                              className={styles.actionMenuItem}
                                onClick={async () => {
                                  closeMenu()
                                  setDetailLoading(true)
                                try {
                                  const detail = await getReport(report.id)
                                  setDetailTarget(detail)
                                } catch {
                                  toast({ title: t('common.error'), type: 'error' })
                                } finally {
                                  setDetailLoading(false)
                                }
                              }}
                            >
                              <i className="bx bx-show" /> {t('users.viewDetail')}
                            </button>
                            {canMutate && (
                              <button
                                className={styles.actionMenuItem}
                                onClick={() => { setReviewTarget(report); closeMenu(); setReviewAction('cancel'); setReviewReason(''); setReviewDuration('permanent') }}
                              >
                                <i className="bx bx-check-shield" /> {t('reports.reviewReport')}
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
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            )}
          </>
        )}
      </div>

      <Modal
        open={!!detailTarget}
        onClose={() => { setDetailTarget(null); invalidate('/admin/reports') }}
        title={t('reports.detailTitle')}
        footer={
          <button className={styles.btnCancel} onClick={() => { setDetailTarget(null); invalidate('/admin/reports') }}>
            {t('common.close')}
          </button>
        }
      >
        {detailLoading && <p style={{ textAlign: 'center', padding: '24px 0' }}>{t('common.loading')}</p>}
        {detailTarget && !detailLoading && (
          <>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('reports.reporter')}</span>
              <span className={styles.detailValue}>
                {detailTarget.reporter_username} ({detailTarget.reporter_email})
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('reports.targetType')}</span>
              <span className={styles.detailValue}>
                <span className={`${styles.badge} ${styles.badgeTargetType}`}>
                  {targetTypeLabel(detailTarget.target_type)}
                </span>{' '}
                {targetIdLabel(detailTarget)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('reports.reportType')}</span>
              <span className={styles.detailValue}>{detailTarget.report_type}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('reports.reasonDetail')}</span>
              <span className={styles.detailValue}>{detailTarget.reason_detail || '-'}</span>
            </div>
            {detailTarget.violation_rule_id && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t('reports.violationRule')}</span>
                <span className={styles.detailValue}>{detailTarget.violation_rule_id}</span>
              </div>
            )}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('common.status')}</span>
              <span className={styles.detailValue}>
                <span className={`${styles.badge} ${statusBadgeClass(detailTarget.status)}`}>
                  {statusLabel(detailTarget.status)}
                </span>
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('common.createdAt')}</span>
              <span className={styles.detailValue}>{formatDate(detailTarget.created_at)}</span>
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={!!reviewTarget}
        onClose={resetReview}
        title={t('reports.reviewReport')}
        footer={
          <>
            <button className={styles.btnCancel} onClick={resetReview}>
              {t('common.cancel')}
            </button>
            <button
              className={reviewAction === 'ban' ? styles.btnDanger : styles.btnPrimary}
              disabled={(reviewAction !== 'cancel' && !reviewReason.trim()) || reviewing}
              onClick={handleReview}
            >
              {reviewing ? t('common.loading') : t('reports.reviewReport')}
            </button>
          </>
        }
      >
        {reviewTarget && (
          <>
            <div className={styles.fieldGroup}>
              <span className={styles.detailLabel}>{t('reports.reporter')}</span>
              <p style={{ fontSize: 14, marginTop: 4 }}>
                {reviewTarget.reporter_username} ({reviewTarget.reporter_email})
              </p>
            </div>

            <div className={styles.radioGroup}>
              {getAvailableActions(reviewTarget).map((action) => (
                <label
                  key={action}
                  className={`${styles.radioItem}${reviewAction === action ? ` ${styles.radioItemActive}` : ''}`}
                >
                  <input
                    type="radio"
                    className={styles.radio}
                    name="reviewAction"
                    checked={reviewAction === action}
                    onChange={() => { setReviewAction(action); setReviewReason('') }}
                  />
                  <span className={styles.radioLabel}>
                    {t(`reports.action${action.charAt(0).toUpperCase()}${action.slice(1)}`)}
                  </span>
                  <span className={styles.radioDesc}>
                    {action === 'cancel' ? t('reports.rejected') : action === 'hide' ? (reviewTarget.target_type === 'comment' ? t('posts.hideComment') : t('posts.hidePost')) : t('users.banUser')}
                  </span>
                </label>
              ))}
            </div>

            {reviewAction !== 'cancel' && (
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>{t('reports.reviewReason')}</label>
                <input
                  type="text"
                  className={styles.fieldInput}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder={t('reports.reviewReason')}
                />
              </div>
            )}

            {reviewAction === 'ban' && (
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>{t('reports.banDuration')}</label>
                <select
                  className={styles.fieldSelect}
                  value={reviewDuration}
                  onChange={(e) => setReviewDuration(e.target.value)}
                >
                  <option value="permanent">{t('users.permanent')}</option>
                  <option value="1d">1 {language === 'vi' ? 'ngày' : 'day'}</option>
                  <option value="7d">7 {language === 'vi' ? 'ngày' : 'days'}</option>
                  <option value="30d">30 {language === 'vi' ? 'ngày' : 'days'}</option>
                  <option value="1y">1 {language === 'vi' ? 'năm' : 'year'}</option>
                </select>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
