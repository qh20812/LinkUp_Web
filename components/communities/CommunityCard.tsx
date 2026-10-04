'use client'

import { useState } from 'react'
import Link from 'next/link'
import ExternalImage from '../ExternalImage'
import JoinCommunityCodeModal from './JoinCommunityCodeModal'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import { joinCommunity } from '../../api/communities'
import styles from './CommunityCard.module.css'
import type { CommunityListItem } from '../../types'

interface CommunityCardProps {
  community: CommunityListItem
  index?: number
}

const PRIVACY_LABELS: Record<CommunityListItem['privacy'], string> = {
  public: 'communities.privacyPublic',
  invitation_only: 'communities.privacyInvitation',
}

const PRIVACY_CLASS: Record<CommunityListItem['privacy'], string> = {
  public: styles.privacyPublic,
  invitation_only: styles.privacyInvitation,
}

export default function CommunityCard({ community, index = 0 }: CommunityCardProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)
  const [coverError, setCoverError] = useState(false)

  const cover = !coverError && community.background_uri ? community.background_uri : null

  const handleJoinPublic = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (joining || joined) return
    setJoining(true)
    try {
      await joinCommunity(community.id)
      setJoined(true)
      toast({ type: 'success', title: t('communities.joinSuccess') })
    } catch (err: unknown) {
      toast({
        type: 'error',
        title: err instanceof Error ? err.message : t('communities.joinError'),
      })
    } finally {
      setJoining(false)
    }
  }

  const handleCodeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCodeOpen(true)
  }

  const renderAction = () => {
    if (community.is_creator) {
      return (
        <span className={`${styles.action} ${styles.actionManage}`} onClick={(e) => e.stopPropagation()}>
          {t('communities.manage')}
        </span>
      )
    }
    if (joined) {
      return (
        <span
          className={`${styles.action} ${styles.actionJoined}`}
          onClick={(e) => e.stopPropagation()}
          aria-live="polite"
        >
          <i className="bx bx-check" /> {t('communities.joinedBadge')}
        </span>
      )
    }
    if (community.privacy === 'invitation_only') {
      return (
        <button
          type="button"
          className={`${styles.action} ${styles.actionCode}`}
          onClick={handleCodeClick}
        >
          <i className="bx bx-key" /> {t('communities.enterCode')}
        </button>
      )
    }
    return (
      <button
        type="button"
        className={`${styles.action} ${styles.actionJoin}`}
        onClick={handleJoinPublic}
        disabled={joining}
      >
        {joining ? t('communities.joining') : t('communities.join')}
      </button>
    )
  }

  return (
    <>
      <Link
        href={`/communities/${community.id}`}
        className={styles.card}
        style={{ ['--index' as string]: index }}
        aria-label={community.name}
      >
        <div className={styles.coverWrap}>
          {cover ? (
            <ExternalImage
              src={cover}
              alt=""
              aria-hidden
              className={styles.cover}
              onError={() => setCoverError(true)}
            />
          ) : (
            <div className={styles.coverFallback} aria-hidden>
              <span className={styles.orb} />
            </div>
          )}
          <span className={`${styles.privacyBadge} ${PRIVACY_CLASS[community.privacy]}`}>
            {community.privacy === 'public' ? (
              <i className="bx bx-globe" />
            ) : (
              <i className="bx bx-lock-alt" />
            )}{' '}
            {t(PRIVACY_LABELS[community.privacy])}
          </span>
        </div>

        <div className={styles.body}>
          <div className={styles.avatarWrap}>
            {community.avatar_uri ? (
              <ExternalImage
                src={community.avatar_uri}
                alt={community.name}
                className={styles.avatar}
              />
            ) : (
              <span className={styles.iconFallback} aria-hidden>
                <i className="bx bx-group" />
              </span>
            )}
          </div>

          <div className={styles.name}>
            <span className={styles.nameText}>{community.name}</span>
            {community.is_creator && (
              <span className={styles.creatorBadge}>{t('communities.yourCommunity')}</span>
            )}
          </div>

          {community.description && (
            <div className={styles.description}>{community.description}</div>
          )}

          <div className={styles.meta}>
            <span className={styles.metaItem}>
              <i className="bx bx-group" />{' '}
              {community.member_count.toLocaleString('vi-VN')} {t('communities.members')}
            </span>
            <span className={styles.metaDot} aria-hidden>·</span>
            <span className={styles.metaItem}>
              {new Date(community.created_at).toLocaleDateString('vi-VN')}
            </span>
          </div>

          <div className={styles.footer}>{renderAction()}</div>
        </div>
      </Link>

      <JoinCommunityCodeModal
        open={codeOpen}
        communityID={community.id}
        communityName={community.name}
        onClose={() => setCodeOpen(false)}
        onJoined={() => setJoined(true)}
      />
    </>
  )
}
