'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { getCommunityMembers, updateMemberRole, kickMember } from '../../api/communities'
import ExternalImage from '../ExternalImage'
import Modal from '../Modal'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import styles from './CommunityMemberList.module.css'
import type { CommunityMember } from '../../types'

interface CommunityMemberListProps {
  communityID: string
  isAdmin?: boolean
}

const ROLE_BADGE_CLASS: Record<string, string> = {
  COMMUNITY_ADMIN: styles.roleAdmin,
  GROUP_ADMIN: styles.roleAdmin,
  GROUP_MOD: styles.roleMod,
  GROUP_MEMBER: styles.roleMember,
}

const ROLE_OPTIONS = [
  { value: 'GROUP_ADMIN', labelKey: 'communities.roleAdmin' },
  { value: 'GROUP_MOD', labelKey: 'communities.roleMod' },
  { value: 'GROUP_MEMBER', labelKey: 'communities.roleMember' },
]

function SkeletonRow() {
  return (
    <div className={styles.skeletonItem}>
      <div className={styles.skeletonCircle} />
      <div className={styles.skeletonLine} style={{ flex: 1 }} />
    </div>
  )
}

export default function CommunityMemberList({ communityID, isAdmin = false }: CommunityMemberListProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { toast } = useToast()

  const { data, isLoading, mutate } = useSWR<{ members: CommunityMember[] }>(
    `/communities/${communityID}/members`,
    () => getCommunityMembers(communityID),
  )

  const [kickModal, setKickModal] = useState<{ open: boolean; member: CommunityMember | null }>({
    open: false,
    member: null,
  })
  const [kickReason, setKickReason] = useState('')
  const [kicking, setKicking] = useState(false)

  const handleRoleChange = async (memberID: string, newRole: string) => {
    try {
      await updateMemberRole(communityID, memberID, newRole)
      toast({ type: 'success', title: t('communities.roleChanged') })
      mutate()
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('communities.roleError'),
      })
    }
  }

  const handleKick = async () => {
    if (!kickModal.member || !kickReason.trim()) return

    setKicking(true)
    try {
      await kickMember(communityID, kickModal.member.user_id, kickReason.trim())
      toast({ type: 'success', title: t('communities.kicked') })
      setKickModal({ open: false, member: null })
      setKickReason('')
      mutate()
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('communities.kickError'),
      })
    } finally {
      setKicking(false)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.list}>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    )
  }

  const members = data?.members ?? []

  if (members.length === 0) {
    return <div className={styles.empty}>{t('communities.noMembers')}</div>
  }

  return (
    <div className={styles.list}>
      {members.map((member) => (
        <div
          key={member.user_id}
          className={styles.memberItem}
          onClick={() => router.push(`/profile/${member.user_id}`)}
        >
          <ExternalImage
            src={member.avatar_uri}
            alt={member.display_name}
            className={styles.avatar}
          />
          <div className={styles.info}>
            <div className={styles.name}>{member.display_name}</div>
          </div>
          <span
            className={`${styles.roleBadge} ${ROLE_BADGE_CLASS[member.role] ?? styles.roleMember}`}
          >
            {t(`communities.role${member.role === 'COMMUNITY_ADMIN' || member.role === 'GROUP_ADMIN' ? 'Admin' : member.role === 'GROUP_MOD' ? 'Mod' : 'Member'}`)}
          </span>
          {isAdmin && member.role !== 'COMMUNITY_ADMIN' && (
            <div className={styles.adminActions} onClick={e => e.stopPropagation()}>
              <select
                className={styles.roleSelect}
                value={member.role}
                onChange={e => handleRoleChange(member.user_id, e.target.value)}
              >
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
              <button
                className={styles.kickBtn}
                onClick={() => setKickModal({ open: true, member })}
                title={t('communities.kick')}
              >
                <i className="bx bx-user-x" />
              </button>
            </div>
          )}
        </div>
      ))}

      <Modal
        open={kickModal.open}
        onClose={() => {
          setKickModal({ open: false, member: null })
          setKickReason('')
        }}
        title={t('communities.kickConfirm')}
        footer={
          <div className={styles.kickFooter}>
            <button
              className={styles.kickCancelBtn}
              onClick={() => {
                setKickModal({ open: false, member: null })
                setKickReason('')
              }}
              disabled={kicking}
            >
              {t('common.cancel')}
            </button>
            <button
              className={styles.kickSubmitBtn}
              onClick={handleKick}
              disabled={kicking || !kickReason.trim()}
            >
              {kicking ? t('common.saving') : t('communities.kick')}
            </button>
          </div>
        }
      >
        <div className={styles.kickForm}>
          {kickModal.member && (
            <div className={styles.kickMember}>
              <ExternalImage
                src={kickModal.member.avatar_uri}
                alt={kickModal.member.display_name}
                className={styles.kickAvatar}
              />
              <span>{kickModal.member.display_name}</span>
            </div>
          )}
          <div className={styles.kickField}>
            <label className={styles.kickLabel}>{t('communities.kickReason')}</label>
            <textarea
              className={styles.kickTextarea}
              value={kickReason}
              onChange={e => setKickReason(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={kicking}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
