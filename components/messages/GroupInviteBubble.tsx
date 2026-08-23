'use client'

import { useCallback, useMemo, useState } from 'react'
import ExternalImage from '../ExternalImage'
import Modal from '../Modal'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import { approveGroupChatInvite, rejectGroupChatInvite } from '../../api/chats'
import type { ChatMessage, GroupChatInviteContent } from '../../types'
import styles from './ChatWindow.module.css'
import inviteStyles from './GroupInviteBubble.module.css'

interface GroupInviteBubbleProps {
  message: ChatMessage
  myUserId: string
  onAccepted?: (groupChatId: string) => void
}

function parseInviteContent(content: string): GroupChatInviteContent | null {
  try {
    const parsed = JSON.parse(content) as GroupChatInviteContent
    if (parsed.request_id && parsed.chat_id && parsed.status) return parsed
    return null
  } catch {
    return null
  }
}

export default function GroupInviteBubble({ message, myUserId, onAccepted }: GroupInviteBubbleProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const invite = useMemo(() => parseInviteContent(message.content), [message.content])

  const isMine = message.sender_id === myUserId
  const status = invite?.status ?? 'pending'
  const canOpenModal = status === 'pending' && !isMine

  const handleAccept = useCallback(async () => {
    if (loading || !invite) return
    setLoading(true)
    try {
      await approveGroupChatInvite(invite.chat_id, invite.request_id)
      toast({ type: 'success', title: t('chat.inviteAccepted') })
      setModalOpen(false)
      onAccepted?.(invite.chat_id)
    } catch {
      toast({ type: 'error', title: t('chat.inviteAcceptFailed') })
    } finally {
      setLoading(false)
    }
  }, [invite, loading, toast, t, onAccepted])

  const handleReject = useCallback(async () => {
    if (loading || !invite) return
    setLoading(true)
    try {
      await rejectGroupChatInvite(invite.chat_id, invite.request_id)
      toast({ type: 'info', title: t('chat.inviteDeclined') })
      setModalOpen(false)
    } catch {
      toast({ type: 'error', title: t('chat.inviteDeclineFailed') })
    } finally {
      setLoading(false)
    }
  }, [invite, loading, toast, t])

  if (!invite) return null

  return (
    <>
      <div
        className={`${styles.msgRow} ${isMine ? styles.mine : styles.theirs}`}
      >
        <div
          className={`${inviteStyles.bubble} ${canOpenModal ? inviteStyles.clickable : ''}`}
          onClick={canOpenModal ? () => setModalOpen(true) : undefined}
          role={canOpenModal ? 'button' : undefined}
          tabIndex={canOpenModal ? 0 : undefined}
          onKeyDown={canOpenModal ? (e) => { if (e.key === 'Enter' || e.key === ' ') setModalOpen(true) } : undefined}
        >
          <div className={inviteStyles.header}>
            {invite.group_avatar ? (
              <ExternalImage src={invite.group_avatar} alt="" className={inviteStyles.avatar} />
            ) : (
              <div className={inviteStyles.avatarPlaceholder}>
                <i className="bx bx-group" />
              </div>
            )}
            <div className={inviteStyles.info}>
              <span className={inviteStyles.title}>{t('chat.groupInviteTitle')}</span>
              <span className={inviteStyles.groupName}>{invite.group_name}</span>
            </div>
            {canOpenModal && <i className={`bx bx-chevron-right ${inviteStyles.chevron}`} />}
          </div>

          {status === 'pending' && isMine && (
            <div className={inviteStyles.status}>
              <i className="bx bx-time-five" />
              <span>{t('chat.inviteStatusPending')}</span>
            </div>
          )}
          {status === 'accepted' && (
            <div className={`${inviteStyles.status} ${inviteStyles.statusAccepted}`}>
              <i className="bx bx-check-circle" />
              <span>{t('chat.inviteStatusAccepted')}</span>
            </div>
          )}
          {status === 'rejected' && (
            <div className={`${inviteStyles.status} ${inviteStyles.statusRejected}`}>
              <i className="bx bx-x-circle" />
              <span>{t('chat.inviteStatusRejected')}</span>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('chat.groupInviteTitle')}
        footer={
          <div className={inviteStyles.modalFooter}>
            <button
              className={inviteStyles.rejectBtn}
              onClick={handleReject}
              disabled={loading}
            >
              {t('chat.inviteDecline')}
            </button>
            <button
              className={inviteStyles.acceptBtn}
              onClick={handleAccept}
              disabled={loading}
            >
              {loading ? <i className="bx bx-loader-circle bx-spin" /> : t('chat.inviteAccept')}
            </button>
          </div>
        }
      >
        <div className={inviteStyles.modalContent}>
          {invite.group_avatar ? (
            <ExternalImage src={invite.group_avatar} alt="" className={inviteStyles.modalAvatar} />
          ) : (
            <div className={inviteStyles.modalAvatarPlaceholder}>
              <i className="bx bx-group" />
            </div>
          )}
          <p className={inviteStyles.modalText}>
            <strong>{invite.requester_name}</strong> {t('chat.groupInviteLabel')}
          </p>
          <p className={inviteStyles.modalGroupName}>{invite.group_name}</p>
        </div>
      </Modal>
    </>
  )
}
