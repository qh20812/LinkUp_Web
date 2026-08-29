'use client'

import { useGroupCall } from '../../contexts/GroupCallContext'
import { useTranslation } from '../../hooks/useTranslation'
import styles from './GroupCallIncomingModal.module.css'

export default function GroupCallIncomingModal() {
  const { t } = useTranslation()
  const { phase, call, joinGroupCall, declineGroupCall } = useGroupCall()

  if (phase !== 'ringing' || !call) return null

  const callerName =
    call.participants.get(call.callerId)?.display_name ?? call.callerId

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.iconWrap}>
          <i className={`bx ${call.isVideo ? 'bx-video' : 'bx-phone'} ${styles.icon}`} />
        </div>

        <div className={styles.title}>
          {call.isVideo
            ? t('groupCall.incomingVideo')
            : t('groupCall.incomingVoice')}
        </div>

        <div className={styles.callerName}>{callerName}</div>

        <div className={styles.participantInfo}>
          <i className="bx bx-group" />
          <span>
            {call.participants.size} {t('groupCall.participants')}
          </span>
        </div>

        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${styles.rejectBtn}`}
            onClick={declineGroupCall}
            aria-label={t('groupCall.reject')}
            title={t('groupCall.reject')}
          >
            <i className="bx bx-phone-off" />
          </button>
          <button
            className={`${styles.btn} ${styles.acceptBtn}`}
            onClick={() => joinGroupCall(call.callId)}
            aria-label={t('groupCall.accept')}
            title={t('groupCall.accept')}
          >
            <i className="bx bx-phone-call" />
          </button>
        </div>
      </div>
    </div>
  )
}
