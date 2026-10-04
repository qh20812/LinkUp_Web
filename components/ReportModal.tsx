'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Modal from './Modal'
import { useTranslation } from '../hooks/useTranslation'
import { useToast } from '../contexts/ToastContext'
import { swrFetcher } from '../api/swr'
import { createReport } from '../api/reports'
import type { ReportTargetType, ViolationRule, ViolationRuleListResponse } from '../types'
import styles from './ReportModal.module.css'

interface ReportModalProps {
  open: boolean
  targetType: ReportTargetType
  targetId: string
  onClose: () => void
  onSubmitted?: () => void
}

const OTHER_VALUE = '__other__'

const TITLE_KEYS: Record<ReportTargetType, string> = {
  post: 'report.postTitle',
  comment: 'report.commentTitle',
  user: 'report.userTitle',
}

function severityClass(severity: string): string {
  switch (severity) {
    case 'high':
      return styles.sevHigh
    case 'low':
      return styles.sevLow
    default:
      return styles.sevMedium
  }
}

export default function ReportModal({ open, targetType, targetId, onClose, onSubmitted }: ReportModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [selected, setSelected] = useState('')
  const [detail, setDetail] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const swrKey = open ? `/violation-rules?target_type=${targetType}` : null
  const {
    data: rulesRes,
    error: loadError,
    isLoading: loading,
    mutate,
  } = useSWR(swrKey, (url: string) => swrFetcher<ViolationRuleListResponse>(url))
  const rules: ViolationRule[] = rulesRes?.rules ?? []

  const handleClose = () => {
    if (submitting) return
    setSelected('')
    setDetail('')
    setFieldError('')
    onClose()
  }

  const handleSubmit = async () => {
    if (!selected) {
      setFieldError(t('report.selectRequired'))
      return
    }
    // Mô tả chỉ bắt buộc khi chọn "Lý do khác" (không kèm rule);
    // đã chọn rule cụ thể thì phân loại đã rõ, chi tiết là optional.
    if (selected === OTHER_VALUE && !detail.trim()) {
      setFieldError(t('report.detailRequired'))
      return
    }
    setFieldError('')
    setSubmitting(true)
    try {
      const rule = rules.find((r) => r.id === selected)
      await createReport({
        target_type: targetType,
        target_id: targetId,
        // report_type là trường legacy bắt buộc của server; phân loại thật
        // nằm ở violation_rule_id (hiển thị bằng violation_rule_title ở admin).
        report_type: rule ? 'violation' : 'other',
        violation_rule_id: rule ? rule.id : undefined,
        reason_detail: detail.trim(),
      })
      toast({ type: 'success', title: t('report.success') })
      onSubmitted?.()
      onClose()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSubmitting(false)
    }
  }

  const isOther = selected === OTHER_VALUE || selected === ''

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t(TITLE_KEYS[targetType])}
      footer={
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={handleClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={submitting || loading || loadError}
          >
            {submitting ? t('common.loading') : t('report.submit')}
          </button>
        </div>
      }
    >
      <div className={styles.body}>
        <p className={styles.label}>{t('report.selectReason')}</p>
        {loading ? (
          <div className={styles.skeletonWrap} aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow} />
            ))}
          </div>
        ) : loadError ? (
          <div className={styles.loadError}>
            <p>{t('report.loadFailed')}</p>
            <button type="button" className={styles.retryBtn} onClick={() => mutate()}>
              {t('common.retry')}
            </button>
          </div>
        ) : (
          <div className={styles.ruleList} role="radiogroup" aria-label={t('report.selectReason')}>
            {rules.map((rule) => (
              <label
                key={rule.id}
                className={`${styles.ruleRow}${selected === rule.id ? ` ${styles.ruleSelected}` : ''}`}
              >
                <input
                  type="radio"
                  name="violation-rule"
                  className={styles.radio}
                  checked={selected === rule.id}
                  onChange={() => setSelected(rule.id)}
                />
                <span className={styles.ruleText}>
                  <span className={styles.ruleTitleRow}>
                    <span className={styles.ruleTitle}>{rule.title}</span>
                    <span className={`${styles.sevPill} ${severityClass(rule.severity)}`}>
                      {rule.severity === 'high'
                        ? t('violationRules.sevHigh')
                        : rule.severity === 'low'
                          ? t('violationRules.sevLow')
                          : t('violationRules.sevMedium')}
                    </span>
                  </span>
                  {rule.description && <span className={styles.ruleDesc}>{rule.description}</span>}
                </span>
              </label>
            ))}
            <label
              className={`${styles.ruleRow}${selected === OTHER_VALUE ? ` ${styles.ruleSelected}` : ''}`}
            >
              <input
                type="radio"
                name="violation-rule"
                className={styles.radio}
                checked={selected === OTHER_VALUE}
                onChange={() => setSelected(OTHER_VALUE)}
              />
              <span className={styles.ruleText}>
                <span className={styles.ruleTitle}>{t('report.otherReason')}</span>
              </span>
            </label>
          </div>
        )}

        <label className={styles.label} htmlFor="report-detail">
          {isOther ? t('report.detailLabel') : t('report.detailOptional')}
        </label>
        {!isOther && <p className={styles.hint}>{t('report.detailHint')}</p>}
        <textarea
          id="report-detail"
          className={styles.textarea}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder={t('report.detailPlaceholder')}
          rows={4}
          maxLength={1000}
        />
        {fieldError && (
          <p className={styles.fieldError} role="alert">
            {fieldError}
          </p>
        )}
      </div>
    </Modal>
  )
}
