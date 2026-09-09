'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

const HIDE_DELAY = 2500

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
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
    hideTimerRef.current = setTimeout(() => setShowControls(false), HIDE_DELAY)
  }, [clearHideTimer])

  const revealControls = useCallback(() => {
    setShowControls(true)
    if (playing) startHideTimer()
  }, [playing, startHideTimer])

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
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

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
    if (playing) startHideTimer()
  }, [playing, startHideTimer])

  const toggleFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      v.requestFullscreen()
    }
  }, [])

  const togglePip = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
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
    return () => clearHideTimer()
  }, [clearHideTimer])

  useEffect(() => {
    startHideTimer()
  }, [startHideTimer])

  return (
    <div
      className="videoPlayer"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#000',
      }}
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
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        onClick={togglePlay}
      />

      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-secondary)',
            fontSize: 14,
          }}
        >
          <i className="bx bx-video-off" style={{ fontSize: 48, marginBottom: 8 }} />
          <span>Video not available</span>
        </div>
      )}

      {showControls && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'center',
            background: playing ? 'linear-gradient(transparent 60%, rgba(0,0,0,0.5))' : 'rgba(0,0,0,0.25)',
            transition: 'opacity 0.2s',
            cursor: 'pointer',
          }}
          onClick={togglePlay}
        >
          {!playing && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 28,
                pointerEvents: 'none',
              }}
            >
              <i className="bx bx-play" />
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '2px 10px',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{ color: '#fff', fontSize: 11, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {formatTime(currentTime)}
            </span>
            <div
              onPointerDown={(e) => handleSeekPointer(e, e.currentTarget)}
              style={{
                flex: 1,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                touchAction: 'none',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.3)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    borderRadius: 2,
                    background: '#fff',
                    width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${duration ? (currentTime / duration) * 100 : 0}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#fff',
                  }}
                />
              </div>
            </div>
            <span style={{ color: '#fff', fontSize: 11, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {formatTime(duration)}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '4px 6px',
              width: '100%',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                fontSize: 20,
                opacity: 0.9,
              }}
              onClick={togglePlay}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <i className={`bx ${playing ? 'bx-pause' : 'bx-play'}`} />
            </button>

            <button
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                fontSize: 20,
                opacity: 0.9,
              }}
              onClick={toggleMute}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <i className={`bx ${muted ? 'bx-volume-mute' : 'bx-volume-full'}`} />
            </button>

            <div style={{ flex: 1 }} />

            {typeof document !== 'undefined' && document.pictureInPictureEnabled && (
              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  fontSize: 20,
                  opacity: pip ? 1 : 0.9,
                }}
                onClick={togglePip}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <i className="bx bx-slideshow" />
              </button>
            )}

            <button
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                fontSize: 20,
                opacity: 0.9,
              }}
              onClick={toggleFullscreen}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <i className="bx bx-fullscreen" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
