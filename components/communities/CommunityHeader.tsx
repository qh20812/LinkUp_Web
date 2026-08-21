'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './CommunityHeader.module.css'
import ExternalImage from '../ExternalImage'
import JoinButton from './JoinButton'
import { useTranslation } from '../../hooks/useTranslation'
import type { CommunityDetailResponse } from '../../types'

interface CommunityHeaderProps {
  community: CommunityDetailResponse
  onStatusChange: (newStatus: CommunityDetailResponse['membership_status']) => void
}

const PRIVACY_LABELS: Record<CommunityDetailResponse['privacy'], string> = {
  public: 'communities.privacyPublic',
  code: 'communities.privacyCode',
  invitation_only: 'communities.privacyInvitation',
}

export default function CommunityHeader({ community, onStatusChange }: CommunityHeaderProps) {
  const { t } = useTranslation()
  const [coverError, setCoverError] = useState(false)
  const [avatarError, setAvatarError] = useState(false)

  return (
    <div className={styles.header}>
      <div className={styles.coverWrap}>
        {coverError || !community.background_uri ? (
          <div className={styles.coverFallback} />
        ) : (
          <ExternalImage
            src={community.background_uri}
            alt={community.name}
            className={styles.cover}
            onError={() => setCoverError(true)}
          />
        )}
      </div>

      <div className={styles.infoSection}>
        <div className={styles.avatarWrap}>
          {avatarError || !community.avatar_uri ? (
            <div className={styles.iconFallback}>
              <i className="bx bx-group" />
            </div>
          ) : (
            <ExternalImage
              src={community.avatar_uri}
              alt={community.name}
              className={styles.avatar}
              onError={() => setAvatarError(true)}
            />
          )}
        </div>

        <div className={styles.nameRow}>
          <div>
            <h1 className={styles.name}>{community.name}</h1>
            {community.description && (
              <p className={styles.description}>{community.description}</p>
            )}
          </div>
          <JoinButton
            communityID={community.id}
            status={community.membership_status}
            privacy={community.privacy}
            onStatusChange={onStatusChange}
          />
        </div>

        <div className={styles.statsRow}>
          <span className={styles.statItem}>
            <i className="bx bx-group" />
            {community.member_count.toLocaleString()} {t('communities.members')}
          </span>
          <span className={styles.privacyBadge}>
            {t(PRIVACY_LABELS[community.privacy])}
          </span>
          <span className={styles.statItem}>
            {t('communities.createdBy')}{' '}
            <Link href={`/profile/${community.creator_id}`} className={styles.creatorLink}>
              @{community.creator_name}
            </Link>
          </span>
        </div>
      </div>
    </div>
  )
}
