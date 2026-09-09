'use client'

import { useEffect, useRef } from 'react'
import ExternalImage from '../ExternalImage'
import type { GroupCallParticipant } from '../../types/groupCall'
import styles from './ParticipantTile.module.css'

interface ParticipantTileProps {
  participant: GroupCallParticipant
  stream?: MediaStream
  isLocal?: boolean
  isMirrored?: boolean
  className?: string
}

function VideoFeed({
  stream,
  muted = false,
  mirrored = false,
  className,
}: {
  stream: MediaStream
  muted?: boolean
  mirrored?: boolean
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.srcObject = stream
    el.play().catch(() => {})
    return () => {
      el.srcObject = null
    }
  }, [stream])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`${styles.video}${mirrored ? ` ${styles.mirrored}` : ''}${className ? ` ${className}` : ''}`}
    />
  )
}

export default function ParticipantTile({
  participant,
  stream,
  isLocal = false,
  isMirrored = false,
  className,
}: ParticipantTileProps) {
  const showVideo =
    (isLocal ? true : participant.video_enabled) && stream != null

  return (
    <div
      className={`${styles.tile}${className ? ` ${className}` : ''}`}
      data-active={participant.is_active || isLocal}
    >
      {showVideo ? (
        <VideoFeed
          stream={stream!}
          muted={isLocal}
          mirrored={isLocal && isMirrored}
          className={styles.videoFeed}
        />
      ) : (
        <div className={styles.avatarWrap}>
          {participant.avatar_uri ? (
            <ExternalImage
              src={participant.avatar_uri}
              alt=""
              className={styles.avatar}
            />
          ) : (
            <span className={styles.avatarFallback}>
              <i className="bx bxs-user" />
            </span>
          )}
        </div>
      )}

      <div className={styles.overlay}>
        <div className={styles.nameRow}>
          <span className={styles.name}>
            {isLocal ? 'Bạn' : participant.display_name}
          </span>
          {(isLocal ? participant.muted : participant.muted) && (
            <i className={`bx bx-microphone-off ${styles.mutedIcon}`} />
          )}
          {!participant.video_enabled && !isLocal && (
            <i className={`bx bx-video-off ${styles.videoOffIcon}`} />
          )}
        </div>
      </div>

      {!participant.is_active && !isLocal && (
        <div className={styles.connectingOverlay}>
          <div className={styles.connectingDots}>
            <span />
            <span />
            <span />
          </div>
        </div>
      )}
    </div>
  )
}

export { VideoFeed }
