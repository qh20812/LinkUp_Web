'use client'

import React from 'react'
import styles from './Pagination.module.css'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

function getPageNumbers(page: number, totalPages: number): (number | string)[] {
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

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className={styles.pagination}>
      <button
        className={styles.pageBtn}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <i className="bx bx-chevron-left" />
      </button>
      {getPageNumbers(page, totalPages).map((p, i) =>
        typeof p === 'string' ? (
          <span key={`e${i}`} className={styles.ellipsis}>{p}</span>
        ) : (
          <button
            key={p}
            className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        )
      )}
      <button
        className={styles.pageBtn}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <i className="bx bx-chevron-right" />
      </button>
    </div>
  )
}
