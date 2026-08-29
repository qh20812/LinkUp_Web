'use client'

import { useRouter } from 'next/navigation'
import ExternalImage from '../ExternalImage'
import OnlineIndicator from '../OnlineIndicator'
import { usePresence } from '../../contexts/PresenceContext'
import { useTranslation } from '../../hooks/useTranslation'
import type { GroupChatMember } from '../../types'
import styles from './GroupMemberList.module.css'

interface GroupMemberListProps {
  members: GroupChatMember[]
  myUserId: string
  isAdmin: boolean
  onBan?: (memberId: string) => void
  onMute?: (memberId: string) => void
  onUnmute?: (memberId: string) => void
  onTransferAdmin?: (memberId: string) => void
}

export default function GroupMemberList({
  members,
  myUserId,
  isAdmin,
  onBan,
  onMute,
  onUnmute,
  onTransferAdmin,
}: GroupMemberListProps) {
  const { t } = useTranslation()
  const { isOnline, prefetchPresence } = usePresence()
  const router = useRouter()

  const memberIds = members.map((m) => m.user_id)

  // Batch prefetch presence for all members
  if (memberIds.length > 0) {
    prefetchPresence(memberIds)
  }

  const sorted = [...members].sort((a, b) => {
    if (a.user_id === myUserId) return -1
    if (b.user_id === myUserId) return 1
    if (a.role === 'CHAT_ADMIN' && b.role !== 'CHAT_ADMIN') return -1
    if (a.role !== 'CHAT_ADMIN' && b.role === 'CHAT_ADMIN') return 1
    return 0
  })

  return (
    <div className={styles.list}>
      {sorted.map((member) => {
        const isSelf = member.user_id === myUserId
        const memberIsAdmin = member.role === 'CHAT_ADMIN'
        return (
          <div key={member.user_id} className={styles.row}>
            <div
              className={styles.avatar}
              onClick={() => router.push(`/profile/${member.user_id}`)}
              role={!isSelf ? 'link' : undefined}
              tabIndex={!isSelf ? 0 : undefined}
              onKeyDown={!isSelf ? (e) => { if (e.key === 'Enter') router.push(`/profile/${member.user_id}`) } : undefined}
            >
              {member.avatar_uri ? (
                <ExternalImage src={member.avatar_uri} alt="" />
              ) : (
                <i className="bx bxs-user" />
              )}
              <OnlineIndicator isOnline={isOnline(member.user_id)} />
            </div>
            <div
              className={styles.info}
              onClick={() => !isSelf && router.push(`/profile/${member.user_id}`)}
              role={!isSelf ? 'link' : undefined}
              tabIndex={!isSelf ? 0 : undefined}
              onKeyDown={!isSelf ? (e) => { if (e.key === 'Enter') router.push(`/profile/${member.user_id}`) } : undefined}
            >
              <span className={styles.name}>
                {member.display_name || t('chat.unknown')}
                {isSelf && <span className={styles.youBadge}> ({t('chat.you')})</span>}
              </span>
              {memberIsAdmin && (
                <span className={styles.adminBadge}>{t('chat.admin')}</span>
              )}
            </div>
            {isAdmin && !isSelf && !memberIsAdmin && (
              <div className={styles.actions}>
                {member.is_muted ? (
                  <button
                    className={styles.actionBtn}
                    onClick={() => onUnmute?.(member.user_id)}
                    title={t('chat.unmute')}
                  >
                    <i className="bx bx-volume-full" />
                  </button>
                ) : (
                  <button
                    className={styles.actionBtn}
                    onClick={() => onMute?.(member.user_id)}
                    title={t('chat.mute')}
                  >
                    <i className="bx bx-volume-mute" />
                  </button>
                )}
                <button
                  className={styles.actionBtn}
                  onClick={() => onBan?.(member.user_id)}
                  title={t('chat.ban')}
                >
                  <i className="bx bx-block" />
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={() => onTransferAdmin?.(member.user_id)}
                  title={t('chat.transferAdmin')}
                >
                  <i className="bx bx-crown" />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
