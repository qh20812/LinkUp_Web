'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import styles from './CopyIconButton.module.css'

interface CopyIconButtonProps {
  value: string
  /** Tên trường đã dịch, dùng cho aria-label: "Sao chép Số tài khoản". */
  fieldLabel: string
  /** Gọi khi clipboard lỗi để trang cha hiện toast/thông báo phù hợp. */
  onError: (value: string) => void
}

const COPIED_RESET_MS = 1800

/**
 * Nút sao chép icon-only cho các trường thông tin chuyển khoản.
 * - Hover/focus: tooltip "Sao chép".
 * - Bấm thành công: icon đổi sang dấu kiểm, tooltip "Sao chép thành công" ~1,8s.
 * - Screen reader đọc kết quả qua vùng aria-live ẩn.
 */
export default function CopyIconButton({ value, fieldLabel, onError }: CopyIconButtonProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [])

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      if (resetTimer.current) clearTimeout(resetTimer.current)
      resetTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS)
    } catch {
      onError(value)
    }
  }

  const tooltip = copied ? t('wallet.copySuccess') : t('wallet.copy')

  return (
    <button
      type="button"
      className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
      onClick={handleClick}
      data-tooltip={tooltip}
      aria-label={copied ? t('wallet.copySuccess') : t('wallet.copyField', { field: fieldLabel })}
    >
      <i className={`bx ${copied ? 'bx-check' : 'bx-copy'}`} aria-hidden="true" />
      <span className={styles.srOnly} role="status" aria-live="polite">
        {copied ? t('wallet.copySuccess') : ''}
      </span>
    </button>
  )
}
