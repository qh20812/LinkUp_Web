'use client'

import { useEffect, useRef, useState } from 'react'
import { useGroupCall } from '../../contexts/GroupCallContext'
import { useTranslation } from '../../hooks/useTranslation'
import styles from './GroupCallBubble.module.css'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function GroupCallBubble() {
  const { t } = useTranslation()
  const {
    phase,
    call,
    duration,
    localStream,
    localVideoOn,
    remoteStreams,
    expand,
    endGroupCall,
  } = useGroupCall()

  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)

  // Initialize position to bottom-right
  useEffect(() => {
    if (phase === 'minimized' && bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect()
      setPosition({
        x: window.innerWidth - rect.width - 24,
        y: window.innerHeight - rect.height - 24,
      })
    }
  }, [phase])

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPosition({
      x: Math.max(0, Math.min(window.innerWidth - 200, dragRef.current.posX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 80, dragRef.current.posY + dy)),
    })
  }

  const handlePointerUp = () => {
    setIsDragging(false)
    dragRef.current = null
  }

  if (phase !== 'minimized' || !call) return null

  const participantCount = call.participants.size
  // Show first remote stream thumbnail
  const firstRemoteEntry = Array.from(remoteStreams.entries())[0]
  const thumbnailStream = localVideoOn ? localStream : firstRemoteEntry?.[1]

  return (
    <div
      ref={bubbleRef}
      className={styles.bubble}
      style={{ left: position.x, top: position.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className={styles.thumbnail}>
        {thumbnailStream && localVideoOn ? (
          <video
            ref={(el) => {
              if (el) {
                el.srcObject = thumbnailStream
                el.play().catch(() => {})
              }
            }}
            autoPlay
            playsInline
            muted
            className={styles.thumbnailVideo}
          />
        ) : (
          <div className={styles.thumbnailPlaceholder}>
            <i className="bx bx-group" />
          </div>
        )}
      </div>

      <div className={styles.info}>
        <span className={styles.callName}>{t('groupCall.groupCall')}</span>
        <span className={styles.meta}>
          {formatDuration(duration)} · <i className="bx bx-group" /> {participantCount}
        </span>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.actionBtn}
          onClick={(e) => {
            e.stopPropagation()
            expand()
          }}
          aria-label={t('groupCall.expand')}
          title={t('groupCall.expand')}
        >
          <i className="bx bx-expand" />
        </button>
        <button
          className={`${styles.actionBtn} ${styles.endBtn}`}
          onClick={(e) => {
            e.stopPropagation()
            endGroupCall()
          }}
          aria-label={t('groupCall.end')}
          title={t('groupCall.end')}
        >
          <i className="bx bx-phone-off" />
        </button>
      </div>
    </div>
  )
}
