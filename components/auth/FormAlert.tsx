'use client'

import React from 'react'
import styles from './authShared.module.css'

interface FormAlertProps {
  variant?: 'danger' | 'warning'
  message: string
  action?: { label: string; onClick: () => void }
}

/**
 * Inline server-error banner rendered inside the form (`role="alert"`),
 * replacing the floating toast for auth failures.
 */
export default function FormAlert({ variant = 'danger', message, action }: FormAlertProps) {
  const warning = variant === 'warning'
  return (
    <div
      className={`${styles.alert}${warning ? ` ${styles.alertWarning}` : ''}`}
      role="alert"
    >
      <i className={`bx ${warning ? 'bx-error-circle' : 'bx-error'} ${styles.alertIcon}`} />
      <span className={styles.alertMessage}>{message}</span>
      {action && (
        <button type="button" className={styles.alertAction} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
