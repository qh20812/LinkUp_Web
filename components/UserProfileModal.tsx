'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import { useTranslation } from '../hooks/useTranslation'
import { getProfileByUserID } from '../api/profile'
import Modal from './Modal'
import ProfileAboutTab from './profile/ProfileAboutTab'
import type { TopActiveUser } from '../types'
import styles from './UserProfileModal.module.css'

interface UserProfileModalProps {
  user: TopActiveUser
  onClose: () => void
}

export default function UserProfileModal({ user, onClose }: UserProfileModalProps) {
  const { t, language } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const { data, error, isLoading, mutate } = useSWR(
    `/profile/${user.user_id}`,
    () => getProfileByUserID(user.user_id),
    { revalidateOnFocus: false },
  )

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString(
        language === 'vi' ? 'vi-VN' : 'en-US',
        { day: '2-digit', month: '2-digit', year: 'numeric' },
      )
    } catch {
      return iso
    }
  }

  const footer = (
    <>
      {expanded ? (
        <button type="button" className={styles.btnSecondary} onClick={() => setExpanded(false)}>
          {t('common.back')}
        </button>
      ) : (
        <button type="button" className={styles.btnSecondary} onClick={onClose}>
          {t('common.close')}
        </button>
      )}
      {!expanded && data && (
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => setExpanded(true)}>
          {t('dashboard.viewFullProfile')}
        </button>
      )}
      {expanded && (
        <button type="button" className={styles.btnSecondary} onClick={onClose}>
          {t('common.close')}
        </button>
      )}
    </>
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={t('dashboard.viewProfile')}
      size={expanded ? 'lg' : undefined}
      footer={footer}>
      {isLoading ? (
        <div className={styles.state}>
          <i className="bx bx-loader-alt bx-spin" aria-hidden="true" />
          <p>{t('common.loading')}</p>
        </div>
      ) : error || !data ? (
        <div className={styles.state}>
          <i className="bx bx-error-circle" aria-hidden="true" />
          <p>{t('adminProfile.loadError')}</p>
          <button type="button" className={styles.btnSecondary} onClick={() => mutate()}>
            {t('common.retry')}
          </button>
        </div>
      ) : expanded ? (
        <div className={styles.fullView}>
          <div className={styles.coverWrap}>
            {data.cover_uri ? (
              <Image
                src={data.cover_uri}
                alt=""
                fill
                sizes="680px"
                className={styles.coverImg}
                unoptimized
              />
            ) : (
              <div className={styles.coverFallback} />
            )}
          </div>

          <div className={styles.fullIdentity}>
            <Image
              className={styles.avatarLg}
              src={data.avatar_uri || '/default-avatar.svg'}
              alt=""
              width={88}
              height={88}
              unoptimized
            />
            <div className={styles.info}>
              <div className={styles.nameRow}>
                <span className={styles.name}>{data.display_name || data.username}</span>
                <span className={styles.username}>@{data.username}</span>
              </div>
              <div className={styles.stats}>
                <span className={styles.statChip}>
                  <i className="bx bx-file" aria-hidden="true" />
                  <strong>{data.post_count}</strong> {t('dashboard.postCount')}
                </span>
                <span className={styles.statChip}>
                  <i className="bx bx-group" aria-hidden="true" />
                  <strong>{data.friend_count}</strong> {t('profile.friends')}
                </span>
                <span className={styles.statChip}>
                  <i className="bx bx-calendar" aria-hidden="true" />
                  {t('adminProfile.fieldJoined')} {formatDate(data.created_at)}
                </span>
              </div>
            </div>
          </div>

          {data.bio && <p className={styles.bio}>{data.bio}</p>}

          <div className={styles.aboutWrap}>
            <ProfileAboutTab profile={data} />
          </div>
        </div>
      ) : (
        <div className={styles.identity}>
          <Image
            className={styles.avatar}
            src={data.avatar_uri || '/default-avatar.svg'}
            alt=""
            width={72}
            height={72}
            unoptimized
          />
          <div className={styles.info}>
            <div className={styles.nameRow}>
              <span className={styles.name}>{data.display_name || data.username}</span>
              <span className={styles.username}>@{data.username}</span>
            </div>
            {data.bio && <p className={styles.bio}>{data.bio}</p>}
            <div className={styles.stats}>
              <span className={styles.statChip}>
                <i className="bx bx-file" aria-hidden="true" />
                <strong>{data.post_count}</strong> {t('dashboard.postCount')}
              </span>
              <span className={styles.statChip}>
                <i className="bx bx-group" aria-hidden="true" />
                <strong>{data.friend_count}</strong> {t('profile.friends')}
              </span>
              <span className={styles.statChip}>
                <i className="bx bx-calendar" aria-hidden="true" />
                {t('adminProfile.fieldJoined')} {formatDate(data.created_at)}
              </span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
