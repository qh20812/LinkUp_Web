'use client'

import React, { useId } from 'react'
import styles from './FieldHelp.module.css'

interface FieldHelpProps {
  /** Tên khái niệm, dùng cho `aria-label` của nút (vd "Giải thích Giá CPM"). */
  label: string
  /** Nội dung tooltip, nên ngắn (1 câu). */
  text: string
}

/**
 * Nút "?" cạnh label để giải thích khái niệm khó (CPM, CPC, max impressions,
 * ngân sách/ngày). Tooltip hiện khi hover hoặc khi nút được focus bàn phím nên
 * dùng được keyboard-only.
 */
export default function FieldHelp({ label, text }: FieldHelpProps) {
  const tooltipId = useId()

  return (
    <span className={styles.wrap}>
      <button
        type="button"
        className={styles.btn}
        aria-label={label}
        aria-describedby={tooltipId}
      >
        ?
      </button>
      <span id={tooltipId} role="tooltip" className={styles.tooltip}>
        {text}
      </span>
    </span>
  )
}
