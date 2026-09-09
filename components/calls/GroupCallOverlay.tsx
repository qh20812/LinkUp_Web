'use client'

import { useGroupCall } from '../../contexts/GroupCallContext'
import ParticipantTile from './ParticipantTile'
import ExternalImage from '../ExternalImage'
import { useTranslation } from '../../hooks/useTranslation'
import type { GroupCallParticipant } from '../../types/groupCall'
import styles from './GroupCallOverlay.module.css'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getGridClass(count: number): string {
  if (count <= 1) return styles.gridSingle
  if (count === 2) return styles.gridDouble
  if (count <= 4) return styles.gridQuad
  if (count <= 6) return styles.gridSix
  return styles.gridNine
}

export default function GroupCallOverlay() {
  const { t } = useTranslation()
  const {
    phase,
    call,
    duration,
    localStream,
    localMuted,
    localVideoOn,
    isCreator,
    remoteStreams,
    toggleMute,
    toggleVideo,
    endGroupCall,
    minimize,
    acceptJoinRequest,
    rejectJoinRequest,
  } = useGroupCall()

  if (phase !== 'active' || !call) return null

  const participants = Array.from(call.participants.values())
  const remoteParticipants = participants.filter(
    (p) => p.user_id !== call.callerId || remoteStreams.has(p.user_id),
  )
  // Always show local user
  const localParticipant: GroupCallParticipant = {
    user_id: '',
    display_name: 'Bạn',
    avatar_uri: '',
    muted: localMuted,
    video_enabled: localVideoOn,
    is_active: true,
  }

  const allParticipants = [localParticipant, ...remoteParticipants]
  const gridClass = getGridClass(allParticipants.length)

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <span className={styles.groupName}>
              {t('groupCall.groupCall')}
            </span>
            <span className={styles.duration}>
              {formatDuration(duration)}
            </span>
            <span className={styles.participantCount}>
              <i className="bx bx-group" />
              {allParticipants.length}
            </span>
          </div>
          <button
            className={styles.minimizeBtn}
            onClick={minimize}
            aria-label={t('groupCall.minimize')}
            title={t('groupCall.minimize')}
          >
            <i className="bx bx-chevrons-down" />
          </button>
        </div>

        <div className={`${styles.grid} ${gridClass}`}>
          {allParticipants.map((p, idx) => {
            const isLocal = idx === 0
            const stream = isLocal ? localStream ?? undefined : remoteStreams.get(p.user_id) ?? undefined
            return (
              <ParticipantTile
                key={isLocal ? 'local' : p.user_id}
                participant={p}
                stream={stream}
                isLocal={isLocal}
                isMirrored={isLocal}
              />
            )
          })}
        </div>

        <div className={styles.controls}>
          <button
            className={`${styles.controlBtn} ${localMuted ? styles.activeBtn : ''}`}
            onClick={toggleMute}
            aria-label={localMuted ? t('groupCall.unmute') : t('groupCall.mute')}
            title={localMuted ? t('groupCall.unmute') : t('groupCall.mute')}
          >
            <i className={localMuted ? 'bx bx-microphone-off' : 'bx bx-microphone'} />
          </button>

          <button
            className={`${styles.controlBtn} ${!localVideoOn ? styles.activeBtn : ''}`}
            onClick={toggleVideo}
            aria-label={localVideoOn ? t('groupCall.videoOff') : t('groupCall.videoOn')}
            title={localVideoOn ? t('groupCall.videoOff') : t('groupCall.videoOn')}
          >
            <i className={localVideoOn ? 'bx bx-video' : 'bx bx-video-off'} />
          </button>

          <button
            className={`${styles.controlBtn} ${styles.endBtn}`}
            onClick={endGroupCall}
            aria-label={t('groupCall.end')}
            title={t('groupCall.end')}
          >
            <i className="bx bx-phone-off" />
          </button>
        </div>

        {isCreator && call.pendingRequests.length > 0 && (
          <div className={styles.pendingBar}>
            {call.pendingRequests.map((uid) => (
              <PendingRequest
                key={uid}
                displayName={call.participants.get(uid)?.display_name || uid}
                avatarUri={call.participants.get(uid)?.avatar_uri || ''}
                onAccept={() => acceptJoinRequest(uid)}
                onReject={() => rejectJoinRequest(uid)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PendingRequest({
  displayName,
  avatarUri,
  onAccept,
  onReject,
}: {
  displayName: string
  avatarUri: string
  onAccept: () => void
  onReject: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className={styles.pendingItem}>
      <div className={styles.pendingUser}>
        {avatarUri ? (
          <ExternalImage src={avatarUri} alt="" className={styles.pendingAvatar} />
        ) : (
          <div className={styles.pendingAvatarPlaceholder}>
            {displayName[0]?.toUpperCase()}
          </div>
        )}
        <span className={styles.pendingName}>{displayName}</span>
      </div>
      <div className={styles.pendingActions}>
        <button
          className={styles.pendingAccept}
          onClick={onAccept}
          aria-label={t('groupCall.accept')}
        >
          <i className="bx bx-check" />
        </button>
        <button
          className={styles.pendingReject}
          onClick={onReject}
          aria-label={t('groupCall.reject')}
        >
          <i className="bx bx-x" />
        </button>
      </div>
    </div>
  )
}
