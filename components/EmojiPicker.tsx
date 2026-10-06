'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './EmojiPicker.module.css'
import { useTranslation } from '../hooks/useTranslation'
import { getEmojis } from '../api/posts'
import { EMOJI_CATEGORIES, type EmojiCategory, type EmojiItem } from '../types'

interface EmojiPickerProps {
  onSelect: (emoji: EmojiItem) => void
  onClose: () => void
  placement?: 'top' | 'bottom'
  /** Element that toggles this picker — clicks on it are not treated as outside. */
  ignoreRef?: React.RefObject<HTMLElement | null>
}

const DEBOUNCE_MS = 400
const PAGE_SIZE = 60

export default function EmojiPicker({
  onSelect,
  onClose,
  placement = 'bottom',
  ignoreRef,
}: EmojiPickerProps) {
  const { t } = useTranslation()
  const tRef = useRef(t)
  useEffect(() => {
    tRef.current = t
  })
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<EmojiCategory>('smileys')
  const [items, setItems] = useState<EmojiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  const load = useCallback((q: string, cat: EmojiCategory, offset: number) => {
    const id = ++requestIdRef.current
    setLoading(true)
    getEmojis({ q: q || undefined, category: q ? undefined : cat, limit: PAGE_SIZE, offset })
      .then((res) => {
        if (requestIdRef.current !== id) return
        setItems((prev) => (offset === 0 ? res.data : [...prev, ...res.data]))
        setHasMore(res.has_more)
        offsetRef.current = offset + res.data.length
        setError(null)
      })
      .catch(() => {
        if (requestIdRef.current !== id) return
        setError(tRef.current('composer.emojiError'))
      })
      .finally(() => {
        if (requestIdRef.current === id) setLoading(false)
      })
  }, [])

  // Initial browse (offset 0) — defer 1 tick để tránh setState đồng bộ trong effect.
  useEffect(() => {
    const t = setTimeout(() => load('', 'smileys', 0), 0)
    return () => clearTimeout(t)
  }, [load])

  // Debounced search.
  useEffect(() => {
    const term = query.trim()
    if (!term) return
    const timeout = setTimeout(() => {
      offsetRef.current = 0
      load(term, category, 0)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [query, category, load])

  const pickCategory = (cat: EmojiCategory) => {
    setCategory(cat)
    setQuery('')
    offsetRef.current = 0
    load('', cat, 0)
    gridRef.current?.scrollTo({ top: 0 })
  }

  const onScroll = () => {
    if (!hasMore || loading) return
    const el = gridRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      load(query.trim(), category, offsetRef.current)
    }
  }

  const pickerClass = `${styles.picker}${placement === 'top' ? ` ${styles.pickerTop}` : ''}`
  const searching = query.trim() !== ''

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
      {!searching && (
        <div className={styles.tabs} role="tablist" aria-label={t('composer.emoji')}>
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={category === cat}
              className={`${styles.tab}${category === cat ? ` ${styles.tabActive}` : ''}`}
              onClick={() => pickCategory(cat)}
              title={t(`composer.emojiGroups.${cat}`)}
            >
              {t(`composer.emojiGroups.${cat}`)}
            </button>
          ))}
        </div>
      )}
      {error && <p className={styles.errorText}>{error}</p>}
      <div className={styles.grid} ref={gridRef} onScroll={onScroll}>
        {items.map((e) => (
          <button
            key={e.id}
            type="button"
            className={styles.item}
            onClick={() => onSelect(e)}
            title={e.name || e.code}
            aria-label={e.name || e.code}
          >
            <span className={styles.char} aria-hidden="true">
              {e.character || e.code}
            </span>
          </button>
        ))}
        {loading && (
          <div className={styles.loading}>
            <i className="bx bx-loader-circle bx-spin" />
          </div>
        )}
        {!loading && items.length === 0 && (
          <p className={styles.empty}>{t('composer.emojiEmpty')}</p>
        )}
      </div>
    </div>
  )
}
