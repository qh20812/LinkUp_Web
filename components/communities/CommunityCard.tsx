'use client'

import { useRouter } from 'next/navigation'
import ExternalImage from '../ExternalImage'
import { useTranslation } from '../../hooks/useTranslation'
import styles from './CommunityCard.module.css'
import type { CommunityListItem } from '../../types'

interface CommunityCardProps {
  community: CommunityListItem
}

const PRIVACY_LABELS: Record<CommunityListItem['privacy'], string> = {
  public: 'communities.privacyPublic',
  invitation_only: 'communities.privacyInvitation',
}

const PRIVACY_CLASS: Record<CommunityListItem['privacy'], string> = {
  public: styles.privacyPublic,
  invitation_only: styles.privacyInvitation,
}

export default function CommunityCard({ community }: CommunityCardProps) {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <div
      className={styles.card}
      onClick={() => router.push(`/communities/${community.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(`/communities/${community.id}`)
        }
      }}
    >
      <div className={styles.avatarWrap}>
        {community.avatar_uri ? (
          <ExternalImage
            src={community.avatar_uri}
            alt={community.name}
            className={styles.avatar}
          />
        ) : (
          <i className={`bx bxs-chat ${styles.iconFallback}`} />
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.name}>
          {community.name}
          {community.is_creator && (
            <span className={styles.creatorBadge}>{t('communities.yourCommunity')}</span>
          )}
        </div>

        {community.description && (
          <div className={styles.description}>{community.description}</div>
        )}

        <div className={styles.meta}>
          <span>
            <i className="bx bx-group" />{' '}
            {community.member_count.toLocaleString('vi-VN')} {t('communities.members')}
          </span>

          <span className={`${styles.privacyBadge} ${PRIVACY_CLASS[community.privacy]}`}>
            {community.privacy === 'public' && <i className="bx bx-globe" />}
            {community.privacy === 'invitation_only' && <i className="bx bx-lock-alt" />}
            {' '}{t(PRIVACY_LABELS[community.privacy])}
          </span>
        </div>
      </div>
    </div>
  )
}
