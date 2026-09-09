'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import useSWR from 'swr'
import ExternalImage from './ExternalImage'
import GifPicker from './GifPicker'
import styles from './CreatePostModal.module.css'
import { request } from '../api/api'
import { createPost } from '../api/posts'
import { useToast } from '../contexts/ToastContext'
import { useTranslation } from '../hooks/useTranslation'
import { EMOTION_GROUPS, getEmotionEmojis, type EmotionEmojiItem } from '../utils/emojis'
import type { ViewProfileResponse, PostStatus, FeedPost, GifItem } from '../types'

interface CreatePostModalProps {
  open: boolean
  onClose: () => void
}

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

function serializeEmojiContent(el: HTMLElement): string {
  let out = ''
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? ''
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const n = node as HTMLElement
    if (n.dataset.code) {
      out += n.dataset.code
      return
    }
    const tag = n.tagName
    if (tag === 'BR') {
      out += '\n'
      return
    }
    if (tag === 'DIV' || tag === 'P') {
      if (out && !out.endsWith('\n')) out += '\n'
      node.childNodes.forEach(walk)
      if (!out.endsWith('\n')) out += '\n'
      return
    }
    node.childNodes.forEach(walk)
  }
  walk(el)
  return out.replace(/\n{3,}/g, '\n\n')
}

function insertNodeAtCaret(el: HTMLElement, node: Node) {
  el.focus()
  const sel = window.getSelection()
  let range: Range
  if (sel && sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    range = sel.getRangeAt(0)
  } else {
    range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
  }
  range.deleteContents()
  range.insertNode(node)
  range.setStartAfter(node)
  range.collapse(true)
  sel?.removeAllRanges()
  sel?.addRange(range)
}

const PRIVACY_OPTIONS: { value: PostStatus; icon: string; key: string }[] = [
  { value: 'public', icon: 'bx-globe', key: 'composer.privacy.public' },
  { value: 'friend', icon: 'bx-group', key: 'composer.privacy.friend' },
  { value: 'private', icon: 'bx-lock-alt', key: 'composer.privacy.private' },
]

export default function CreatePostModal({ open, onClose }: CreatePostModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { profile } = useProfile()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [privacy, setPrivacy] = useState<PostStatus>('public')
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [media, setMedia] = useState<{ file: File; url: string }[]>([])
  const [gif, setGif] = useState<GifItem | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [gifOpen, setGifOpen] = useState(false)
  const [emojiGroup, setEmojiGroup] = useState<EmotionEmojiItem['group']>('positive')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const privacyRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const gifRef = useRef<HTMLDivElement>(null)
  const mediaUrlsRef = useRef<string[]>([])

  const emotions = useMemo(() => getEmotionEmojis(), [])
  const emotionGroups = useMemo(() => {
    const map = new Map<EmotionEmojiItem['group'], EmotionEmojiItem[]>()
    for (const g of EMOTION_GROUPS) {
      map.set(g, emotions.filter((e) => e.group === g))
    }
    return map
  }, [emotions])

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
    if (!emojiOpen && !gifOpen) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (emojiRef.current?.contains(target)) return
      if (gifRef.current?.contains(target)) return
      setEmojiOpen(false)
      setGifOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [emojiOpen, gifOpen])

  useEffect(() => {
    const urls = mediaUrlsRef.current
    return () => { for (const u of urls) URL.revokeObjectURL(u) }
  }, [])

  useEffect(() => {
    const newUrls = media.map((m) => m.url)
    const prevUrls = mediaUrlsRef.current
    const toRevoke = prevUrls.filter((u) => !newUrls.includes(u))
    for (const u of toRevoke) URL.revokeObjectURL(u)
    mediaUrlsRef.current = newUrls
  }, [media])

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

  const removeGif = () => {
    setGif(null)
    setError(null)
  }

  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    setContent(serializeEmojiContent(e.currentTarget))
    setError(null)
  }

  const insertEmoji = (emoji: EmotionEmojiItem) => {
    const el = contentRef.current
    if (!el) {
      setContent((prev) => prev + emoji.code)
      return
    }
    const img = document.createElement('img')
    img.src = emoji.image_uri
    img.alt = emoji.code
    img.dataset.code = emoji.code
    img.className = 'emojiInline'
    insertNodeAtCaret(el, img)
    setContent(serializeEmojiContent(el))
    setError(null)
  }

  const selectGif = (item: GifItem) => {
    setGif(item)
    setGifOpen(false)
    setError(null)
  }

  const contentLength = Array.from(content).length
  const currentPrivacy = PRIVACY_OPTIONS.find((o) => o.value === privacy) ?? PRIVACY_OPTIONS[0]

  const validate = (): string | null => {
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    const hasFiles = media.length > 0 || gif !== null
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

  const resetForm = () => {
    setTitle('')
    setContent('')
    if (contentRef.current) contentRef.current.innerHTML = ''
    setPrivacy('public')
    setPrivacyOpen(false)
    setMedia([])
    setGif(null)
    setEmojiOpen(false)
    setGifOpen(false)
    setError(null)
  }

  const handleClose = useCallback(() => {
    if (submitting) return
    resetForm()
    onClose()
  }, [submitting, onClose])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKey)
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.documentElement.style.overflow = prev
    }
  }, [open, handleClose])

  const handleSubmit = async () => {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setError(null)
    setSubmitting(true)
    try {
      const res = await createPost({
        title: title.trim(),
        content: content.trim(),
        status: privacy,
        files: media.map((m) => m.file),
        gifUrl: gif?.full,
      })
      toast({ type: 'success', title: t('composer.success') })
      window.dispatchEvent(new CustomEvent<FeedPost>('post:created', { detail: res.data }))
      resetForm()
      onClose()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.scrollContent}>
          <div className={styles.header}>
            <div className={styles.avatar}>
              {profile?.avatar_uri ? (
                <ExternalImage src={profile.avatar_uri} alt="" />
              ) : (
                <i className="bx bxs-user" />
              )}
            </div>
            <span className={styles.authorName}>
              {profile?.display_name || profile?.username || ''}
            </span>
          </div>

          <div className={styles.formArea}>
            <input
              type="text"
              className={styles.titleInput}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(null) }}
              maxLength={TITLE_MAX}
              placeholder={t('composer.titlePlaceholder')}
            />
            <div
              ref={contentRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label={t('composer.contentPlaceholder')}
              data-placeholder={t('composer.contentPlaceholder')}
              className={styles.contentInput}
              onInput={handleContentChange}
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
                    className={styles.removeMediaBtn}
                    onClick={() => removeMedia(i)}
                    aria-label="Remove"
                  >
                    <i className="bx bx-x" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {gif && (
            <div className={styles.mediaPreview}>
              <div className={styles.mediaItem}>
                <ExternalImage src={gif.preview} alt={gif.title ?? ''} className={styles.mediaEl} />
                <button type="button" className={styles.removeMediaBtn} onClick={removeGif} aria-label="Remove">
                  <i className="bx bx-x" />
                </button>
              </div>
            </div>
          )}

          <div className={styles.toolbar}>
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
              className={styles.toolbarBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="bx bx-image-add" />
              <span>{t('composer.media')}</span>
            </button>

            <div className={styles.pickerWrap} ref={emojiRef}>
              <button
                type="button"
                className={`${styles.toolbarBtn}${emojiOpen ? ` ${styles.toolbarBtnActive}` : ''}`}
                onClick={() => { setEmojiOpen((v) => !v); setGifOpen(false) }}
              >
                <i className="bx bxs-smile" />
                <span>{t('composer.emoji')}</span>
              </button>
              {emojiOpen && (
                <div className={styles.emojiPicker}>
                  <div className={styles.emojiTabs}>
                    {EMOTION_GROUPS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        className={`${styles.emojiTab} ${emojiGroup === g ? styles.emojiTabActive : ''}`}
                        onClick={() => setEmojiGroup(g)}
                      >
                        {t(`composer.emojiCat.${g}`)}
                      </button>
                    ))}
                  </div>
                  <div className={styles.emojiGrid}>
                    {emotionGroups.get(emojiGroup)?.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        className={styles.emojiItem}
                        onClick={() => insertEmoji(e)}
                        title={`${e.label} ${e.code}`}
                      >
                        <ExternalImage src={e.image_uri} alt={e.label} className={styles.emojiItemImg} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.gifPickerWrap} ref={gifRef}>
              <button
                type="button"
                className={`${styles.toolbarBtn}${gifOpen ? ` ${styles.toolbarBtnActive}` : ''}`}
                onClick={() => { setGifOpen((v) => !v); setEmojiOpen(false) }}
              >
                <i className="bx bx-movie" />
                <span>{t('composer.gif')}</span>
              </button>
              {gifOpen && <GifPicker onSelect={selectGif} onClose={() => setGifOpen(false)} />}
            </div>

            <div className={styles.privacyWrap} ref={privacyRef}>
              <button
                type="button"
                className={styles.toolbarBtn}
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
                      onClick={() => { setPrivacy(opt.value); setPrivacyOpen(false) }}
                    >
                      <i className={`bx ${opt.icon}`} />
                      <span>{t(opt.key)}</span>
                      {opt.value === privacy && <i className={`bx bx-check ${styles.bxCheck}`} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className={`${styles.charCount}${contentLength > CONTENT_MAX ? ` ${styles.charCountOver}` : ''}`}>
              {t('composer.charCount', { count: contentLength, max: CONTENT_MAX })}
            </span>
          </div>
        </div>

        <div className={styles.footerActions}>
          <button type="button" className={styles.cancelBtn} onClick={handleClose} disabled={submitting}>
            {t('composer.cancel')}
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <i className="bx bx-loader-circle bx-spin" />}
            <span>{t('composer.post')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
