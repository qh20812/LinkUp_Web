'use client'

import { useTranslation } from '../../hooks/useTranslation'
import { formatChatTime } from '../../utils/chat'
import type { GroupCallHistoryItem } from '../../types/groupCall'
import styles from './GroupCallMessage.module.css'

interface GroupCallMessageProps {
  call: GroupCallHistoryItem
  myUserId: string
  memberNames?: Map<string, { display_name: string; avatar_uri: string }>
  isMine: boolean
  isActive: boolean
  onRequestJoin: (callId: string) => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function GroupCallMessage({
  call,
  myUserId,
  memberNames,
  isMine,
  isActive,
  onRequestJoin,
}: GroupCallMessageProps) {
  const { t } = useTranslation()

  const callerName = memberNames?.get(call.caller_id)?.display_name || t('chat.unknown')

  const duration =
    call.ended_at && call.created_at
      ? Math.floor(
          (new Date(call.ended_at).getTime() - new Date(call.created_at).getTime()) / 1000,
        )
      : 0

  const isMissed = call.status === 'missed'
  const isEnded = call.status === 'ended'
  const isCancelled = call.status === 'cancelled'

  const label = isMissed
    ? t('call.historyMissed')
    : isEnded
      ? `${t('call.statusEnded')} • ${callerName}`
      : isCancelled
        ? `${t('call.statusCancelled')} • ${callerName}`
        : `${t('call.videoCall')} • ${callerName}`

  const icon = isMissed ? 'bx-phone-missed' : 'bx-video'
  const showDuration = !isMissed && !isActive && duration > 0
  const showJoinButton = isActive && !isMine && !call.participants.includes(myUserId)

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.callRow} ${isMine ? styles.callMine : styles.callTheirs}`}>
        <div className={`${styles.callBubble}${isMissed ? ` ${styles.callMissed}` : ''}`}>
          <i className={`bx ${icon}`} />
          <span className={styles.callLabel}>{label}</span>
          {showDuration && (
            <span className={styles.callDuration}>
              {formatDuration(duration)}
            </span>
          )}
          <span className={styles.callTime}>
            {formatChatTime(call.created_at, t)}
          </span>
        </div>
      </div>
      {showJoinButton && (
        <div className={`${styles.joinRow} ${isMine ? styles.joinMine : styles.joinTheirs}`}>
          <button
            className={styles.joinBtn}
            onClick={() => onRequestJoin(call.call_id)}
          >
            <i className="bx bx-phone" />
            {t('groupCall.requestToJoin')}
          </button>
        </div>
      )}
    </div>
  )
}
