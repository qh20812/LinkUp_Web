'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './GifPicker.module.css'
import { useTranslation } from '../hooks/useTranslation'
import type { GifItem } from '../types'

const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? ''
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs'
const GIPHY_LIMIT = 24

// Cache trending để không gọi lại GIPHY mỗi lần mở picker trong cùng phiên.
let trendingCache: GifItem[] | null = null

interface GiphyImage {
  url: string
  width?: string
  height?: string
}

interface GiphyImages {
  fixed_width?: GiphyImage
  original?: GiphyImage
}

interface GiphyResult {
  id: string
  title?: string
  images: GiphyImages
}

interface GiphyResponse {
  data: GiphyResult[]
}

function toGifItem(r: GiphyResult): GifItem | null {
  const preview = r.images.fixed_width?.url ?? r.images.original?.url
  const full = r.images.original?.url ?? r.images.fixed_width?.url
  if (!preview || !full) return null
  const fw = r.images.fixed_width
  return {
    id: r.id,
    preview,
    full,
    title: r.title,
    preview_width: fw?.width ? Number(fw.width) : undefined,
    preview_height: fw?.height ? Number(fw.height) : undefined,
  }
}

function giphyUrl(endpoint: string, query: string): string {
  const url = new URL(`${GIPHY_BASE}/${endpoint}`)
  url.searchParams.set('api_key', GIPHY_KEY)
  url.searchParams.set('limit', String(GIPHY_LIMIT))
  url.searchParams.set('rating', 'g')
  if (query.trim()) url.searchParams.set('q', query.trim())
  return url.toString()
}

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
  const [gifs, setGifs] = useState<GifItem[]>(() => trendingCache ?? [])
  const [loading, setLoading] = useState(() => trendingCache === null)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!GIPHY_KEY) return
    if (trendingCache) return
    const id = ++requestIdRef.current
    fetch(giphyUrl('trending', ''))
      .then((res) => res.json())
      .then((data: GiphyResponse) => {
        if (requestIdRef.current !== id) return
        const items = data.data.map(toGifItem).filter((g): g is GifItem => g !== null)
        trendingCache = items
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
      fetch(giphyUrl('search', term))
        .then((res) => res.json())
        .then((data: GiphyResponse) => {
          if (requestIdRef.current !== id) return
          setGifs(data.data.map(toGifItem).filter((g): g is GifItem => g !== null))
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