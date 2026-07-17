'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import { getCommunities, getCommunity, getCommunityLogs, hideCommunity, unhideCommunity, archiveCommunity, warnCommunity, deleteCommunity } from '../../../api/admin'
import type { AdminCommunityListItem, AdminCommunityDetailResponse, AdminModerationLogItem } from '../../../types'
import styles from './Communities.module.css'

export default function CommunitiesPage() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [communities, setCommunities] = useState<AdminCommunityListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [privacyFilter, setPrivacyFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchInput, setSearchInput] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuStyle, setMenuStyle] = useState<{top: number; left: number} | null>(null)
  const [actionTarget, setActionTarget] = useState<{ id: string; name: string; type: 'hide' | 'archive' | 'warn' | 'delete' } | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [warnMessage, setWarnMessage] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [detailTarget, setDetailTarget] = useState<AdminCommunityListItem | null>(null)
  const [detailData, setDetailData] = useState<AdminCommunityDetailResponse | null>(null)
  const [detailTab, setDetailTab] = useState<'info' | 'members' | 'logs'>('info')
  const [logs, setLogs] = useState<AdminModerationLogItem[]>([])
  const [logsPage, setLogsPage] = useState(1)
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsLoading, setLogsLoading] = useState(false)

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

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getCommunities(page, pageSize, keyword || undefined, statusFilter || undefined, privacyFilter || undefined)
        if (!cancelled) {
          setCommunities(res.communities ?? [])
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
  }, [page, keyword, statusFilter, privacyFilter, pageSize, t, refreshKey])

  useEffect(() => {
    if (!detailTarget) return
    let cancelled = false
    const fetchDetail = async () => {
      setDetailData(null)
      setLogs([])
      setLogsPage(1)
      setLogsTotal(0)
      try {
        const res = await getCommunity(detailTarget.id)
        if (!cancelled) {
          setDetailData(res)
          setDetailTab('info')
        }
      } catch {
        if (!cancelled) toast({ title: t('common.error'), type: 'error' })
      }
    }
    fetchDetail()
    return () => { cancelled = true }
  }, [detailTarget?.id, t, toast])

  useEffect(() => {
    if (!detailTarget || detailTab !== 'logs') return
    let cancelled = false
    const fetchLogs = async () => {
      setLogsLoading(true)
      try {
        const res = await getCommunityLogs(detailTarget.id, logsPage, 20)
        if (!cancelled) {
          setLogs(res.logs ?? [])
          setLogsTotal(res.total)
        }
      } catch {
        if (!cancelled) toast({ title: t('common.error'), type: 'error' })
      } finally {
        if (!cancelled) setLogsLoading(false)
      }
    }
    fetchLogs()
    return () => { cancelled = true }
  }, [detailTarget?.id, detailTab, logsPage, t, toast])

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

  const handlePrivacyFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPrivacyFilter(e.target.value)
    setPage(1)
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
      hidden: styles.badgeHidden,
      archived: styles.badgeArchived,
    }
    return map[status] ?? ''
  }

  const privacyBadgeClass = (privacy: string): string => {
    const map: Record<string, string> = {
      public: styles.badgePublic,
      code: styles.badgeCode,
      invitation_only: styles.badgeInvitationOnly,
    }
    return map[privacy] ?? ''
  }

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      active: t('communities.active'),
      hidden: t('communities.hidden'),
      archived: t('communities.archived'),
    }
    return map[status] ?? status
  }

  const privacyLabel = (privacy: string): string => {
    const map: Record<string, string> = {
      public: t('communities.public'),
      code: t('communities.code'),
      invitation_only: t('communities.invitationOnly'),
    }
    return map[privacy] ?? privacy
  }

  const actionLabel = (action: string): string => {
    const map: Record<string, string> = {
      hide: t('communities.hideCommunity'),
      unhide: t('communities.unhideCommunity'),
      archive: t('communities.archiveCommunity'),
      warn: t('communities.warnCommunity'),
      delete: t('communities.deleteCommunity'),
    }
    return map[action] ?? action
  }

  const actionBadgeClass = (action: string): string => {
    const map: Record<string, string> = {
      hide: styles.badgeHidden,
      unhide: styles.badgeActive,
      archive: styles.badgeArchived,
      warn: styles.badgeWarning,
      delete: styles.badgeDanger,
    }
    return map[action] ?? ''
  }

  const roleLabel = (role: string): string => {
    const map: Record<string, string> = {
      COMMUNITY_ADMIN: t('communities.roleAdmin'),
      GROUP_ADMIN: t('communities.roleAdmin'),
      GROUP_MOD: t('communities.roleMod'),
      GROUP_MEMBER: t('communities.roleMember'),
      COMMUNITY_MEMBER: t('communities.roleMember'),
    }
    return map[role] ?? role
  }

  const handleUnhide = async (id: string) => {
    try {
      await unhideCommunity(id)
      toast({ title: t('common.save'), type: 'success' })
      setRefreshKey(k => k + 1)
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    }
  }

  const handleModerateAction = async () => {
    if (!actionTarget) return
    setActionLoading(true)
    try {
      switch (actionTarget.type) {
        case 'hide':
          await hideCommunity(actionTarget.id, { reason: actionReason })
          break
        case 'archive':
          await archiveCommunity(actionTarget.id, { reason: actionReason })
          break
        case 'warn':
          await warnCommunity(actionTarget.id, { reason: actionReason, message: warnMessage })
          break
        case 'delete':
          await deleteCommunity(actionTarget.id, { reason: actionReason })
          break
      }
      toast({ title: t('common.save'), type: 'success' })
      setActionTarget(null)
      setActionReason('')
      setWarnMessage('')
      setRefreshKey(k => k + 1)
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  const openActionModal = (id: string, name: string, type: 'hide' | 'archive' | 'warn' | 'delete') => {
    setActionTarget({ id, name, type })
    setActionReason('')
    setWarnMessage('')
    closeMenu()
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

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
          <div className={styles.skeletonText} />
        </div>
      ))}
    </>
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('communities.title')}</h1>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <i className={`bx bx-search ${styles.searchIcon}`} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('communities.searchPlaceholder')}
              value={searchInput}
              onChange={handleSearchChange}
            />
          </div>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <option value="">{t('communities.allStatuses')}</option>
            <option value="active">{t('communities.active')}</option>
            <option value="hidden">{t('communities.hidden')}</option>
            <option value="archived">{t('communities.archived')}</option>
          </select>
          <select
            className={styles.filterSelect}
            value={privacyFilter}
            onChange={handlePrivacyFilterChange}
          >
            <option value="">{t('communities.allPrivacy')}</option>
            <option value="public">{t('communities.public')}</option>
            <option value="code">{t('communities.code')}</option>
            <option value="invitation_only">{t('communities.invitationOnly')}</option>
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
        ) : communities.length === 0 ? (
          <div className={styles.empty}>
            <i className="bx bx-world" />
            <p>{t('common.noData')}</p>
          </div>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('communities.name')}</th>
                  <th>{t('communities.creator')}</th>
                  <th>{t('communities.members')}</th>
                  <th>{t('communities.privacy')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.createdAt')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {communities.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className={styles.communityCell}>
                        <div className={styles.avatar}>
                          {c.avatar_uri ? (
                            <img src={c.avatar_uri} alt={c.name} className={styles.avatarImg} />
                          ) : (
                            <i className="bx bx-group" />
                          )}
                        </div>
                        <div>
                          <div className={styles.communityName}>{c.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.creatorCell}>
                        <span className={styles.creatorName}>{c.creator_name || '—'}</span>
                        <span className={styles.creatorId}>ID: {c.creator_id?.substring(0, 8)}...</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.memberCountCell}>{c.member_count}</div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${privacyBadgeClass(c.privacy)}`}>
                        {privacyLabel(c.privacy)}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${statusBadgeClass(c.status)}`}>
                        {statusLabel(c.status)}
                      </span>
                    </td>
                    <td className={styles.cellDate}>{formatDate(c.created_at)}</td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actionMenuWrap}>
                        <button
                          className={styles.actionsBtn}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (openMenuId === c.id) {
                              closeMenu()
                            } else {
                              const btn = e.currentTarget as HTMLElement
                              const rect = btn.getBoundingClientRect()
                              const menuH = 180
                              let top = rect.bottom + 4
                              if (top + menuH > window.innerHeight) top = rect.top - 4 - menuH
                              let left = rect.right - 180
                              if (left < 8) left = 8
                              setMenuStyle({ top, left })
                              setOpenMenuId(c.id)
                            }
                          }}
                        >
                          <i className="bx bx-dots-vertical-rounded" />
                        </button>
                        {openMenuId === c.id && menuStyle && (
                          <div className={styles.actionMenu} style={{ position: 'fixed', top: menuStyle.top, left: menuStyle.left, zIndex: 1000 }} onClick={(e) => e.stopPropagation()}>
                            <button className={styles.actionMenuItem} onClick={() => { setDetailTarget(c); closeMenu(); }}>
                              <i className="bx bx-show" /> {t('communities.viewDetail')}
                            </button>
                            <button className={styles.actionMenuItem} onClick={() => {
                              closeMenu()
                              if (c.status === 'hidden') {
                                handleUnhide(c.id)
                              } else {
                                openActionModal(c.id, c.name, 'hide')
                              }
                            }}>
                              {c.status === 'hidden'
                                ? <><i className="bx bx-lock-open-alt" /> {t('communities.unhideCommunity')}</>
                                : <><i className="bx bx-lock-alt" /> {t('communities.hideCommunity')}</>
                              }
                            </button>
                            <button
                              className={styles.actionMenuItem}
                              disabled={c.status === 'archived'}
                              onClick={() => openActionModal(c.id, c.name, 'archive')}
                            >
                              <i className="bx bx-archive" /> {t('communities.archiveCommunity')}
                            </button>
                            <button className={styles.actionMenuItem} onClick={() => openActionModal(c.id, c.name, 'warn')}>
                              <i className="bx bx-error-circle" /> {t('communities.warnCommunity')}
                            </button>
                            <button
                              className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
                              onClick={() => openActionModal(c.id, c.name, 'delete')}
                            >
                              <i className="bx bx-trash" /> {t('communities.deleteCommunity')}
                            </button>
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
                  <i className="bx bx-chevron-left" /> {t('communities.prevPage')}
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
                  {t('communities.nextPage')} <i className="bx bx-chevron-right" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {detailTarget && (
        <div className={styles.overlay} onClick={() => { setDetailTarget(null); setDetailData(null); setLogs([]) }}>
          <div className={`${styles.modal} ${styles.detailModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t('communities.detailTitle')}</h2>
              <button className={styles.modalClose} onClick={() => { setDetailTarget(null); setDetailData(null); setLogs([]) }}>
                <i className="bx bx-x" />
              </button>
            </div>
            {detailData ? (
              <>
                <div className={styles.tabBar}>
                  <button className={`${styles.tab} ${detailTab === 'info' ? styles.tabActive : ''}`} onClick={() => setDetailTab('info')}>
                    <i className="bx bx-info-circle" /> {t('communities.tabInfo')}
                  </button>
                  <button className={`${styles.tab} ${detailTab === 'members' ? styles.tabActive : ''}`} onClick={() => setDetailTab('members')}>
                    <i className="bx bx-group" /> {t('communities.tabMembers')}
                  </button>
                  <button className={`${styles.tab} ${detailTab === 'logs' ? styles.tabActive : ''}`} onClick={() => { setDetailTab('logs'); setLogsPage(1) }}>
                    <i className="bx bx-history" /> {t('communities.tabLogs')}
                  </button>
                </div>
                <div className={styles.modalBody}>
                  {detailTab === 'info' && (
                    <>
                      <div className={styles.detailHeader}>
                        <div className={styles.detailAvatarLarge}>
                          {detailData.avatar_uri ? (
                            <img src={detailData.avatar_uri} alt={detailData.name} className={styles.detailAvatarLargeImg} />
                          ) : (
                            <i className="bx bx-group" />
                          )}
                        </div>
                        <div>
                          <div className={styles.detailName}>{detailData.name}</div>
                          {detailData.description && <div className={styles.detailDesc}>{detailData.description}</div>}
                        </div>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>{t('communities.creator')}</span>
                        <span className={styles.detailValue}>{detailData.creator_name}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>{t('communities.privacy')}</span>
                        <span className={styles.detailValue}>
                          <span className={`${styles.badge} ${privacyBadgeClass(detailData.privacy)}`}>
                            {privacyLabel(detailData.privacy)}
                          </span>
                        </span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>{t('common.status')}</span>
                        <span className={styles.detailValue}>
                          <span className={`${styles.badge} ${statusBadgeClass(detailData.status)}`}>
                            {statusLabel(detailData.status)}
                          </span>
                        </span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>{t('communities.autoApprove')}</span>
                        <span className={styles.detailValue}>{detailData.auto_approve ? t('communities.yes') : t('communities.no')}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>{t('communities.memberCount')}</span>
                        <span className={styles.detailValue}>{detailData.member_count}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>{t('common.createdAt')}</span>
                        <span className={styles.detailValue}>{formatDate(detailData.created_at)}</span>
                      </div>
                      {detailData.updated_at && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>{t('common.updatedAt')}</span>
                          <span className={styles.detailValue}>{formatDate(detailData.updated_at)}</span>
                        </div>
                      )}
                    </>
                  )}
                  {detailTab === 'members' && (
                    <>
                      {detailData.members.length === 0 ? (
                        <div className={styles.empty}>
                          <i className="bx bx-user-x" />
                          <p>{t('communities.noMembers')}</p>
                        </div>
                      ) : (
                        <div className={styles.memberList}>
                          {detailData.members.slice(0, 20).map((m) => (
                            <div key={m.user_id} className={styles.memberItem}>
                              <div className={styles.memberAvatar}>
                                {m.avatar_uri ? (
                                  <img src={m.avatar_uri} alt={m.display_name} className={styles.memberAvatarImg} />
                                ) : (
                                  <i className="bx bx-user" />
                                )}
                              </div>
                              <div className={styles.memberInfo}>
                                <div className={styles.memberName}>{m.display_name}</div>
                              </div>
                              <span className={styles.memberRoleBadge}>{roleLabel(m.role)}</span>
                            </div>
                          ))}
                          {detailData.member_count > 20 && (
                            <button className={styles.viewAllLink}>
                              {t('communities.viewAllMembers').replace('{count}', String(detailData.member_count))}
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {detailTab === 'logs' && (
                    <>
                      {logsLoading ? (
                        <div className={styles.empty}>
                          <i className="bx bx-loader-alt bx-spin" />
                          <p>{t('common.loading')}</p>
                        </div>
                      ) : logs.length === 0 ? (
                        <div className={styles.empty}>
                          <i className="bx bx-history" />
                          <p>{t('communities.noLogs')}</p>
                        </div>
                      ) : (
                        <div className={styles.logList}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-sm) 0', borderBottom: '2px solid var(--color-divider)', fontWeight: 700, fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                            <span style={{ minWidth: 100 }}>{t('communities.moderator')}</span>
                            <span style={{ whiteSpace: 'nowrap' }}>{t('communities.modAction')}</span>
                            <span style={{ flex: 1, minWidth: 80 }}>{t('communities.modReason')}</span>
                            <span style={{ whiteSpace: 'nowrap' }}>{t('communities.modDate')}</span>
                          </div>
                          {logs.map((log) => (
                            <div key={log.id} className={styles.logItem}>
                              <span className={styles.logModerator}>{log.moderator_name}</span>
                              <span className={`${styles.logActionBadge} ${actionBadgeClass(log.action)}`}>
                                {actionLabel(log.action)}
                              </span>
                              <span className={styles.logReason}>{log.reason}</span>
                              <span className={styles.logDate}>{formatDate(log.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {logsTotal > 20 && (
                        <div className={styles.pagination} style={{ borderTop: 'none', padding: 'var(--space-sm) 0' }}>
                          <button className={styles.pageBtn} disabled={logsPage <= 1} onClick={() => setLogsPage(p => p - 1)}>
                            <i className="bx bx-chevron-left" />
                          </button>
                          <span className={styles.pageInfo}>{logsPage} / {Math.ceil(logsTotal / 20)}</span>
                          <button className={styles.pageBtn} disabled={logsPage >= Math.ceil(logsTotal / 20)} onClick={() => setLogsPage(p => p + 1)}>
                            <i className="bx bx-chevron-right" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.modalBody}>
                <div className={styles.empty}>
                  <i className="bx bx-loader-alt bx-spin" />
                  <p>{t('common.loading')}</p>
                </div>
              </div>
            )}
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => { setDetailTarget(null); setDetailData(null); setLogs([]) }}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hide / Archive / Warn / Delete Modals */}
      {actionTarget && (
        <div className={styles.overlay} onClick={() => { setActionTarget(null); setActionReason(''); setWarnMessage('') }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {actionTarget.type === 'hide' && t('communities.hideCommunity')}
                {actionTarget.type === 'archive' && t('communities.archiveCommunity')}
                {actionTarget.type === 'warn' && t('communities.warnCommunity')}
                {actionTarget.type === 'delete' && t('communities.deleteCommunity')}
              </h2>
              <button className={styles.modalClose} onClick={() => { setActionTarget(null); setActionReason(''); setWarnMessage('') }}>
                <i className="bx bx-x" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--color-text-secondary)', fontSize: 14 }}>
                <strong style={{ color: 'var(--color-text)' }}>{actionTarget.name}</strong>
              </p>

              {actionTarget.type === 'delete' && (
                <p className={styles.warningText}>{t('communities.deleteWarning')}</p>
              )}

              {actionTarget.type === 'warn' && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>{t('communities.warnMessage')}</label>
                  <textarea
                    className={styles.fieldTextarea}
                    value={warnMessage}
                    onChange={(e) => setWarnMessage(e.target.value)}
                    placeholder={t('communities.warnMessage')}
                    rows={3}
                  />
                </div>
              )}

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  {actionTarget.type === 'hide' && t('communities.hideReason')}
                  {actionTarget.type === 'archive' && t('communities.archiveReason')}
                  {actionTarget.type === 'warn' && t('communities.warnReason')}
                  {actionTarget.type === 'delete' && t('communities.deleteReason')}
                </label>
                <textarea
                  className={styles.fieldTextarea}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={
                    actionTarget.type === 'hide' ? t('communities.hideReason') :
                    actionTarget.type === 'archive' ? t('communities.archiveReason') :
                    actionTarget.type === 'warn' ? t('communities.warnReason') :
                    t('communities.deleteReason')
                  }
                  rows={3}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                onClick={() => { setActionTarget(null); setActionReason(''); setWarnMessage('') }}
                disabled={actionLoading}
              >
                {t('common.cancel')}
              </button>
              <button
                className={actionTarget.type === 'delete' ? styles.btnDanger : styles.btnPrimary}
                disabled={!actionReason.trim() || (actionTarget.type === 'warn' && !warnMessage.trim()) || actionLoading}
                onClick={handleModerateAction}
              >
                {actionLoading ? t('common.loading') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
