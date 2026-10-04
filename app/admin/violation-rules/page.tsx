'use client'

import React, { useState, useEffect } from 'react'
import useSWR from 'swr'
import { useTranslation } from '../../../hooks/useTranslation'
import { useToast } from '../../../contexts/ToastContext'
import {
  createViolationRule,
  updateViolationRule,
  setViolationRuleActive,
} from '../../../api/admin'
import { swrFetcher, invalidate } from '../../../api/swr'
import type { ViolationRule, ViolationRuleListResponse, AdminViolationRuleInput } from '../../../types'
import Modal from '../../../components/Modal'
import styles from './ViolationRules.module.css'
import { toErrorMessage } from '../../../utils/errorMessage'

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

const SWR_KEY = '/admin/violation-rules?include_inactive=true'

const EMPTY_FORM: AdminViolationRuleInput = {
  title: '',
  description: '',
  applicable_to: 'all',
  severity: 'medium',
  sort_order: 0,
}

export default function ViolationRulesPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [userRole] = useState<string | null>(() => getUserRoleFromToken())
  const canMutate = userRole === null || userRole === 'SUPER_ADMIN'

  const { data: res, error, isLoading: loading } = useSWR(
    SWR_KEY,
    (url: string) => swrFetcher<ViolationRuleListResponse>(url),
  )
  const rules = res?.rules ?? []

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ViolationRule | null>(null)
  const [form, setForm] = useState<AdminViolationRuleInput>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(null)

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

  const scopeLabel = (scope: string): string => {
    const map: Record<string, string> = {
      all: t('violationRules.scopeAll'),
      post: t('violationRules.scopePost'),
      comment: t('violationRules.scopeComment'),
      user: t('violationRules.scopeUser'),
    }
    return map[scope] ?? scope
  }

  const severityLabel = (severity: string): string => {
    const map: Record<string, string> = {
      low: t('violationRules.sevLow'),
      medium: t('violationRules.sevMedium'),
      high: t('violationRules.sevHigh'),
    }
    return map[severity] ?? severity
  }

  const severityClass = (severity: string): string => {
    if (severity === 'high') return styles.sevHigh
    if (severity === 'low') return styles.sevLow
    return styles.sevMedium
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (rule: ViolationRule) => {
    setEditing(rule)
    setForm({
      title: rule.title,
      description: rule.description,
      applicable_to: rule.applicable_to,
      severity: rule.severity,
      sort_order: rule.sort_order,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || saving) return
    setSaving(true)
    try {
      const payload: AdminViolationRuleInput = {
        ...form,
        title: form.title.trim(),
        description: form.description?.trim() || '',
      }
      if (editing) {
        await updateViolationRule(editing.id, payload)
        toast({ title: t('violationRules.updateSuccess'), type: 'success' })
      } else {
        await createViolationRule(payload)
        toast({ title: t('violationRules.createSuccess'), type: 'success' })
      }
      setModalOpen(false)
      invalidate('/admin/violation-rules')
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (rule: ViolationRule) => {
    if (togglingId) return
    setTogglingId(rule.id)
    try {
      await setViolationRuleActive(rule.id, !rule.is_active)
      toast({ title: t('violationRules.statusSuccess'), type: 'success' })
      invalidate('/admin/violation-rules')
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('common.error'), type: 'error' })
    } finally {
      setTogglingId(null)
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
        </div>
      ))}
    </>
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('violationRules.title')}</h1>
          <p className={styles.subtitle}>{t('violationRules.subtitle')}</p>
        </div>
        {canMutate && (
          <button type="button" className={styles.btnPrimary} onClick={openCreate}>
            <i className="bx bx-plus" />
            {t('violationRules.create')}
          </button>
        )}
      </div>

      <div className={styles.card}>
        {loading ? (
          skeletonRows()
        ) : error ? (
          <div className={styles.empty}>
            <i className="bx bx-error-circle" />
            <p>{toErrorMessage(error)}</p>
          </div>
        ) : rules.length === 0 ? (
          <div className={styles.empty}>
            <i className="bx bx-list-check" />
            <p>{t('violationRules.empty')}</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('violationRules.colTitle')}</th>
                <th>{t('violationRules.colScope')}</th>
                <th>{t('violationRules.colSeverity')}</th>
                <th>{t('violationRules.colOrder')}</th>
                <th>{t('violationRules.colStatus')}</th>
                {canMutate && <th>{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className={rule.is_active ? '' : styles.rowInactive}>
                  <td>
                    <div className={styles.cellTitle}>
                      <span className={styles.ruleTitle}>{rule.title}</span>
                      {rule.description && (
                        <span className={styles.ruleDesc}>{rule.description}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeScope}`}>
                      {scopeLabel(rule.applicable_to)}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${severityClass(rule.severity)}`}>
                      {severityLabel(rule.severity)}
                    </span>
                  </td>
                  <td>{rule.sort_order}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${rule.is_active ? styles.badgeActive : styles.badgeInactive}`}
                    >
                      {rule.is_active ? t('violationRules.active') : t('violationRules.inactive')}
                    </span>
                  </td>
                  {canMutate && (
                    <td className={styles.actionsCell}>
                      <div className={styles.actionMenuWrap}>
                        <button
                          type="button"
                          className={styles.actionsBtn}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (openMenuId === rule.id) {
                              closeMenu()
                            } else {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              const menuH = 110
                              let top = rect.bottom + 4
                              if (top + menuH > window.innerHeight) top = rect.top - 4 - menuH
                              let left = rect.right - 180
                              if (left < 8) left = 8
                              setMenuStyle({ top, left })
                              setOpenMenuId(rule.id)
                            }
                          }}
                        >
                          <i className="bx bx-dots-vertical-rounded" />
                        </button>
                        {openMenuId === rule.id && menuStyle && (
                          <div
                            className={styles.actionMenu}
                            style={{ position: 'fixed', top: menuStyle.top, left: menuStyle.left, zIndex: 1000 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className={styles.actionMenuItem}
                              onClick={() => { closeMenu(); openEdit(rule) }}
                            >
                              <i className="bx bx-edit" /> {t('common.edit')}
                            </button>
                            <button
                              type="button"
                              className={styles.actionMenuItem}
                              disabled={togglingId === rule.id}
                              onClick={() => { closeMenu(); handleToggle(rule) }}
                            >
                              <i className={`bx ${rule.is_active ? 'bx-hide' : 'bx-show'}`} />{' '}
                              {rule.is_active
                                ? t('violationRules.deactivate')
                                : t('violationRules.activate')}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('violationRules.edit') : t('violationRules.create')}
        footer={
          <>
            <button type="button" className={styles.btnCancel} onClick={() => setModalOpen(false)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={!form.title.trim() || saving}
              onClick={handleSave}
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </>
        }
      >
        <div className={styles.form}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="vr-title">
              {t('violationRules.titleLabel')}
            </label>
            <input
              id="vr-title"
              type="text"
              className={styles.fieldInput}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={255}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="vr-desc">
              {t('violationRules.descLabel')}
            </label>
            <textarea
              id="vr-desc"
              className={styles.fieldTextarea}
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              maxLength={2000}
            />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="vr-scope">
                {t('violationRules.scopeLabel')}
              </label>
              <select
                id="vr-scope"
                className={styles.fieldSelect}
                value={form.applicable_to}
                onChange={(e) => setForm((f) => ({ ...f, applicable_to: e.target.value }))}
              >
                <option value="all">{t('violationRules.scopeAll')}</option>
                <option value="post">{t('violationRules.scopePost')}</option>
                <option value="comment">{t('violationRules.scopeComment')}</option>
                <option value="user">{t('violationRules.scopeUser')}</option>
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="vr-sev">
                {t('violationRules.severityLabel')}
              </label>
              <select
                id="vr-sev"
                className={styles.fieldSelect}
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
              >
                <option value="low">{t('violationRules.sevLow')}</option>
                <option value="medium">{t('violationRules.sevMedium')}</option>
                <option value="high">{t('violationRules.sevHigh')}</option>
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="vr-order">
                {t('violationRules.orderLabel')}
              </label>
              <input
                id="vr-order"
                type="number"
                min={0}
                className={styles.fieldInput}
                value={form.sort_order ?? 0}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sort_order: Math.max(0, Number(e.target.value) || 0) }))
                }
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
