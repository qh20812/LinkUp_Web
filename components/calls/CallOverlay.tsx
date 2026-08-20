'use client'

import { useEffect, useRef, useState } from 'react'
import ExternalImage from '../ExternalImage'
import { useCall } from '../../contexts/CallContext'
import { useTranslation } from '../../hooks/useTranslation'
import type { CallStatus } from '../../types'
import styles from './CallOverlay.module.css'

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

const STATUS_LABELS: Record<CallStatus, string> = {
  calling: 'statusCalling',
  ringing: 'statusRinging',
  connected: 'statusConnected',
  ended: 'statusEnded',
  missed: 'statusMissed',
  rejected: 'statusRejected',
  busy: 'statusBusy',
  cancelled: 'statusCancelled',
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function CallOverlay() {
  const { t } = useTranslation()
  const {
    phase,
    call,
    lastStatus,
    duration,
    localStream,
    remoteStream,
    localMuted,
    localVideoOn,
    remoteMuted,
    remoteVideoOn,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    dismiss,
  } = useCall()

  const [minimized, setMinimized] = useState(false)
  const callId = call?.callId ?? null
  const prevCallIdRef = useRef(callId)
  if (prevCallIdRef.current !== callId) {
    prevCallIdRef.current = callId
    setMinimized(false)
  }

  if (phase === 'idle' || !call) return null

  const isVideo = call.callType === 'video'
  const isIncoming = phase === 'incoming'
  const isOutgoing = phase === 'outgoing'
  const isActive = phase === 'active'
  const isEnded = phase === 'ended'

  const peerName = call.peer.display_name || t('call.unknown')
  const statusLabel = lastStatus
    ? t(`call.${STATUS_LABELS[lastStatus]}`)
    : isIncoming
      ? isVideo
        ? t('call.incomingVideo')
        : t('call.incomingVoice')
      : isOutgoing
        ? t('call.outgoing')
        : isActive
          ? isVideo
            ? t('call.inCallVideo')
            : t('call.inCallVoice')
          : ''

  if (minimized && isActive) {
    return (
      <div
        className={styles.miniBar}
        role="dialog"
        aria-label={isVideo ? t('call.inCallVideo') : t('call.inCallVoice')}
      >
        {isVideo && remoteStream && remoteVideoOn ? (
          <div className={styles.miniThumb}>
            <VideoFeed stream={remoteStream} className={styles.miniVideo} />
          </div>
        ) : (
          <div className={styles.miniAvatar}>
            {call.peer.avatar_uri ? (
              <ExternalImage src={call.peer.avatar_uri} alt="" />
            ) : (
              <i className="bx bxs-user" />
            )}
          </div>
        )}
        <div className={styles.miniInfo}>
          <span className={styles.miniName}>{peerName}</span>
          <span className={styles.miniStatus}>
            {formatDuration(duration)}
            {remoteMuted && (
              <i className={`bx bx-microphone-off ${styles.remoteMutedIcon}`} />
            )}
          </span>
        </div>
        <div className={styles.miniControls}>
          <button
            className={`${styles.miniBtn} ${localMuted ? styles.activeBtn : ''}`}
            onClick={toggleMute}
            aria-label={localMuted ? t('call.unmute') : t('call.mute')}
            title={localMuted ? t('call.unmute') : t('call.mute')}
          >
            <i className={localMuted ? 'bx bx-microphone-off' : 'bx bx-microphone'} />
          </button>
          {isVideo && (
            <button
              className={`${styles.miniBtn} ${!localVideoOn ? styles.activeBtn : ''}`}
              onClick={toggleVideo}
              aria-label={localVideoOn ? t('call.videoOff') : t('call.videoOn')}
              title={localVideoOn ? t('call.videoOff') : t('call.videoOn')}
            >
              <i className={localVideoOn ? 'bx bx-video' : 'bx bx-video-off'} />
            </button>
          )}
          <button
            className={styles.miniBtn}
            onClick={() => setMinimized(false)}
            aria-label={t('call.expand')}
            title={t('call.expand')}
          >
            <i className="bx bx-expand" />
          </button>
          <button
            className={`${styles.miniBtn} ${styles.miniEnd}`}
            onClick={endCall}
            aria-label={t('call.end')}
            title={t('call.end')}
          >
            <i className="bx bx-phone-off" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.panel}>
        {isVideo && isActive && remoteStream ? (
          <div className={styles.videoStage}>
            {remoteVideoOn ? (
              <VideoFeed stream={remoteStream} className={styles.remoteVideo} />
            ) : (
              <div className={styles.remoteOff}>
                <span className={styles.bigAvatar}>
                  {call.peer.avatar_uri ? (
                    <ExternalImage src={call.peer.avatar_uri} alt="" />
                  ) : (
                    <i className="bx bxs-user" />
                  )}
                </span>
              </div>
            )}
            {isActive && localStream && localVideoOn && (
              <div className={styles.selfPreview}>
                <VideoFeed stream={localStream} muted mirrored />
              </div>
            )}
          </div>
        ) : (
          <div className={styles.avatarWrap}>
            {call.peer.avatar_uri ? (
              <ExternalImage src={call.peer.avatar_uri} alt="" className={styles.avatar} />
            ) : (
              <span className={styles.avatarFallback}>
                <i className="bx bxs-user" />
              </span>
            )}
          </div>
        )}

        <div className={styles.name}>{peerName}</div>
        <div className={styles.status}>
          {statusLabel}
          {isActive && remoteMuted && (
            <i className={`bx bx-microphone-off ${styles.remoteMutedIcon}`} />
          )}
        </div>

        {isActive && (
          <div className={styles.duration}>{formatDuration(duration)}</div>
        )}

        <div className={styles.controls}>
          {isIncoming && (
            <>
              <button
                className={`${styles.controlBtn} ${styles.acceptBtn}`}
                onClick={() => void acceptCall()}
                aria-label={t('call.accept')}
                title={t('call.accept')}
              >
                <i className="bx bx-phone-call" />
              </button>
              <button
                className={`${styles.controlBtn} ${styles.rejectBtn}`}
                onClick={rejectCall}
                aria-label={t('call.reject')}
                title={t('call.reject')}
              >
                <i className="bx bx-phone-off" />
              </button>
            </>
          )}

          {isOutgoing && (
            <button
              className={`${styles.controlBtn} ${styles.rejectBtn}`}
              onClick={endCall}
              aria-label={t('call.cancel')}
              title={t('call.cancel')}
            >
              <i className="bx bx-phone-off" />
            </button>
          )}

          {isActive && (
            <>
              <button
                className={`${styles.controlBtn} ${localMuted ? styles.activeBtn : ''}`}
                onClick={toggleMute}
                aria-label={localMuted ? t('call.unmute') : t('call.mute')}
                title={localMuted ? t('call.unmute') : t('call.mute')}
              >
                <i className={localMuted ? 'bx bx-microphone-off' : 'bx bx-microphone'} />
              </button>
              {isVideo && (
                <button
                  className={`${styles.controlBtn} ${!localVideoOn ? styles.activeBtn : ''}`}
                  onClick={toggleVideo}
                  aria-label={localVideoOn ? t('call.videoOff') : t('call.videoOn')}
                  title={localVideoOn ? t('call.videoOff') : t('call.videoOn')}
                >
                  <i className={localVideoOn ? 'bx bx-video' : 'bx bx-video-off'} />
                </button>
              )}
              <button
                className={styles.controlBtn}
                onClick={() => setMinimized(true)}
                aria-label={t('call.minimize')}
                title={t('call.minimize')}
              >
                <i className="bx bx-chevrons-down" />
              </button>
              <button
                className={`${styles.controlBtn} ${styles.endBtn}`}
                onClick={endCall}
                aria-label={t('call.end')}
                title={t('call.end')}
              >
                <i className="bx bx-phone-off" />
              </button>
            </>
          )}

          {isEnded && (
            <button
              className={`${styles.controlBtn} ${styles.rejectBtn}`}
              onClick={dismiss}
              aria-label={t('common.close')}
              title={t('common.close')}
            >
              <i className="bx bx-x" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export { VideoFeed }
