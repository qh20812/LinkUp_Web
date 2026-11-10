'use client'

import React, { useEffect, useId, useLayoutEffect, useRef } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { formatGroupedNumber, normalizeNumberInput } from '../../lib/number-format'
import { vndInWords } from '../../lib/number-to-words'
import styles from './MoneyInput.module.css'

// useLayoutEffect chỉ chạy ở client; trên server dùng useEffect để tránh warning.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

interface MoneyInputProps {
  id: string
  /** Chuỗi số thô, chỉ gồm chữ số (không có dấu nhóm nghìn). */
  value: string
  onValueChange: (value: string) => void
  /** Class cho riêng thẻ input — cho phép trang cha giữ layout sẵn có. */
  className?: string
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  /** ID của hint bên ngoài để nối vào aria-describedby. */
  describedBy?: string
  /** Lỗi validate hiển thị ngay dưới dòng đọc số. */
  error?: string
}

/**
 * Ô nhập tiền VND:
 * - tự nhóm nghìn bằng dấu chấm khi gõ (`1000` → `1.000`);
 * - đọc số tiền bằng chữ ngay bên dưới, theo ngôn ngữ UI;
 * - giữ vị trí con trỏ theo số chữ số đã gõ.
 */
export default function MoneyInput({
  id,
  value,
  onValueChange,
  className,
  placeholder,
  disabled = false,
  autoFocus = false,
  describedBy,
  error,
}: MoneyInputProps) {
  const { t, language } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingDigitPosition = useRef<number | null>(null)
  const fallbackId = useId()
  const wordsId = `${id}-${fallbackId}-words`
  const errorId = `${id}-${fallbackId}-error`

  const formatted = formatGroupedNumber(value)
  const numericValue = value ? Number(value) : 0
  const words =
    numericValue > 0 && Number.isSafeInteger(numericValue)
      ? vndInWords(numericValue, language)
      : ''

  // Đặt lại con trỏ sau khi React render giá trị đã format, tránh nhảy về cuối
  // khi người dùng sửa ở giữa số.
  useIsomorphicLayoutEffect(() => {
    const target = pendingDigitPosition.current
    pendingDigitPosition.current = null
    if (target === null || !inputRef.current) return

    const input = inputRef.current
    let position = 0
    let seen = 0
    while (position < input.value.length && seen < target) {
      if (/\d/.test(input.value[position])) seen++
      position++
    }
    input.setSelectionRange(position, position)
  })

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const caret = input.selectionStart ?? input.value.length
    const digitsBeforeCaret = input.value.slice(0, caret).replace(/\D/g, '').length
    const next = normalizeNumberInput(input.value)

    pendingDigitPosition.current = Math.min(digitsBeforeCaret, next.length)
    onValueChange(next)
  }

  const describedByIds = [describedBy, words ? wordsId : '', error ? errorId : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.wrapper}>
      <input
        ref={inputRef}
        id={id}
        className={className ?? styles.input}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        value={formatted}
        onChange={handleChange}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedByIds || undefined}
      />

      {words && (
        <p id={wordsId} className={styles.words} aria-live="polite">
          {t('wallet.amountInWords', { words })}
        </p>
      )}

      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
