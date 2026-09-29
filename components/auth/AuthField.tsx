'use client'

import React from 'react'
import styles from './authShared.module.css'

export interface FieldAriaProps {
  'aria-invalid': boolean
  'aria-describedby': string | undefined
}

interface AuthFieldProps {
  id: string
  label: string
  error?: string
  /** Rendered on the right side of the label row (e.g. "Quên mật khẩu?"). */
  labelAction?: React.ReactNode
  /** Static hint shown when there is no error (e.g. live confirm-match). */
  hint?: React.ReactNode
  children: (aria: FieldAriaProps) => React.ReactNode
}

/**
 * Label + input + reserved error line. The error slot always occupies its
 * height so the form never shifts when a message appears.
 */
export default function AuthField({ id, label, error, labelAction, hint, children }: AuthFieldProps) {
  const errorId = `${id}-error`
  const hasMessage = Boolean(error || hint)

  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {labelAction && <span className={styles.labelAction}>{labelAction}</span>}
      </div>
      {children({
        'aria-invalid': Boolean(error),
        'aria-describedby': hasMessage ? errorId : undefined,
      })}
      <span className={styles.errorSlot} id={errorId}>
        {error ? <span className={styles.error}>{error}</span> : hint}
      </span>
    </div>
  )
}
