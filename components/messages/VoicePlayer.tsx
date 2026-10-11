'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { formatCallDuration } from '../../utils/chat'
import styles from './VoicePlayer.module.css'

const BAR_COUNT = 32
const SPEEDS = [1, 1.5, 2]
const SEEK_STEP = 5
/** A player that starts dispatches this so every other instance pauses. */
const PLAY_EVENT = 'linkup:voice-play'

/** Decoded peak cache — scrolling back never re-decodes the same audio. */
const peaksCache = new Map<string, number[]>()

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

async function decodePeaks(src: string): Promise<number[]> {
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
    const max = Math.max(...bars)
    return bars.map((b) => (max > 0 ? Math.max(0.15, b / max) : 0.5))
  } finally {
    void ctx.close()
  }
}

function useVoicePeaks(key: string, src: string): { peaks: number[] | null; decoding: boolean } {
  const [peaks, setPeaks] = useState<number[] | null>(() => peaksCache.get(key) ?? null)

  useEffect(() => {
    if (!src || peaksCache.has(key)) return
    let cancelled = false
    decodePeaks(src)
      .then((p) => {
        if (cancelled) return
        peaksCache.set(key, p)
        setPeaks(p)
      })
      .catch(() => {
        if (cancelled) return
        // Offline/corrupt decode — deterministic hash so the UI never breaks.
        const fb = hashPeaks(key)
        peaksCache.set(key, fb)
        setPeaks(fb)
      })
    return () => {
      cancelled = true
    }
  }, [key, src])

  return { peaks, decoding: peaks === null && src !== '' }
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
  const [total, setTotal] = useState(duration && duration > 0 ? duration : 0)
  const [rateIdx, setRateIdx] = useState(0)
  const { peaks, decoding } = useVoicePeaks(cacheKey, src)

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
      if (!(duration && duration > 0) && Number.isFinite(audio.duration) && audio.duration > 0) {
        setTotal(audio.duration)
      }
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnd = () => {
      setPlaying(false)
      setElapsed(0)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnd)
    }
  }, [duration])

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

  return (
    <span
      className={`${styles.player} ${mine ? styles.mine : styles.theirs}${flat ? ` ${styles.flat}` : ''}`}
      role="group"
      aria-label={t('chat.voiceMessage')}
    >
      <button
        type="button"
        className={styles.playBtn}
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
