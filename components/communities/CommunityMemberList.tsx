'use client'

import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { getCommunityMembers } from '../../api/communities'
import ExternalImage from '../ExternalImage'
import { useTranslation } from '../../hooks/useTranslation'
import styles from './CommunityMemberList.module.css'
import type { CommunityMember } from '../../types'

interface CommunityMemberListProps {
  communityID: string
}

const ROLE_BADGE_CLASS: Record<string, string> = {
  COMMUNITY_ADMIN: styles.roleAdmin,
  GROUP_ADMIN: styles.roleAdmin,
  GROUP_MOD: styles.roleMod,
  GROUP_MEMBER: styles.roleMember,
}

function SkeletonRow() {
  return (
    <div className={styles.skeletonItem}>
      <div className={styles.skeletonCircle} />
      <div className={styles.skeletonLine} style={{ flex: 1 }} />
    </div>
  )
}

export default function CommunityMemberList({ communityID }: CommunityMemberListProps) {
  const { t } = useTranslation()
  const router = useRouter()

  const { data, isLoading } = useSWR<{ members: CommunityMember[] }>(
    `/communities/${communityID}/members`,
    () => getCommunityMembers(communityID),
  )

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
        </div>
      ))}
    </div>
  )
}
