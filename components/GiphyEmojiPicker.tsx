'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './GiphyEmojiPicker.module.css'
import { useTranslation } from '../hooks/useTranslation'
import { GIPHY_KEY, fetchGiphyEmojis, type GiphyEmoji } from '../utils/giphy'

interface GiphyEmojiPickerProps {
  onSelect: (emoji: GiphyEmoji) => void
  onClose: () => void
  placement?: 'top' | 'bottom'
  /** Element that toggles this picker — clicks on it are not treated as outside. */
  ignoreRef?: React.RefObject<HTMLElement | null>
}

const DEBOUNCE_MS = 400

export default function GiphyEmojiPicker({
  onSelect,
  onClose,
  placement = 'bottom',
  ignoreRef,
}: GiphyEmojiPickerProps) {
  const { t } = useTranslation()
  const tRef = useRef(t)
  useEffect(() => {
    tRef.current = t
  })
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<GiphyEmoji[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [closed, setClosed] = useState(false)
  const requestIdRef = useRef(0)
  const offsetRef = useRef(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ignoreRef && !onClose) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (ignoreRef?.current?.contains(target)) return
      if (rootRef.current && !rootRef.current.contains(target)) onClose?.()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, ignoreRef])

  const load = useCallback((q: string, offset: number) => {
    if (!GIPHY_KEY) return
    const id = ++requestIdRef.current
    fetchGiphyEmojis({ q, offset })
      .then((res) => {
        if (requestIdRef.current !== id) return
        setItems((prev) => (offset === 0 ? res.items : [...prev, ...res.items]))
        setHasMore(res.hasMore)
        offsetRef.current = offset + res.items.length
        setError(null)
      })
      .catch(() => {
        if (requestIdRef.current === id) setError(tRef.current('composer.gifError'))
      })
      .finally(() => {
        if (requestIdRef.current === id) setLoading(false)
      })
  }, [])

  // Initial browse (offset 0).
  useEffect(() => {
    load('', 0)
  }, [load])

  // Debounced search.
  useEffect(() => {
    if (!GIPHY_KEY) return
    const term = query.trim()
    if (!term) {
      // quay về catalog khi xóa search
      if (requestIdRef.current > 0) {
        offsetRef.current = 0
        load('', 0)
      }
      return
    }
    const timeout = setTimeout(() => {
      setLoading(true)
      load(term, 0)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [query, load])

  const onScroll = () => {
    if (!hasMore || loading) return
    const el = gridRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setLoading(true)
      load(query.trim(), offsetRef.current)
    }
  }

  const pickerClass = `${styles.picker}${placement === 'top' ? ` ${styles.pickerTop}` : ''}`

  if (!GIPHY_KEY) {
    return (
      <div className={pickerClass} ref={rootRef} role="dialog" aria-label={t('composer.emoji')}>
        <div className={styles.missingKey}>
          <i className="bx bx-error-circle" />
          <p>{t('composer.gifMissingKey')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={pickerClass} ref={rootRef} role="dialog" aria-label={t('composer.emoji')}>
      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('composer.emojiSearch')}
          autoFocus
        />
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t('composer.gifClose')}>
          <i className="bx bx-x" />
        </button>
      </div>
      {error && <p className={styles.errorText}>{error}</p>}
      <div className={styles.grid} ref={gridRef} onScroll={onScroll}>
        {items.map((e) => (
          <button
            key={`${e.id}-${e.title}`}
            type="button"
            className={styles.item}
            onClick={() => {
              onSelect(e)
              setClosed(true)
            }}
            title={e.title}
            aria-label={e.title}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.preview} alt={e.title} loading="lazy" decoding="async" />
          </button>
        ))}
        {loading && !closed && (
          <div className={styles.loading}>
            <i className="bx bx-loader-circle bx-spin" />
          </div>
        )}
        {!loading && items.length === 0 && (
          <p className={styles.empty}>{t('composer.emojiEmpty')}</p>
        )}
      </div>
      <div className={styles.attribution}>Powered by GIPHY</div>
    </div>
  )
}
