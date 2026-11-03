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
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null)
  // Ref (không phải state) để quyết định trong pointermove ngay lập tức, không
  // phụ thuộc vào việc React đã commit state hay chưa.
  const draggingRef = useRef(false)
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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Không bắt đầu kéo khi bấm vào nút điều khiển. Nếu gọi setPointerCapture
    // ở đây, pointerup sẽ bị retarget về bubble và trình duyệt phát `click`
    // cho bubble thay vì button — nút "Mở rộng" không bao giờ chạy.
    if ((e.target as HTMLElement).closest('button')) return

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return

    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY

    // Chỉ biến thành thao tác kéo sau khi vượt ngưỡng, để một cú click thường
    // không bị nuốt thành drag.
    if (!draggingRef.current) {
      if (Math.hypot(dx, dy) < 4) return
      draggingRef.current = true
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }

    setPosition({
      x: Math.max(0, Math.min(window.innerWidth - 200, drag.posX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 80, drag.posY + dy)),
    })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    dragRef.current = null
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
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
      onPointerCancel={handlePointerUp}
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
