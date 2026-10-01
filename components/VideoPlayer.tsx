'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import styles from './VideoPlayer.module.css'

const HIDE_DELAY = 2500
const SEEK_STEP = 10
const SPEEDS = [0.5, 1, 1.25, 1.5, 2]

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VideoPlayer({ src }: { src: string }) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [volume, setVolume] = useState(1)
  const [speed, setSpeed] = useState(1)
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [pip, setPip] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(false)

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
  }, [])

  const startHideTimer = useCallback(() => {
    clearHideTimer()
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false)
      setSpeedMenuOpen(false)
    }, HIDE_DELAY)
  }, [clearHideTimer])

  const revealControls = useCallback(() => {
    setShowControls(true)
    if (playing) startHideTimer()
  }, [playing, startHideTimer])

  const togglePlay = useCallback((e?: React.SyntheticEvent) => {
    e?.stopPropagation()
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
      setPlaying(true)
      startHideTimer()
    } else {
      v.pause()
      setPlaying(false)
      setShowControls(true)
      clearHideTimer()
    }
  }, [startHideTimer, clearHideTimer])

  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current
    if (!v || !Number.isFinite(v.duration)) return
    v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || 0)
    setCurrentTime(v.currentTime)
  }, [])

  const applyVolume = useCallback((next: number, nextMuted: boolean) => {
    const v = videoRef.current
    if (!v) return
    v.volume = next
    v.muted = nextMuted
    setVolume(next)
    setMuted(nextMuted)
  }, [])

  const toggleMute = useCallback((e?: React.SyntheticEvent) => {
    e?.stopPropagation()
    const v = videoRef.current
    if (!v) return
    if (v.muted || v.volume === 0) {
      applyVolume(volume > 0 ? volume : 1, false)
    } else {
      applyVolume(v.volume, true)
    }
    if (playing) startHideTimer()
  }, [applyVolume, playing, startHideTimer, volume])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    applyVolume(Number(e.target.value), Number(e.target.value) === 0)
    if (playing) startHideTimer()
  }, [applyVolume, playing, startHideTimer])

  const handleSpeedSelect = useCallback((next: number) => {
    const v = videoRef.current
    if (v) v.playbackRate = next
    setSpeed(next)
    setSpeedMenuOpen(false)
    if (playing) startHideTimer()
  }, [playing, startHideTimer])

  const toggleFullscreen = useCallback((e?: React.SyntheticEvent) => {
    e?.stopPropagation()
    const v = videoRef.current
    if (!v) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      v.requestFullscreen()
    }
  }, [])

  const togglePip = useCallback((e?: React.SyntheticEvent) => {
    e?.stopPropagation()
    const v = videoRef.current
    if (!v) return
    if (document.pictureInPictureElement === v) {
      document.exitPictureInPicture()
    } else {
      v.requestPictureInPicture().catch(() => {})
    }
  }, [])

  const seekTo = useCallback((clientX: number, track: HTMLDivElement) => {
    const v = videoRef.current
    if (!v || !duration) return
    const rect = track.getBoundingClientRect()
    if (rect.width === 0) return
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    v.currentTime = ratio * duration
    setCurrentTime(v.currentTime)
  }, [duration])

  const handleSeekPointer = useCallback((e: React.PointerEvent<HTMLDivElement>, track: HTMLDivElement) => {
    e.stopPropagation()
    const move = (ev: PointerEvent) => seekTo(ev.clientX, track)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    seekTo(e.clientX, track)
  }, [seekTo])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key.toLowerCase() === 'k') {
      e.preventDefault()
      togglePlay()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      seekBy(SEEK_STEP)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      seekBy(-SEEK_STEP)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const v = videoRef.current
      if (v) applyVolume(Math.min(1, Math.round((v.volume + 0.1) * 100) / 100), false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const v = videoRef.current
      if (v) {
        const next = Math.max(0, Math.round((v.volume - 0.1) * 100) / 100)
        applyVolume(next, next === 0)
      }
    } else if (e.key.toLowerCase() === 'm') {
      toggleMute()
    } else if (e.key.toLowerCase() === 'f') {
      toggleFullscreen()
    } else if (e.key === 'Escape' && speedMenuOpen) {
      setSpeedMenuOpen(false)
    }
  }, [togglePlay, seekBy, applyVolume, toggleMute, toggleFullscreen, speedMenuOpen])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onEnter = () => setPip(true)
    const onLeave = () => setPip(false)
    v.addEventListener('enterpictureinpicture', onEnter)
    v.addEventListener('leavepictureinpicture', onLeave)
    return () => {
      v.removeEventListener('enterpictureinpicture', onEnter)
      v.removeEventListener('leavepictureinpicture', onLeave)
    }
  }, [])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTimeUpdate = () => setCurrentTime(v.currentTime)
    const onDurationChange = () => setDuration(v.duration || 0)
    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('loadedmetadata', onDurationChange)
    v.addEventListener('durationchange', onDurationChange)
    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate)
      v.removeEventListener('loadedmetadata', onDurationChange)
      v.removeEventListener('durationchange', onDurationChange)
    }
  }, [])

  useEffect(() => {
    if (!speedMenuOpen) return
    const close = () => setSpeedMenuOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [speedMenuOpen])

  useEffect(() => {
    return () => clearHideTimer()
  }, [clearHideTimer])

  useEffect(() => {
    startHideTimer()
  }, [startHideTimer])

  const progress = duration ? (currentTime / duration) * 100 : 0
  const volumeIcon = muted || volume === 0 ? 'bx-volume-mute' : volume < 0.5 ? 'bx-volume-low' : 'bx-volume-full'

  return (
    <div
      ref={containerRef}
      className={styles.player}
      tabIndex={0}
      role="region"
      aria-label={t('video.label')}
      onKeyDown={handleKeyDown}
      onMouseEnter={revealControls}
      onMouseMove={revealControls}
      onMouseLeave={() => { if (playing) startHideTimer() }}
    >
      <video
        ref={videoRef}
        src={src}
        muted={muted}
        playsInline
        loop
        autoPlay
        onPlay={() => setPlaying(true)}
        onError={() => setError(true)}
        className={styles.video}
        onClick={togglePlay}
      />

      {error && (
        <div className={styles.error} role="alert">
          <i className="bx bx-video-off" aria-hidden="true" />
          <span>{t('video.unavailable')}</span>
        </div>
      )}

      {showControls && (
        <div
          className={`${styles.overlay} ${playing ? '' : styles.paused}`}
          onClick={togglePlay}
        >
          {!playing && (
            <div className={styles.bigPlay} aria-hidden="true">
              <i className="bx bx-play" />
            </div>
          )}

          <div className={styles.seekRow} onClick={(e) => e.stopPropagation()}>
            <span className={styles.time}>{formatTime(currentTime)}</span>
            <div
              className={styles.seekTrack}
              role="slider"
              aria-label={t('video.seek')}
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(currentTime)}
              aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
              tabIndex={0}
              onPointerDown={(e) => handleSeekPointer(e, e.currentTarget)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); seekBy(5) }
                if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); seekBy(-5) }
              }}
            >
              <div className={styles.seekRail}>
                <div className={styles.seekFill} style={{ width: `${progress}%` }} />
                <div className={styles.seekThumb} style={{ left: `${progress}%` }} />
              </div>
            </div>
            <span className={styles.time}>{formatTime(duration)}</span>
          </div>

          <div className={styles.controlRow} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.btn} onClick={togglePlay} aria-label={playing ? t('video.pause') : t('video.play')} title={playing ? t('video.pause') : t('video.play')}>
              <i className={`bx ${playing ? 'bx-pause' : 'bx-play'}`} aria-hidden="true" />
            </button>

            <button type="button" className={styles.btn} onClick={() => seekBy(-SEEK_STEP)} aria-label={t('video.rewind')} title={t('video.rewind')}>
              <i className="bx bx-rotate-left" aria-hidden="true" />
            </button>
            <button type="button" className={styles.btn} onClick={() => seekBy(SEEK_STEP)} aria-label={t('video.forward')} title={t('video.forward')}>
              <i className="bx bx-rotate-right" aria-hidden="true" />
            </button>

            <div className={styles.volumeWrap}>
              <button type="button" className={styles.btn} onClick={toggleMute} aria-label={muted ? t('video.unmute') : t('video.mute')} title={muted ? t('video.unmute') : t('video.mute')} aria-pressed={!muted}>
                <i className={`bx ${volumeIcon}`} aria-hidden="true" />
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                onClick={(e) => e.stopPropagation()}
                className={styles.volumeSlider}
                aria-label={t('video.volume')}
              />
            </div>

            <div className={styles.spacer} />

            <div className={styles.speedWrap} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={`${styles.btn} ${styles.speedBtn}`}
                onClick={(e) => { e.stopPropagation(); setSpeedMenuOpen((v) => !v) }}
                aria-label={t('video.speed')}
                title={t('video.speed')}
                aria-haspopup="menu"
                aria-expanded={speedMenuOpen}
              >
                {speed}x
              </button>
              {speedMenuOpen && (
                <div className={styles.speedMenu} role="menu" aria-label={t('video.speed')}>
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="menuitemradio"
                      aria-checked={s === speed}
                      className={`${styles.speedItem} ${s === speed ? styles.active : ''}`}
                      onClick={() => handleSpeedSelect(s)}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {typeof document !== 'undefined' && document.pictureInPictureEnabled && (
              <button type="button" className={`${styles.btn} ${pip ? styles.activeBtn : ''}`} onClick={togglePip} aria-label={t('video.pip')} title={t('video.pip')} aria-pressed={pip}>
                <i className="bx bx-slideshow" aria-hidden="true" />
              </button>
            )}

            <button type="button" className={styles.btn} onClick={toggleFullscreen} aria-label={t('video.fullscreen')} title={t('video.fullscreen')}>
              <i className="bx bx-fullscreen" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
