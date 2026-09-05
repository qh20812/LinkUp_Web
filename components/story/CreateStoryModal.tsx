'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import ExternalImage from '../ExternalImage'
import { createStory } from '../../api/stories'
import styles from './CreateStoryModal.module.css'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'

interface CreateStoryModalProps {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

export default function CreateStoryModal({ open, onClose, onCreated }: CreateStoryModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [file, setFile] = useState<{ file: File; url: string } | null>(null)
  const [caption, setCaption] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaUrlRef = useRef<string | null>(null)

  useEffect(() => {
    const prev = mediaUrlRef.current
    return () => { if (prev) URL.revokeObjectURL(prev) }
  }, [])

  const resetForm = () => {
    const prev = mediaUrlRef.current
    if (prev) URL.revokeObjectURL(prev)
    mediaUrlRef.current = null
    setFile(null)
    setCaption('')
    setError(null)
  }

  const handleClose = useCallback(() => {
    if (submitting) return
    resetForm()
    onClose()
  }, [submitting, onClose])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKey)
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.documentElement.style.overflow = prev
    }
  }, [open, handleClose])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    const prev = mediaUrlRef.current
    if (prev) URL.revokeObjectURL(prev)
    const url = URL.createObjectURL(selected)
    mediaUrlRef.current = url
    setFile({ file: selected, url })
    setError(null)
    e.target.value = ''
  }

  const removeFile = () => {
    const prev = mediaUrlRef.current
    if (prev) URL.revokeObjectURL(prev)
    mediaUrlRef.current = null
    setFile(null)
    setError(null)
  }

  const handleSubmit = async () => {
    if (submitting) return
    const trimmedCaption = caption.trim()
    if (!file && trimmedCaption === '') {
      setError(t('story.contentRequired'))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await createStory(file?.file ?? null, trimmedCaption)
      toast({ type: 'success', title: t('story.created') })
      onCreated?.()
      resetForm()
      onClose()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const isVideo = file?.file.type.startsWith('video/')

  return createPortal(
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{t('story.createTitle')}</span>
          <button type="button" className={styles.closeBtn} onClick={handleClose} aria-label={t('common.cancel')}>
            <i className="bx bx-x" />
          </button>
        </div>

        <div className={styles.body}>
          {file ? (
            <div className={styles.mediaPreview}>
              {isVideo ? (
                <video src={file.url} muted playsInline preload="metadata" className={styles.mediaEl} />
              ) : (
                <ExternalImage src={file.url} alt="" className={styles.mediaEl} />
              )}
              <button type="button" className={styles.removeMediaBtn} onClick={removeFile} aria-label={t('common.cancel')}>
                <i className="bx bx-x" />
              </button>
            </div>
          ) : (
            <div className={styles.dropzone} onClick={() => fileInputRef.current?.click()}>
              <i className={`bx bx-image-add ${styles.dropzoneIcon}`} />
              <span className={styles.dropzoneText}>{t('story.mediaPlaceholder')}</span>
              <span className={styles.dropzoneHint}>{t('story.mediaHint')}</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className={styles.fileInput}
            onChange={handleFileChange}
          />

          <textarea
            className={styles.captionInput}
            value={caption}
            onChange={(e) => { setCaption(e.target.value); setError(null) }}
            maxLength={500}
            placeholder={t('story.captionPlaceholder')}
          />

          {error && <p className={styles.errorText}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={handleClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
          <button type="button" className={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>
            {submitting && <i className="bx bx-loader-circle bx-spin" />}
            <span>{t('story.submit')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
