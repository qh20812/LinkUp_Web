'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import styles from './ProofUpload.module.css'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp'
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

interface ProofUploadProps {
  value: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
}

function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot).toLowerCase() : ''
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Vùng chọn ảnh biên lai từ thiết bị: validate định dạng/kích thước, preview
 * ảnh, cho phép chọn lại hoặc xoá. Chỉ trả file hợp lệ qua `onChange`.
 */
export default function ProofUpload({ value, onChange, disabled = false }: ProofUploadProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const previewUrl = useMemo(() => (value ? URL.createObjectURL(value) : ''), [value])

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const openPicker = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Reset để chọn lại đúng file vừa xoá vẫn kích hoạt onChange.
    event.target.value = ''
    if (!file) return

    const typeOk = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    const extOk = ALLOWED_EXTENSIONS.includes(fileExtension(file.name))
    if (!typeOk && !extOk) {
      setError(t('wallet.imageTypeInvalid'))
      onChange(null)
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(t('wallet.imageTooLarge'))
      onChange(null)
      return
    }

    setError('')
    onChange(file)
  }

  const remove = () => {
    setError('')
    onChange(null)
  }

  return (
    <div className={styles.wrapper}>
      <input
        ref={inputRef}
        className={styles.fileInput}
        type="file"
        accept={ACCEPT}
        onChange={handleFile}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
      />

      {value && previewUrl ? (
        <div className={styles.previewCard}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.preview}
            src={previewUrl}
            alt={t('wallet.proofPreviewAlt')}
          />
          <div className={styles.meta}>
            <span className={styles.fileName} title={value.name}>
              {value.name}
            </span>
            <span className={styles.fileSize}>{formatFileSize(value.size)}</span>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.changeBtn}
                onClick={openPicker}
                disabled={disabled}
              >
                <i className="bx bx-image-replace" aria-hidden="true" />
                {t('wallet.changeImage')}
              </button>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={remove}
                disabled={disabled}
              >
                <i className="bx bx-trash" aria-hidden="true" />
                {t('wallet.removeImage')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={styles.dropzone}
          onClick={openPicker}
          disabled={disabled}
        >
          <i className="bx bx-cloud-upload" aria-hidden="true" />
          <span className={styles.dropTitle}>{t('wallet.chooseImage')}</span>
          <span className={styles.dropHint}>{t('wallet.uploadHint')}</span>
        </button>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
