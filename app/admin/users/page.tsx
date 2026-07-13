'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { getUsers, updateUserStatus, banUser } from '../../../api/admin'
import type { AdminUserListItem } from '../../../types'
import styles from './Users.module.css'

export default function UsersPage() {
  const { t, language } = useTranslation()
  const { toast } = useToast()

  const [users, setUsers] = useState<AdminUserListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchInput, setSearchInput] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuStyle, setMenuStyle] = useState<{top: number; left: number} | null>(null)
  const [banTarget, setBanTarget] = useState<AdminUserListItem | null>(null)
  const [detailTarget, setDetailTarget] = useState<AdminUserListItem | null>(null)
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState('permanent')
  const [banning, setBanning] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getUsers(page, pageSize, keyword || undefined, statusFilter || undefined)
        if (!cancelled) {
          setUsers(res.users ?? [])
          setTotal(res.total)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('common.error'))
        }
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

  useEffect(() => {
    if (!openMenuId) { setMenuStyle(null); return }
    const handleClick = () => setOpenMenuId(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [openMenuId])

  const handleStatusChange = async (userId: string, newStatus: string) => {
    setUpdatingStatus(userId)
    try {
      await updateUserStatus(userId, newStatus)
      toast({ title: t('users.statusUpdated'), type: 'success' })
      setRefreshKey(k => k + 1)
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleBan = async () => {
    if (!banTarget) return
    setBanning(true)
    try {
      await banUser(banTarget.id, { reason: banReason, duration: banDuration })
      toast({ title: t('users.banSuccess'), type: 'success' })
      setBanTarget(null)
      setBanReason('')
      setBanDuration('permanent')
      setRefreshKey(k => k + 1)
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setBanning(false)
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

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return iso
    }
  }

  const statusBadgeClass = (status: string): string => {
    const map: Record<string, string> = {
      active: styles.badgeActive,
      banned: styles.badgeBanned,
      suspended: styles.badgeSuspended,
    }
    return map[status] ?? ''
  }

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      active: t('users.active'),
      banned: t('users.banned'),
      suspended: t('users.suspended'),
    }
    return map[status] ?? status
  }

  const statusActionLabel = (status: string): string => {
    switch (status) {
      case 'active': return t('users.suspendUser')
      case 'suspended': return t('users.activateUser')
      case 'banned': return t('users.unbanUser')
      default: return t('users.updateStatus')
    }
  }

  const nextUserStatus = (status: string): string => {
    switch (status) {
      case 'active': return 'suspended'
      case 'suspended': return 'active'
      case 'banned': return 'active'
      default: return 'active'
    }
  }

  const durationLabel = (value: string): string => {
    const labels: Record<string, string> = {
      permanent: t('users.permanent'),
      '1d': `1 ${language === 'vi' ? 'ngày' : 'day'}`,
      '7d': `7 ${language === 'vi' ? 'ngày' : 'days'}`,
      '30d': `30 ${language === 'vi' ? 'ngày' : 'days'}`,
      '1y': `1 ${language === 'vi' ? 'năm' : 'year'}`,
    }
    return labels[value] ?? value
  }

  const skeletonRows = () => (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={styles.skeletonRow}>
          <div className={styles.skeletonAvatar} />
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
        <h1 className={styles.title}>{t('users.title')}</h1>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <i className={`bx bx-search ${styles.searchIcon}`} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('users.searchPlaceholder')}
              value={searchInput}
              onChange={handleSearchChange}
            />
          </div>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <option value="">{t('users.allStatuses')}</option>
            <option value="active">{t('users.active')}</option>
            <option value="banned">{t('users.banned')}</option>
            <option value="suspended">{t('users.suspended')}</option>
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
        ) : users.length === 0 ? (
          <div className={styles.empty}>
            <i className="bx bx-user-x" />
            <p>{t('dashboard.noUsers')}</p>
          </div>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('users.username')}</th>
                  <th>{t('users.email')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.createdAt')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.cellUser}>
                        <img
                          src={user.avatar_uri || '/default-avatar.png'}
                          alt=""
                          className={styles.avatar}
                        />
                        <div>
                          <div className={styles.userName}>{user.display_name || user.username}</div>
                          <div className={styles.userEmail}>@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.cellDate}>{user.email}</td>
                    <td>
                      <span className={`${styles.badge} ${statusBadgeClass(user.status)}`}>
                        {statusLabel(user.status)}
                      </span>
                    </td>
                    <td className={styles.cellDate}>{formatDate(user.created_at)}</td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actionMenuWrap}>
                        <button
                          className={styles.actionsBtn}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (openMenuId === user.id) {
                              setOpenMenuId(null)
                            } else {
                              const btn = e.currentTarget as HTMLElement
                              const rect = btn.getBoundingClientRect()
                              const menuH = 130
                              let top = rect.bottom + 4
                              if (top + menuH > window.innerHeight) top = rect.top - 4 - menuH
                              let left = rect.right - 180
                              if (left < 8) left = 8
                              setMenuStyle({ top, left })
                              setOpenMenuId(user.id)
                            }
                          }}
                        >
                          <i className="bx bx-dots-vertical-rounded" />
                        </button>
                        {openMenuId === user.id && menuStyle && (
                          <div className={styles.actionMenu} style={{ position: 'fixed', top: menuStyle.top, left: menuStyle.left, zIndex: 1000 }} onClick={(e) => e.stopPropagation()}>
                            <button
                              className={styles.actionMenuItem}
                              onClick={() => { setDetailTarget(user); setOpenMenuId(null) }}
                            >
                              <i className="bx bx-show" /> {t('users.viewDetail')}
                            </button>
                            <button
                              className={styles.actionMenuItem}
                              disabled={updatingStatus === user.id}
                              onClick={() => {
                                handleStatusChange(user.id, nextUserStatus(user.status))
                                setOpenMenuId(null)
                              }}
                            >
                              <i className="bx bx-shield" /> {updatingStatus === user.id ? t('common.loading') : statusActionLabel(user.status)}
                            </button>
                            {user.status !== 'banned' && (
                              <button
                                className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
                                onClick={() => { setBanTarget(user); setOpenMenuId(null) }}
                              >
                                <i className="bx bx-block" /> {t('users.banUser')}
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
                <button
                  className={styles.pageBtn}
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <i className="bx bx-chevron-left" /> {t('users.prevPage')}
                </button>
                {getPageNumbers().map((p, i) =>
                  typeof p === 'string' ? (
                    <span key={`e${i}`} className={styles.pageInfo}>{p}</span>
                  ) : (
                    <button
                      key={p}
                      className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  className={styles.pageBtn}
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  {t('users.nextPage')} <i className="bx bx-chevron-right" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {detailTarget && (
        <div className={styles.overlay} onClick={() => setDetailTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t('users.detailTitle')}</h2>
              <button className={styles.modalClose} onClick={() => setDetailTarget(null)}>
                <i className="bx bx-x" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                <img
                  src={detailTarget.avatar_uri || '/default-avatar.png'}
                  alt=""
                  className={styles.detailAvatar}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{detailTarget.display_name || detailTarget.username}</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>@{detailTarget.username}</div>
                </div>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>ID</span>
                <span className={styles.detailValue}>{detailTarget.id}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t('users.email')}</span>
                <span className={styles.detailValue}>{detailTarget.email}</span>
              </div>
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
              {detailTarget.updated_at && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Cập nhật</span>
                  <span className={styles.detailValue}>{formatDate(detailTarget.updated_at)}</span>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setDetailTarget(null)}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {banTarget && (
        <div className={styles.overlay} onClick={() => { setBanTarget(null); setBanReason(''); setBanDuration('permanent') }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t('users.banUser')}</h2>
              <button className={styles.modalClose} onClick={() => { setBanTarget(null); setBanReason(''); setBanDuration('permanent') }}>
                <i className="bx bx-x" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--color-text-secondary)', fontSize: 14 }}>
                {t('users.banUser')}: <strong style={{ color: 'var(--color-text)' }}>{banTarget.display_name || banTarget.username}</strong>
              </p>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>{t('users.banReason')}</label>
                <input
                  type="text"
                  className={styles.fieldInput}
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder={t('users.banReason')}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>{t('users.banDuration')}</label>
                <select
                  className={styles.fieldSelect}
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                >
                  <option value="permanent">{durationLabel('permanent')}</option>
                  <option value="1d">{durationLabel('1d')}</option>
                  <option value="7d">{durationLabel('7d')}</option>
                  <option value="30d">{durationLabel('30d')}</option>
                  <option value="1y">{durationLabel('1y')}</option>
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                onClick={() => { setBanTarget(null); setBanReason(''); setBanDuration('permanent') }}
              >
                {t('common.cancel')}
              </button>
              <button
                className={styles.btnDanger}
                disabled={banning || !banReason.trim()}
                onClick={handleBan}
              >
                {banning ? t('common.loading') : t('users.confirmBan')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
