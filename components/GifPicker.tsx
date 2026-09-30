'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './GifPicker.module.css'
import { useTranslation } from '../hooks/useTranslation'
import { GIPHY_KEY, fetchGiphyGifs, peekGiphyGifCache } from '../utils/giphy'
import type { GifItem } from '../types'

interface GifPickerProps {
  onSelect: (gif: GifItem) => void
  onClose: () => void
  placement?: 'top' | 'bottom'
}

export default function GifPicker({ onSelect, onClose, placement = 'bottom' }: GifPickerProps) {
  const { t } = useTranslation()
  const tRef = useRef(t)
  useEffect(() => {
    tRef.current = t
  })
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<GifItem[]>(() => peekGiphyGifCache() ?? [])
  const [loading, setLoading] = useState(() => peekGiphyGifCache() === null)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!GIPHY_KEY) return
    if (peekGiphyGifCache()) return
    const id = ++requestIdRef.current
    fetchGiphyGifs()
      .then((items) => {
        if (requestIdRef.current !== id) return
        setGifs(items)
      })
      .catch(() => {
        if (requestIdRef.current === id) setError(tRef.current('composer.gifError'))
      })
      .finally(() => {
        if (requestIdRef.current === id) setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!GIPHY_KEY) return
    const term = query.trim()
    if (!term) return
    const id = ++requestIdRef.current
    const timeout = setTimeout(() => {
      setLoading(true)
      setError(null)
      fetchGiphyGifs({ q: term })
        .then((items) => {
          if (requestIdRef.current !== id) return
          setGifs(items)
        })
        .catch(() => {
          if (requestIdRef.current === id) setError(tRef.current('composer.gifError'))
        })
        .finally(() => {
          if (requestIdRef.current === id) setLoading(false)
        })
    }, 400)
    return () => clearTimeout(timeout)
  }, [query])

  const pickerClass = `${styles.picker}${placement === 'top' ? ` ${styles.pickerTop}` : ''}`

  if (!GIPHY_KEY) {
    return (
      <div className={pickerClass}>
        <div className={styles.missingKey}>
          <i className="bx bx-error-circle" />
          <p>{t('composer.gifMissingKey')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={pickerClass}>
      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('composer.gifPlaceholder')}
          autoFocus
        />
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t('composer.gifClose')}>
          <i className="bx bx-x" />
        </button>
      </div>
      {error && <p className={styles.errorText}>{error}</p>}
      <div className={styles.grid}>
        {gifs.map((g) => (
          <button
            key={g.id}
            type="button"
            className={styles.gifItem}
            onClick={() => onSelect(g)}
            title={g.title ?? ''}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={g.preview}
              alt={g.title ?? ''}
              loading="lazy"
              decoding="async"
              width={g.preview_width}
              height={g.preview_height}
            />
          </button>
        ))}
        {loading && (
          <div className={styles.loading}>
            <i className="bx bx-loader-circle bx-spin" />
          </div>
        )}
      </div>
      <div className={styles.attribution}>Powered by GIPHY</div>
    </div>
  )
}
