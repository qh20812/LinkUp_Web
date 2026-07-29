'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

const HIDE_DELAY = 2500

export default function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const [pip, setPip] = useState(false)

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
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onClick={togglePlay}
      />

      {showControls && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: playing ? 'flex-end' : 'center',
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
