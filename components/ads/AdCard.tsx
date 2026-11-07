'use client'

import { useEffect, useRef, useState } from 'react'
import { trackAdAction } from '../../api/partner'
import type { FeedAd } from '../../api/partner'
import { useTranslation } from '../../hooks/useTranslation'
import styles from './AdCard.module.css'

/** Thời lượng tối thiểu card phải hiển thị ≥50% trước khi tính impression. */
const IMPRESSION_DELAY_MS = 1000

interface AdCardProps {
  ad: FeedAd
}

/**
 * Card quảng cáo trong feed: hỗ trợ image/video/carousel và tự gửi tracking
 * (impression khi visible 1s, video_start/video_end, swipe, click).
 * Impression không phụ thuộc ảnh load xong nên ad không media vẫn được tính.
 */
export default function AdCard({ ad }: AdCardProps) {
  const { t } = useTranslation()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const impressionSent = useRef(false)
  const videoStarted = useRef(false)
  const videoEnded = useRef(false)
  const [slide, setSlide] = useState(0)

  const listMedia = (ad.media_list ?? []).filter((m) => !!m.url)
  const items =
    listMedia.length > 0
      ? listMedia
      : ad.media_uri
        ? [{ url: ad.media_uri, media_type: 'image' }]
        : []
  const current = items[Math.min(slide, Math.max(items.length - 1, 0))]
  const isCarousel = ad.format === 'carousel' && items.length > 1
  const isVideo = current?.media_type === 'video' || ad.format === 'video'

  const track = (action: string) => {
    void trackAdAction(ad.id, action).catch(() => {})
  }

  // Impression: chỉ tính khi card hiển thị ≥50% liên tục 1 giây.
  useEffect(() => {
    const el = rootRef.current
    if (!el || impressionSent.current) return

    if (typeof IntersectionObserver === 'undefined') {
      impressionSent.current = true
      trackAdAction(ad.id, 'impression').catch(() => {})
      return
    }

    let timer: ReturnType<typeof setTimeout> | null = null
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (!timer && !impressionSent.current) {
              timer = setTimeout(() => {
                if (impressionSent.current) return
                impressionSent.current = true
                trackAdAction(ad.id, 'impression').catch(() => {})
              }, IMPRESSION_DELAY_MS)
            }
          } else if (timer) {
            clearTimeout(timer)
            timer = null
          }
        }
      },
      { threshold: [0, 0.5, 1] },
    )
    observer.observe(el)

    return () => {
      if (timer) clearTimeout(timer)
      observer.disconnect()
    }
  }, [ad.id])

  const goTo = (next: number) => {
    if (items.length === 0) return
    const normalized = (next + items.length) % items.length
    if (normalized === slide) return
    setSlide(normalized)
    track('swipe')
  }

  return (
    <div className={styles.card} ref={rootRef} data-testid="ad-card">
      <span className={styles.badge}>{t('ads.sponsored')}</span>

      {current && (
        <div className={styles.mediaWrap}>
          {isVideo ? (
            <video
              className={styles.media}
              src={current.url}
              controls
              muted
              playsInline
              preload="metadata"
              data-testid="ad-video"
              onPlay={() => {
                if (videoStarted.current) return
                videoStarted.current = true
                track('video_start')
              }}
              onEnded={() => {
                if (videoEnded.current) return
                videoEnded.current = true
                track('video_end')
              }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.media} src={current.url} alt={ad.title} />
          )}

          {isCarousel && (
            <>
              <button
                type="button"
                className={`${styles.nav} ${styles.prev}`}
                aria-label={t('ads.prevSlide')}
                onClick={() => goTo(slide - 1)}
              >
                <i className="bx bx-chevron-left" />
              </button>
              <button
                type="button"
                className={`${styles.nav} ${styles.next}`}
                aria-label={t('ads.nextSlide')}
                onClick={() => goTo(slide + 1)}
              >
                <i className="bx bx-chevron-right" />
              </button>
              <div className={styles.dots}>
                {items.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={t('ads.slideN', { n: String(idx + 1) })}
                    className={`${styles.dot} ${idx === slide ? styles.dotActive : ''}`}
                    onClick={() => goTo(idx)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className={styles.content}>
        <h4 className={styles.title}>{ad.title}</h4>
        <p className={styles.text}>{ad.content}</p>
        <a
          className={styles.cta}
          href={ad.target_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('click')}
        >
          {t('ads.learnMore')}
        </a>
      </div>
    </div>
  )
}
