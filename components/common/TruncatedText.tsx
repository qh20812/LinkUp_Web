'use client'

import React from 'react'
import styles from './TruncatedText.module.css'

interface TruncatedTextProps {
  value: string
  /** Class phụ để giới hạn max-width theo từng cột. */
  className?: string
}

/**
 * Dữ liệu dài trong bảng: hiển thị một dòng + dấu ba chấm, hover xem đầy đủ
 * qua `title`. Dùng `title` native thay vì tooltip CSS vì `.tableWrap` có
 * `overflow-x: auto` sẽ cắt tooltip tuyệt đối.
 */
export default function TruncatedText({ value, className }: TruncatedTextProps) {
  return (
    <span className={`${styles.truncate} ${className ?? ''}`} title={value}>
      {value}
    </span>
  )
}
