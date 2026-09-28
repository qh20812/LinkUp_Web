'use client'

import { useState } from 'react'
import useSWR from 'swr'
import ExternalImage from './ExternalImage'
import CreatePostModal from './CreatePostModal'
import styles from './PostComposer.module.css'
import { request } from '../api/api'
import { useTranslation } from '../hooks/useTranslation'
import type { ViewProfileResponse } from '../types'

function useProfile() {
  const { data, error } = useSWR<ViewProfileResponse>(
    '/profile',
    (key: string) => request<ViewProfileResponse>(key),
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  )
  return { profile: data, loading: !data && !error }
}

type InitialPicker = 'media' | 'emoji' | 'gif' | undefined

export default function PostComposer() {
  const { t } = useTranslation()
  const { profile } = useProfile()
  const [open, setOpen] = useState(false)
  const [initialPicker, setInitialPicker] = useState<InitialPicker>(undefined)

  const openModal = (picker?: Exclude<InitialPicker, undefined>) => {
    setInitialPicker(picker)
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setInitialPicker(undefined)
  }

  return (
    <div className={styles.card}>
      <div className={styles.avatar}>
        {profile?.avatar_uri ? (
          <ExternalImage src={profile.avatar_uri} alt="" className={styles.avatarImg} />
        ) : (
          <i className="bx bxs-user" />
        )}
      </div>
      <button type="button" className={styles.placeholder} onClick={() => openModal()}>
        {t('composer.placeholder')}
      </button>
      <button
        type="button"
        className={styles.photoBtn}
        onClick={() => openModal('media')}
        aria-label={t('composer.media')}
        title={t('composer.media')}
      >
        <i className="bx bx-image-add" />
      </button>
      <CreatePostModal open={open} onClose={handleClose} initialPicker={initialPicker} />
    </div>
  )
}
