'use client'

import React, { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import type { FieldAriaProps } from './AuthField'
import styles from './authShared.module.css'

interface PasswordInputProps
  extends FieldAriaProps,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'aria-invalid' | 'aria-describedby'> {
  id: string
}

/**
 * Password input with a keyboard-reachable visibility toggle.
 * Keeps its own show/hide state — forms never need to know it.
 */
export default function PasswordInput({ id, ...inputProps }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const { t } = useTranslation()

  return (
    <div className={styles.passwordWrap}>
      <input
        {...inputProps}
        id={id}
        type={visible ? 'text' : 'password'}
        className={styles.input}
      />
      <button
        type="button"
        className={styles.eyeBtn}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
        aria-pressed={visible}
      >
        <i className={`bx ${visible ? 'bx-hide' : 'bx-show'}`} />
      </button>
    </div>
  )
}
