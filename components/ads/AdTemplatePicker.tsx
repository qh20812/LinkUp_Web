'use client'

import React, { useMemo, useState } from 'react'
import Modal from '../Modal'
import { useTranslation } from '../../hooks/useTranslation'
import { getAdTemplates, type LocalizedAdTemplate } from '../../lib/ad-templates'
import styles from './AdTemplatePicker.module.css'

interface AdTemplatePickerProps {
  open: boolean
  onClose: () => void
  onApply: (template: LocalizedAdTemplate) => void
  /** Form đã có tiêu đề/nội dung → hỏi trước khi ghi đè. */
  hasExistingContent: boolean
}

/** Modal chọn mẫu nội dung theo ngành (chỉ điền tiêu đề + nội dung). */
export default function AdTemplatePicker({
  open,
  onClose,
  onApply,
  hasExistingContent,
}: AdTemplatePickerProps) {
  const { t, language } = useTranslation()
  const templates = useMemo(() => getAdTemplates(language), [language])
  const [pending, setPending] = useState<LocalizedAdTemplate | null>(null)

  const handleClose = () => {
    setPending(null)
    onClose()
  }

  const handlePick = (template: LocalizedAdTemplate) => {
    if (hasExistingContent) {
      setPending(template)
      return
    }
    onApply(template)
    handleClose()
  }

  const handleConfirm = () => {
    if (!pending) return
    onApply(pending)
    handleClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={t('partner.form.templateTitle')}>
      {pending ? (
        <div className={styles.confirm}>
          <p className={styles.confirmText}>
            {t('partner.form.templateOverwrite')}
            <strong>{pending.title}</strong>
          </p>
          <div className={styles.confirmActions}>
            <button type="button" className={styles.btnCancel} onClick={() => setPending(null)}>
              {t('partner.form.templateBack')}
            </button>
            <button type="button" className={styles.btnPrimary} onClick={handleConfirm}>
              {t('partner.form.templateOverwriteConfirm')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className={styles.hint}>{t('partner.form.templateHint')}</p>
          <ul className={styles.list}>
            {templates.map((template) => (
              <li key={template.id}>
                <button type="button" className={styles.item} onClick={() => handlePick(template)}>
                  <span className={styles.emoji} aria-hidden="true">
                    {template.emoji}
                  </span>
                  <span className={styles.itemBody}>
                    <span className={styles.itemTitle}>{template.title}</span>
                    <span className={styles.itemContent}>{template.content}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  )
}
