'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getPostDetail } from '../../../../api/posts'
import PostDetailModal from '../../../../components/PostDetailModal'
import type { FeedPost } from '../../../../types'
import styles from './PostDetailPage.module.css'

export default function PostDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  if (!id) return <div className={styles.center} />
  return <PostDetailView key={id} id={id} />
}

function PostDetailView({ id }: { id: string }) {
  const router = useRouter()
  const [post, setPost] = useState<FeedPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getPostDetail(id)
      .then((res) => {
        if (!cancelled) setPost(res.data)
      })
      .catch(() => {
        if (!cancelled) setError('Không thể tải bài viết này.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const handleClose = () => router.push('/')

  if (loading) {
    return (
      <div className={styles.center}>
        <i className="bx bx-loader-circle bx-spin" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className={styles.center}>
        <i className="bx bx-error-circle" />
        <p>{error ?? 'Không tìm thấy bài viết.'}</p>
        <button type="button" className={styles.backBtn} onClick={handleClose}>
          Quay lại trang chủ
        </button>
      </div>
    )
  }

  return (
    <PostDetailModal
      key={post.id}
      post={post}
      open
      onClose={handleClose}
      onDeleted={handleClose}
    />
  )
}
