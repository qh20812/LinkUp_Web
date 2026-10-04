'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './CommunityHeader.module.css'
import ExternalImage from '../ExternalImage'
import JoinButton from './JoinButton'
import JoinCommunityCodeModal from './JoinCommunityCodeModal'
import { useTranslation } from '../../hooks/useTranslation'
import type { CommunityDetailResponse } from '../../types'

interface CommunityHeaderProps {
  community: CommunityDetailResponse
  onStatusChange: (newStatus: CommunityDetailResponse['membership_status']) => void
}

const PRIVACY_LABELS: Record<CommunityDetailResponse['privacy'], string> = {
  public: 'communities.privacyPublic',
  invitation_only: 'communities.privacyInvitation',
}

const PRIVACY_CLASS: Record<CommunityDetailResponse['privacy'], string> = {
  public: styles.privacyPublic,
  invitation_only: styles.privacyInvitation,
}

export default function CommunityHeader({ community, onStatusChange }: CommunityHeaderProps) {
  const { t, language } = useTranslation()
  const [coverError, setCoverError] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)

  const showCover = !coverError && community.background_uri
  const isGuest = community.membership_status === 'none'
  const showCodeCta = isGuest && community.privacy === 'invitation_only'

  return (
    <div className={styles.header}>
      <div className={styles.coverWrap}>
        {showCover ? (
          <ExternalImage
            src={community.background_uri}
            alt={community.name}
            className={styles.cover}
            onError={() => setCoverError(true)}
          />
        ) : (
          <div className={styles.coverFallback} aria-hidden>
            <span className={styles.orbA} />
            <span className={styles.orbB} />
          </div>
        )}
        <div className={styles.coverOverlay} aria-hidden />
        <span className={`${styles.privacyBadge} ${PRIVACY_CLASS[community.privacy]}`}>
          {community.privacy === 'public' ? (
            <i className="bx bx-globe" aria-hidden />
          ) : (
            <i className="bx bx-lock-alt" aria-hidden />
          )}{' '}
          {t(PRIVACY_LABELS[community.privacy])}
        </span>
      </div>

      <div className={styles.infoSection}>
        <div className={styles.avatarWrap}>
          {avatarError || !community.avatar_uri ? (
            <div className={styles.iconFallback} aria-hidden>
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
          <div className={styles.titleBlock}>
            <h1 className={styles.name}>{community.name}</h1>
            {community.description && (
              <p className={styles.description}>{community.description}</p>
            )}
          </div>
          <div className={styles.actions}>
            {showCodeCta && (
              <button type="button" className={styles.codeCta} onClick={() => setCodeOpen(true)}>
                <i className="bx bx-key" aria-hidden /> {t('communities.enterCode')}
              </button>
            )}
            <JoinButton
              communityID={community.id}
              status={community.membership_status}
              privacy={community.privacy}
              onStatusChange={onStatusChange}
              onRequestCode={() => setCodeOpen(true)}
            />
          </div>
        </div>

        <div className={styles.statsRow}>
          <span className={styles.statPill}>
            <i className="bx bx-group" aria-hidden />
            {community.member_count.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}{' '}
            {t('communities.members')}
          </span>
          <span className={styles.statPill}>
            <i className="bx bx-calendar" aria-hidden />
            {new Date(community.created_at).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
          </span>
          <span className={styles.statItem}>
            {t('communities.createdBy')}{' '}
            <Link href={`/profile/${community.creator_id}`} className={styles.creatorLink}>
              @{community.creator_name}
            </Link>
          </span>
        </div>
      </div>

      <JoinCommunityCodeModal
        open={codeOpen}
        communityID={community.id}
        communityName={community.name}
        onClose={() => setCodeOpen(false)}
        onJoined={(status) => onStatusChange(status)}
      />
    </div>
  )
}
