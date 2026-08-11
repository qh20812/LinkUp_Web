'use client'

import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import ExternalImage from './ExternalImage'
import styles from './PostComposer.module.css'
import { request } from '../api/api'
import { createPost } from '../api/posts'
import { useToast } from '../contexts/ToastContext'
import { useTranslation } from '../hooks/useTranslation'
import type { ViewProfileResponse, PostStatus, FeedPost } from '../types'

function useProfile() {
  const { data, error } = useSWR<ViewProfileResponse>(
    '/profile',
    (key: string) => request<ViewProfileResponse>(key),
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  )
  return { profile: data, loading: !data && !error }
}

const CONTENT_MAX = 5000
const TITLE_MAX = 150

const PRIVACY_OPTIONS: { value: PostStatus; icon: string; key: string }[] = [
  { value: 'public', icon: 'bx-globe', key: 'composer.privacy.public' },
  { value: 'friend', icon: 'bx-group', key: 'composer.privacy.friend' },
  { value: 'private', icon: 'bx-lock-alt', key: 'composer.privacy.private' },
]

export default function PostComposer({ onPosted }: { onPosted?: (post: FeedPost) => void }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { profile } = useProfile()
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [privacy, setPrivacy] = useState<PostStatus>('public')
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [media, setMedia] = useState<{ file: File; url: string }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const privacyRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!privacyOpen) return
    const handleClick = (e: MouseEvent) => {
      if (privacyRef.current && !privacyRef.current.contains(e.target as Node)) {
        setPrivacyOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [privacyOpen])

  useEffect(() => {
    const urls = media.map((m) => m.url)
    return () => {
      for (const u of urls) URL.revokeObjectURL(u)
    }
  }, [media])

  const handleCancel = () => {
    setExpanded(false)
    setTitle('')
    setContent('')
    setPrivacy('public')
    setPrivacyOpen(false)
    setMedia([])
    setError(null)
  }

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setMedia((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))])
    setError(null)
    e.target.value = ''
  }

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index))
    setError(null)
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    setError(null)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  const contentLength = Array.from(content).length
  const currentPrivacy = PRIVACY_OPTIONS.find((o) => o.value === privacy) ?? PRIVACY_OPTIONS[0]

  const validate = (): string | null => {
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    const hasFiles = media.length > 0

    if (trimmedTitle !== '' && (trimmedTitle.length < 5 || trimmedTitle.length > TITLE_MAX)) {
      return t('composer.errorTitleLength')
    }
    if (!hasFiles && trimmedContent === '') {
      return t('composer.errorContentRequired')
    }
    if (contentLength > CONTENT_MAX) {
      return t('composer.errorMaxLength')
    }
    return null
  }

  const handleSubmit = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      const res = await createPost({
        title: title.trim(),
        content: content.trim(),
        status: privacy,
        files: media.map((m) => m.file),
      })
      toast({ type: 'success', title: t('composer.success') })
      setExpanded(false)
      setTitle('')
      setContent('')
      setPrivacy('public')
      setPrivacyOpen(false)
      setMedia([])
      onPosted?.(res.data)
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.card}>
      {!expanded ? (
        <button type="button" className={styles.idle} onClick={() => setExpanded(true)}>
          <div className={styles.avatar}>
            {profile?.avatar_uri ? (
              <ExternalImage src={profile.avatar_uri} alt="" className={styles.avatarImg} />
            ) : (
              <i className="bx bxs-user" />
            )}
          </div>
          <span className={styles.placeholder}>{t('composer.placeholder')}</span>
          <span className={styles.plusBtn}>
            <i className="bx bx-plus" />
          </span>
        </button>
      ) : (
        <div className={styles.expanded}>
          <div className={styles.expandedHeader}>
            <div className={styles.avatar}>
              {profile?.avatar_uri ? (
                <ExternalImage src={profile.avatar_uri} alt="" className={styles.avatarImg} />
              ) : (
                <i className="bx bxs-user" />
              )}
            </div>
          </div>
          <div className={styles.formArea}>
            <input
              type="text"
              className={styles.titleInput}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setError(null)
              }}
              maxLength={TITLE_MAX}
              placeholder={t('composer.titlePlaceholder')}
            />
            <textarea
              className={styles.contentInput}
              value={content}
              onChange={handleContentChange}
              rows={1}
              placeholder={t('composer.contentPlaceholder')}
            />
          </div>
          {error && <p className={styles.errorText}>{error}</p>}
          {media.length > 0 && (
            <div className={styles.mediaPreview}>
              {media.map((m, i) => (
                <div key={m.url} className={styles.mediaItem}>
                  {m.file.type.startsWith('video/') ? (
                    <>
                      <video src={m.url} muted playsInline preload="metadata" className={styles.mediaEl} />
                      <i className={`bx bx-play-circle ${styles.playIcon}`} />
                    </>
                  ) : (
                    <ExternalImage src={m.url} alt="" className={styles.mediaEl} />
                  )}
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeMedia(i)}
                    aria-label="Remove"
                  >
                    <i className="bx bx-x" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className={styles.footer}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className={styles.fileInput}
              onChange={handleFiles}
            />
            <button
              type="button"
              className={styles.mediaBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="bx bx-image-add" />
              <span>{t('composer.media')}</span>
            </button>
            <div className={styles.privacyWrap} ref={privacyRef}>
              <button
                type="button"
                className={styles.privacyBtn}
                onClick={() => setPrivacyOpen((v) => !v)}
              >
                <i className={`bx ${currentPrivacy.icon}`} />
                <span>{t(currentPrivacy.key)}</span>
                <i className="bx bx-chevron-down" />
              </button>
              {privacyOpen && (
                <div className={styles.privacyMenu}>
                  {PRIVACY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.privacyItem}${opt.value === privacy ? ` ${styles.privacyItemActive}` : ''}`}
                      onClick={() => {
                        setPrivacy(opt.value)
                        setPrivacyOpen(false)
                      }}
                    >
                      <i className={`bx ${opt.icon}`} />
                      <span>{t(opt.key)}</span>
                      {opt.value === privacy && <i className="bx bx-check" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className={`${styles.charCount}${contentLength > CONTENT_MAX ? ` ${styles.charCountOver}` : ''}`}>
              {t('composer.charCount', { count: contentLength, max: CONTENT_MAX })}
            </span>
            <button type="button" className={styles.cancelBtn} onClick={handleCancel}>
              {t('composer.cancel')}
            </button>
            <button
              type="button"
              className={styles.postBtn}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting && <i className="bx bx-loader-circle bx-spin" />}
              <span>{t('composer.post')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
