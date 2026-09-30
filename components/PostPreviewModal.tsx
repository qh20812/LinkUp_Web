'use client'

import React from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from '../hooks/useTranslation'
import { getPostDetail } from '../api/posts'
import Modal from './Modal'
import type { TopActiveUser, TopEngagedPost } from '../types'
import styles from './PostPreviewModal.module.css'

const STATUS_LABEL_KEYS: Record<string, string> = {
  public: 'post.privacyPublic',
  friend: 'post.privacyFriend',
  private: 'post.privacyPrivate',
  hidden: 'posts.hidden',
}

const STATUS_CLASS: Record<string, string> = {
  public: 'statusPublic',
  friend: 'statusFriend',
  private: 'statusPrivate',
  hidden: 'statusHidden',
}

interface PostPreviewModalProps {
  post: TopEngagedPost
  onClose: () => void
  onViewProfile: (user: TopActiveUser) => void
}

export default function PostPreviewModal({ post, onClose, onViewProfile }: PostPreviewModalProps) {
  const { t, language } = useTranslation()
  const { data, error, isLoading, mutate } = useSWR(
    `/posts/${post.post_id}`,
    () => getPostDetail(post.post_id),
    { revalidateOnFocus: false },
  )

  const detail = data?.data

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

  const handleViewProfile = () => {
    if (!detail) return
    onViewProfile({
      user_id: detail.user_id,
      username: detail.username,
      display_name: detail.display_name,
      avatar_uri: detail.avatar_uri,
      post_count: 0,
    })
  }

  const statusKey = detail ? STATUS_LABEL_KEYS[detail.status] : undefined
  const media = detail?.media.slice(0, 4) ?? []
  const extraMedia = detail ? detail.media.length - media.length : 0

  return (
    <Modal
      open
      onClose={onClose}
      title={t('posts.detailTitle')}
      footer={
        <>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            {t('common.close')}
          </button>
          <Link
            href={`/posts/${post.post_id}`}
            className={styles.btnPrimary}
            onClick={onClose}>
            {t('dashboard.viewPost')}
          </Link>
        </>
      }>
      {isLoading ? (
        <div className={styles.state}>
          <i className="bx bx-loader-alt bx-spin" aria-hidden="true" />
          <p>{t('common.loading')}</p>
        </div>
      ) : error || !detail ? (
        <div className={styles.state}>
          <i className="bx bx-error-circle" aria-hidden="true" />
          <p>{t('dashboard.postLoadError')}</p>
          <button type="button" className={styles.btnSecondary} onClick={() => mutate()}>
            {t('common.retry')}
          </button>
        </div>
      ) : (
        <>
          <button type="button" className={styles.author} onClick={handleViewProfile}>
            <Image
              className={styles.authorAvatar}
              src={detail.avatar_uri || '/default-avatar.svg'}
              alt=""
              width={40}
              height={40}
              unoptimized
            />
            <span className={styles.authorText}>
              <span className={styles.authorName}>
                {detail.display_name || detail.username}
              </span>
              <span className={styles.authorUsername}>@{detail.username}</span>
            </span>
            <i className="bx bx-chevron-right" aria-hidden="true" />
          </button>

          <h3 className={styles.title}>{detail.title || t('posts.noTitle')}</h3>

          <div className={styles.meta}>
            {statusKey && (
              <span className={`${styles.status} ${styles[STATUS_CLASS[detail.status] ?? 'statusPublic']}`}>
                <i
                  className={`bx ${detail.status === 'private' ? 'bx-lock' : detail.status === 'friend' ? 'bx-group' : detail.status === 'hidden' ? 'bx-hide' : 'bx-globe'}`}
                  aria-hidden="true"
                />
                {t(statusKey)}
              </span>
            )}
            <span className={styles.date}>{formatDate(detail.created_at)}</span>
          </div>

          {detail.content && <p className={styles.content}>{detail.content}</p>}

          {media.length > 0 && (
            <div className={styles.mediaGrid}>
              {media.map((m, i) => (
                <div key={m.id} className={styles.mediaThumb}>
                  {m.file_type.startsWith('video/') ? (
                    <span className={styles.mediaPlaceholder}>
                      <i className="bx bx-video" aria-hidden="true" />
                    </span>
                  ) : (
                    <Image
                      src={m.file_uri}
                      alt=""
                      fill
                      sizes="160px"
                      className={styles.mediaImg}
                      unoptimized
                    />
                  )}
                  {i === media.length - 1 && extraMedia > 0 && (
                    <span className={styles.mediaMore}>+{extraMedia}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className={styles.stats}>
            <span className={styles.stat}>
              <i className="bx bx-show" aria-hidden="true" /> {detail.views_count}
            </span>
            <span className={styles.stat}>
              <i className="bx bx-heart" aria-hidden="true" /> {detail.likes_count}
            </span>
            <span className={styles.stat}>
              <i className="bx bx-message-rounded" aria-hidden="true" /> {detail.comments_count}
            </span>
            <span className={styles.stat}>
              <i className="bx bx-share" aria-hidden="true" /> {detail.shares_count}
            </span>
          </div>
        </>
      )}
    </Modal>
  )
}
