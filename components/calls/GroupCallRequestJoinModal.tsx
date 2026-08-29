'use client'

import Modal from '../Modal'
import { useTranslation } from '../../hooks/useTranslation'
import styles from './GroupCallRequestJoinModal.module.css'

interface GroupCallRequestJoinModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  callerName: string
  participantCount: number
}

export default function GroupCallRequestJoinModal({
  open,
  onClose,
  onConfirm,
  callerName,
  participantCount,
}: GroupCallRequestJoinModalProps) {
  const { t } = useTranslation()

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('groupCall.groupCall')}
      footer={
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className={styles.confirmBtn} onClick={handleConfirm}>
            <i className="bx bx-phone" />
            {t('groupCall.sendRequest')}
          </button>
        </div>
      }
    >
      <div className={styles.content}>
        <div className={styles.icon}>
          <i className="bx bx-video" />
        </div>
        <p className={styles.message}>
          {t('groupCall.joinRequestConfirm')}
        </p>
        <p className={styles.detail}>
          {t('groupCall.joinRequestSender', { name: callerName })}
        </p>
        <p className={styles.detail}>
          {t('groupCall.participantsCount', { count: String(participantCount) })}
        </p>
      </div>
    </Modal>
  )
}
