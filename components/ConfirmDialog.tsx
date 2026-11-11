'use client'

import React, { useId } from 'react'
import Modal from './Modal'
import { useTranslation } from '../hooks/useTranslation'
import styles from './ConfirmDialog.module.css'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  children?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  loading?: boolean
  confirmDisabled?: boolean
  onConfirm: () => void
  onClose: () => void
  layer?: number
}

/**
 * Hộp thoại xác nhận dùng chung (thay cho window.confirm).
 * - Tái dùng Modal nên có focus trap, Escape, focus restore, portal.
 * - Khi `loading`, không cho đóng (X/backdrop/Escape) để tránh huỷ giữa lúc
 *   đang gọi API.
 * - `tone="danger"` dùng cho hành động phá huỷ (huỷ yêu cầu, dọn media...).
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  tone = 'default',
  loading = false,
  confirmDisabled = false,
  onConfirm,
  onClose,
  layer,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  const descriptionId = useId()

  const handleClose = () => {
    if (loading) return
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      layer={layer}
      role="alertdialog"
      describedBy={description ? descriptionId : undefined}
      footer={
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={handleClose}
            disabled={loading}
          >
            {cancelLabel ?? t('common.cancel')}
          </button>
          <button
            type="button"
            className={tone === 'danger' ? styles.btnDanger : styles.btnPrimary}
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
          >
            {loading ? t('common.loading') : (confirmLabel ?? t('common.confirm'))}
          </button>
        </div>
      }
    >
      {description && (
        <p id={descriptionId} className={styles.description}>
          {description}
        </p>
      )}
      {children}
    </Modal>
  )
}
