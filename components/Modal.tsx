'use client'

import React, { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../hooks/useTranslation'
import styles from './Modal.module.css'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'lg'
  /**
   * Lớp xếp chồng cộng thêm trên `--z-modal` (mỗi lớp 10). Dùng `1` khi modal
   * được mở từ bên trong một modal khác (vd. ShareDialog trong PostDetailModal)
   * để nó luôn nằm trên modal cha thay vì phụ thuộc thứ tự chèn vào DOM.
   */
  layer?: number
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ open, onClose, title, children, footer, size, layer = 0 }: ModalProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const modalRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    modalRef.current?.focus()

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !modalRef.current) return
      const nodes = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !modalRef.current.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKey)
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.documentElement.style.overflow = prevHtmlOverflow
      const previous = returnFocusRef.current
      if (previous && document.contains(previous)) previous.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className={styles.overlay}
      style={{ zIndex: `calc(var(--z-modal) + ${layer * 10})` }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`${styles.modal}${size === 'lg' ? ` ${styles.modalLg}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title} id={titleId}>
            {title}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label={t('common.close')}>
            <i className="bx bx-x" />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
