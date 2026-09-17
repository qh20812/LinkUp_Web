'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import { useAuth } from '../../hooks/useAuth'
import { formatCallDuration } from '../../utils/chat'
import styles from './ChatWindow.module.css'

const WAVEFORM_BAR_COUNT = 35

function generateHashWaveform(seed: string): number[] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  const bars: number[] = []
  for (let i = 0; i < WAVEFORM_BAR_COUNT; i++) {
    hash = ((hash * 16807) + 12345) | 0
    const h = 0.2 + (Math.abs(hash) % 80) / 100
    bars.push(h)
  }
  return bars
}

function useWaveform(src: string): number[] {
  const [heights, setHeights] = useState<number[]>(() =>
    generateHashWaveform(src || 'default'),
  )

  useEffect(() => {
    if (!src) return
    let cancelled = false
    const ctx = new AudioContext()
    fetch(src)
      .then((res) => res.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((audioBuffer) => {
        if (cancelled) return
        const raw = audioBuffer.getChannelData(0)
        const step = Math.floor(raw.length / WAVEFORM_BAR_COUNT)
        const bars: number[] = []
        for (let i = 0; i < WAVEFORM_BAR_COUNT; i++) {
          let sum = 0
          const start = i * step
          for (let j = 0; j < step; j++) {
            sum += Math.abs(raw[start + j])
          }
          bars.push(sum / step)
        }
        const max = Math.max(...bars)
        setHeights(bars.map((b) => Math.max(0.2, max > 0 ? b / max : 0.5)))
      })
      .catch(() => {
        if (!cancelled) setHeights(generateHashWaveform(src))
      })
    return () => {
      cancelled = true
      void ctx.close()
    }
  }, [src])

  return heights
}

interface VoicePlayerProps {
  src: string
  duration?: number
  mine?: boolean
}

export default function VoicePlayer({ src, duration, mine: mineProp }: VoicePlayerProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const mine = mineProp ?? user?.user_id
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const waveformHeights = useWaveform(src)

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      void audio.play().catch(() => setPlaying(false))
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      const d = audio.duration || 0
      setElapsed(audio.currentTime)
      setProgress(d > 0 ? audio.currentTime / d : 0)
    }
    const onEnd = () => {
      setPlaying(false)
      setElapsed(0)
      setProgress(0)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('play', () => setPlaying(true))
    audio.addEventListener('pause', () => setPlaying(false))
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('play', () => setPlaying(true))
      audio.removeEventListener('pause', () => setPlaying(false))
    }
  }, [])

  const shown = duration && duration > 0
    ? Math.max(Math.round(elapsed), duration)
    : Math.round(elapsed)

  return (
    <span
      className={`${styles.voiceBubble} ${mine ? styles.voiceMine : ''}`}
      role="group"
      aria-label={t('chat.voiceMessage')}
    >
      <button
        type="button"
        className={styles.voicePlayBtn}
        onClick={toggle}
        aria-label={playing ? t('chat.pause') : t('chat.play')}
        title={playing ? t('chat.pause') : t('chat.play')}
      >
        <i className={playing ? 'bx bx-pause' : 'bx bx-play'} />
      </button>
      <span className={styles.voiceWaveform}>
        {waveformHeights.map((h, i) => {
          const played = i / waveformHeights.length <= progress
          return (
            <span
              key={i}
              className={`${styles.voiceWaveBar} ${played ? styles.voiceWaveBarPlayed : ''}`}
              style={{ height: `${h * 100}%` }}
            />
          )
        })}
      </span>
      <span className={styles.voiceDuration}>{formatCallDuration(shown)}</span>
      <audio ref={audioRef} src={src} preload="metadata" />
    </span>
  )
}
