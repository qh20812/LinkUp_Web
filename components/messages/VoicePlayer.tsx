'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { formatCallDuration } from '../../utils/chat'
import styles from './VoicePlayer.module.css'

const BAR_COUNT = 48
const SPEEDS = [1, 1.5, 2]
const SEEK_STEP = 5
/** Rendered floor for silent buckets — low enough to read as silence. */
const WAVE_FLOOR = 0.08
/** A player that starts dispatches this so every other instance pauses. */
const PLAY_EVENT = 'linkup:voice-play'

/** Decoded peak cache — scrolling back never re-decodes the same audio. */
const peaksCache = new Map<string, { peaks: number[]; duration: number }>()

function hashPeaks(seed: string): number[] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  const bars: number[] = []
  for (let i = 0; i < BAR_COUNT; i++) {
    hash = (hash * 16807 + 12345) | 0
    bars.push(0.15 + (Math.abs(hash) % 85) / 100)
  }
  return bars
}

/**
 * Perceptual normalization for mean-amplitude buckets: sqrt expands quiet
 * passages so loud/soft differences stay visible, floor keeps silence
 * rendered instead of vanishing. Pure — unit-tested.
 */
export function normalizePeaks(means: number[]): number[] {
  const max = Math.max(0, ...means)
  if (max <= 0) return means.map(() => WAVE_FLOOR)
  return means.map((b) => Math.max(WAVE_FLOOR, Math.sqrt(Math.max(0, b) / max)))
}

/** Drop a cached peak set (e.g. before re-decoding a swapped media URL). */
export function invalidateVoicePeaks(key: string): void {
  peaksCache.delete(key)
}

/**
 * Total-duration precedence: explicit prop wins, then the exact duration
 * from the decoded buffer (immune to the MediaRecorder-webm Infinity
 * metadata bug), then whatever the element reports. Pure — unit-tested.
 */
export function resolveTotal(prop: number, decoded: number, meta: number): number {
  if (prop > 0) return prop
  if (decoded > 0) return decoded
  return meta
}

async function decodePeaks(src: string): Promise<{ peaks: number[]; duration: number }> {
  const Ctx: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) throw new Error('no-webaudio')
  const ctx = new Ctx()
  try {
    const res = await fetch(src)
    const buf = await res.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(buf)
    const raw = audioBuffer.getChannelData(0)
    const step = Math.max(1, Math.floor(raw.length / BAR_COUNT))
    const bars: number[] = []
    for (let i = 0; i < BAR_COUNT; i++) {
      let sum = 0
      const start = i * step
      const end = Math.min(start + step, raw.length)
      for (let j = start; j < end; j++) sum += Math.abs(raw[j])
      bars.push(sum / Math.max(1, end - start))
    }
    return { peaks: normalizePeaks(bars), duration: audioBuffer.duration }
  } finally {
    void ctx.close()
  }
}

function useVoicePeaks(key: string, src: string, bust: number): {
  peaks: number[] | null
  decodedDuration: number
  decoding: boolean
} {
  const cached = peaksCache.get(key)
  const [peaks, setPeaks] = useState<number[] | null>(() => cached?.peaks ?? null)
  const [decodedDuration, setDecodedDuration] = useState(() => cached?.duration ?? 0)

  useEffect(() => {
    if (!src || peaksCache.has(key)) return
    let cancelled = false
    decodePeaks(src)
      .then(({ peaks: p, duration: d }) => {
        if (cancelled) return
        peaksCache.set(key, { peaks: p, duration: d })
        setPeaks(p)
        setDecodedDuration(d)
      })
      .catch(() => {
        if (cancelled) return
        // Offline/corrupt decode — deterministic hash so the UI never breaks.
        const fb = hashPeaks(key)
        peaksCache.set(key, { peaks: fb, duration: 0 })
        setPeaks(fb)
      })
    return () => {
      cancelled = true
    }
  }, [key, src, bust])

  return { peaks, decodedDuration, decoding: peaks === null && src !== '' }
}

interface VoicePlayerProps {
  src: string
  duration?: number
  /** true = own message (turquoise bubble styling). Required — no guessing. */
  mine: boolean
  /** Stable cache key for decoded peaks (message id). Defaults to src. */
  messageKey?: string
  /** Transparent chrome for the Composer preview pill (has its own surface). */
  flat?: boolean
}

export default function VoicePlayer({ src, duration, mine, messageKey, flat = false }: VoicePlayerProps) {
  const { t } = useTranslation()
  const instanceId = useId()
  const cacheKey = messageKey ?? src
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const waveRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)

  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [metaTotal, setMetaTotal] = useState(0)
  const [buffering, setBuffering] = useState(false)
  const [rateIdx, setRateIdx] = useState(0)
  const [failed, setFailed] = useState(false)
  const [decodeBust, setDecodeBust] = useState(0)
  const { peaks, decodedDuration, decoding } = useVoicePeaks(cacheKey, src, decodeBust)

  const propTotal = duration && duration > 0 ? duration : 0
  const total = resolveTotal(propTotal, decodedDuration, metaTotal)

  // Fresh src (e.g. staging→CDN swap) resets a previous failure — keyed
  // adjust-during-render, never setState-in-effect.
  const [trackedSrc, setTrackedSrc] = useState(src)
  if (trackedSrc !== src) {
    setTrackedSrc(src)
    setFailed(false)
    invalidateVoicePeaks(cacheKey)
  }

  const retry = useCallback(() => {
    invalidateVoicePeaks(cacheKey)
    setFailed(false)
    setDecodeBust((v) => v + 1)
    audioRef.current?.load()
  }, [cacheKey])

  const progress = total > 0 ? Math.min(1, Math.max(0, elapsed / total)) : 0

  // Single-playback: starting one player pauses every other instance.
  useEffect(() => {
    const onOtherPlay = (e: Event) => {
      if ((e as CustomEvent<string>).detail === instanceId) return
      audioRef.current?.pause()
    }
    window.addEventListener(PLAY_EVENT, onOtherPlay)
    return () => window.removeEventListener(PLAY_EVENT, onOtherPlay)
  }, [instanceId])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setElapsed(audio.currentTime)
    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setMetaTotal(audio.duration)
      }
    }
    const onPlay = () => {
      setPlaying(true)
      setBuffering(false)
    }
    const onPause = () => {
      setPlaying(false)
      setBuffering(false)
    }
    const onWaiting = () => setBuffering(true)
    const onCanPlay = () => setBuffering(false)
    const onError = () => {
      setPlaying(false)
      setBuffering(false)
      setFailed(true)
    }
    const onEnd = () => {
      setPlaying(false)
      setBuffering(false)
      setElapsed(0)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('error', onError)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('ended', onEnd)
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[rateIdx]
  }, [rateIdx])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      window.dispatchEvent(new CustomEvent<string>(PLAY_EVENT, { detail: instanceId }))
      void audio.play().catch(() => setPlaying(false))
    }
  }, [playing, instanceId])

  const seekRatio = useCallback(
    (ratio: number) => {
      const audio = audioRef.current
      if (!audio || !Number.isFinite(total) || total <= 0) return
      const clamped = Math.min(1, Math.max(0, ratio))
      audio.currentTime = clamped * total
      setElapsed(audio.currentTime)
    },
    [total],
  )

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = waveRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0) return
      seekRatio((clientX - rect.left) / rect.width)
    },
    [seekRatio],
  )

  const onWaveKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const audio = audioRef.current
      if (audio) seekRatio((elapsed + SEEK_STEP) / Math.max(1, total))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const audio = audioRef.current
      if (audio) seekRatio((elapsed - SEEK_STEP) / Math.max(1, total))
    } else if (e.key === 'Home') {
      e.preventDefault()
      seekRatio(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      seekRatio(1)
    }
  }

  const rate = SPEEDS[rateIdx]
  const timeText = total > 0 ? `${formatCallDuration(Math.floor(elapsed))} / ${formatCallDuration(Math.floor(total))}` : '--:--'

  if (failed) {
    return (
      <span
        className={`${styles.player} ${mine ? styles.mine : styles.theirs}${flat ? ` ${styles.flat}` : ''}`}
        role="alert"
      >
        <span className={styles.voiceError}>
          <i className="bx bx-error-circle" aria-hidden="true" />
          <span className={styles.voiceErrorText}>{t('chat.voiceLoadFailed')}</span>
          <button type="button" className={styles.voiceRetryBtn} onClick={retry}>
            {t('common.retry')}
          </button>
        </span>
      </span>
    )
  }

  return (
    <span
      className={`${styles.player} ${mine ? styles.mine : styles.theirs}${flat ? ` ${styles.flat}` : ''}`}
      role="group"
      aria-label={t('chat.voiceMessage')}
    >
      <button
        type="button"
        className={`${styles.playBtn}${buffering ? ` ${styles.buffering}` : ''}`}
        onClick={toggle}
        data-tooltip={playing ? t('chat.pause') : t('chat.play')}
        aria-label={playing ? t('chat.pause') : t('chat.play')}
      >
        <i className={playing ? 'bx bx-pause' : 'bx bx-play'} aria-hidden="true" />
      </button>
      <span className={styles.body}>
        <span
          ref={waveRef}
          className={styles.wave}
          role="slider"
          tabIndex={0}
          aria-label={t('chat.voiceMessage')}
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(elapsed)}
          aria-valuetext={timeText}
          onPointerDown={(e) => {
            draggingRef.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            seekFromClientX(e.clientX)
          }}
          onPointerMove={(e) => {
            if (draggingRef.current) seekFromClientX(e.clientX)
          }}
          onPointerUp={() => {
            draggingRef.current = false
          }}
          onPointerCancel={() => {
            draggingRef.current = false
          }}
          onKeyDown={onWaveKeyDown}
        >
          {decoding && !peaks ? (
            <span className={styles.skeleton} aria-hidden="true">
              {Array.from({ length: BAR_COUNT }).map((_, i) => (
                <span key={i} className={styles.skeletonBar} style={{ animationDelay: `${(i % 8) * 90}ms` }} />
              ))}
            </span>
          ) : (
            (peaks ?? hashPeaks(cacheKey)).map((h, i) => {
              const played = i / BAR_COUNT <= progress
              return (
                <span
                  key={i}
                  className={`${styles.bar} ${played ? styles.barPlayed : ''}`}
                  style={{ height: `${Math.round(h * 100)}%` }}
                  aria-hidden="true"
                />
              )
            })
          )}
        </span>
        <span className={styles.meta}>
          <span className={styles.time}>{timeText}</span>
          <button
            type="button"
            className={styles.speedBtn}
            onClick={() => setRateIdx((v) => (v + 1) % SPEEDS.length)}
            data-tooltip={t('chat.playbackRate', { rate: String(SPEEDS[rateIdx]) })}
            aria-label={t('chat.playbackRate', { rate: String(SPEEDS[rateIdx]) })}
          >
            {rate}x
          </button>
        </span>
      </span>
      <audio ref={audioRef} src={src} preload="metadata" />
    </span>
  )
}
