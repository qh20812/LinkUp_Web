'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { viewStory, getUserStories } from '../../../../api/stories'
import { getTokenPayload } from '../../../../api/auth'
import StoryViewer from '../../../../components/story/StoryViewer'
import { useTranslation } from '../../../../hooks/useTranslation'
import { useToast } from '../../../../contexts/ToastContext'
import type { StoryItem } from '../../../../types'
import styles from './StoryPage.module.css'

export default function StoryPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  if (!id) return <div className={styles.center} />
  return <StoryView key={id} id={id} />
}

/**
 * Deep link `/stories/:id` cho link share story.
 * Mở đúng story được chia sẻ trong viewer, kèm các story còn lại của cùng chủ
 * để người xem có thể chuyển qua lại như khi bấm từ story bar.
 */
function StoryView({ id }: { id: string }) {
  const router = useRouter()
  const { t } = useTranslation()
  const { toast } = useToast()

  const [stories, setStories] = useState<StoryItem[] | null>(null)
  const [initialIndex, setInitialIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)
  // Chỉ fetch 1 lần / story id; tránh refetch khi context đổi identity.
  const fetchedRef = useRef(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUserId(getTokenPayload()?.user_id)
  }, [])

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    // Story route yêu cầu đăng nhập — chưa login thì quay lại sau khi login.
    if (!getTokenPayload()) {
      router.replace(`/login?redirect=${encodeURIComponent(`/stories/${id}`)}`)
      return
    }

    let cancelled = false

    viewStory(id)
      .then(async (story) => {
        // Lấy toàn bộ story active của chủ story để viewer chuyển qua lại được.
        const list = await getUserStories(story.user_id)
          .then((res) => (Array.isArray(res.stories) ? res.stories : []))
          .catch(() => [] as StoryItem[])

        if (cancelled) return

        const merged = list.length > 0 ? list : [story]
        const index = merged.findIndex((s) => s.id === id)
        setStories(merged)
        setInitialIndex(index >= 0 ? index : 0)
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
        toast({ type: 'error', title: t('story.notFound') })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, router, t, toast])

  const goHome = () => router.push('/')

  if (loading) {
    return (
      <div className={styles.center} role="status" aria-label={t('common.loading')}>
        <div className={styles.spinner} />
      </div>
    )
  }

  if (error || !stories) {
    return (
      <div className={styles.center}>
        <i className="bx bx-error-circle" aria-hidden="true" />
        <p>{t('story.notFound')}</p>
        <button type="button" className={styles.backBtn} onClick={goHome}>
          {t('common.back')}
        </button>
      </div>
    )
  }

  return (
    <StoryViewer
      stories={stories}
      initialIndex={initialIndex}
      currentUserId={currentUserId}
      onClose={goHome}
      onStoryDeleted={goHome}
    />
  )
}
