'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import useSWR from 'swr'
import ExternalImage from './ExternalImage'
import GifPicker from './GifPicker'
import EmojiPicker from './EmojiPicker'
import styles from './CreatePostModal.module.css'
import { request } from '../api/api'
import { createPost } from '../api/posts'
import { useToast } from '../contexts/ToastContext'
import { useTranslation } from '../hooks/useTranslation'
import { getEmotionEmojis, type EmotionEmojiItem } from '../utils/emojis'
import type { EmojiOption } from '../utils/emojifyi'
import type { ViewProfileResponse, PostStatus, FeedPost, GifItem } from '../types'

interface CreatePostModalProps {
  open: boolean
  onClose: () => void
  initialPicker?: 'media' | 'emoji' | 'gif'
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
const DRAFT_KEY = 'linkup.composer.draft'
const CHAR_WARN_AT = Math.floor(CONTENT_MAX * 0.8)
const DRAFT_SAVE_DEBOUNCE = 400

interface ComposerDraft {
  title: string
  content: string
  privacy: PostStatus
  commentsDisabled: boolean
  gif: GifItem | null
  savedAt: number
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function contentToHtml(text: string, emojiByCode: Map<string, EmotionEmojiItem>): string {
  return escapeHtml(text)
    .replace(/\n/g, '<br>')
    .replace(/:[a-zA-Z0-9_+-]+:/g, (code) => {
      const emoji = emojiByCode.get(code)
      if (!emoji) return code
      return `<img class="emojiInline" src="${escapeHtml(emoji.image_uri)}" alt="${escapeHtml(emoji.code)}" data-code="${escapeHtml(emoji.code)}">`
    })
}

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
    if (n.dataset.emoji) {
      // Bọc URL bằng space — URL ảnh emoji liền nhau không separator sẽ bị coi là 1 URL duy nhất khi render.
      if (out && !/\s$/.test(out)) out += ' '
      out += n.dataset.emoji + ' '
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
  // Chuẩn hóa: bỏ space thừa trước \n và space cuối (do URL emoji được bọc space).
  return out.replace(/ +\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/ +$/, '')
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

export default function CreatePostModal({ open, onClose, initialPicker }: CreatePostModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { profile } = useProfile()

  const [title, setTitle] = useState('')
  const [titleOpen, setTitleOpen] = useState(false)
  const [content, setContent] = useState('')
  const [privacy, setPrivacy] = useState<PostStatus>('public')
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [media, setMedia] = useState<{ file: File; url: string }[]>([])
  const [gif, setGif] = useState<GifItem | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [gifOpen, setGifOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [commentsDisabled, setCommentsDisabled] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)

  const privacyRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const gifRef = useRef<HTMLDivElement>(null)
  const mediaUrlsRef = useRef<string[]>([])

  const emotions = useMemo(() => getEmotionEmojis(), [])
  const emojiByCode = useMemo(() => new Map(emotions.map((e) => [e.code, e])), [emotions])

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

  const resetForm = useCallback(() => {
    setTitle('')
    setTitleOpen(false)
    setContent('')
    if (contentRef.current) contentRef.current.innerHTML = ''
    setPrivacy('public')
    setPrivacyOpen(false)
    setMedia([])
    setGif(null)
    setEmojiOpen(false)
    setGifOpen(false)
    setError(null)
    setCommentsDisabled(false)
    setDraftRestored(false)
  }, [])

  const writeDraft = useCallback(() => {
    try {
      if (!(title.trim() !== '' || content.trim() !== '' || gif !== null)) {
        localStorage.removeItem(DRAFT_KEY)
        return
      }
      const draft: ComposerDraft = {
        title,
        content,
        privacy,
        commentsDisabled,
        gif,
        savedAt: Date.now(),
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      /* localStorage unavailable — draft silently skipped */
    }
  }, [title, content, privacy, commentsDisabled, gif])

  const readDraft = (): ComposerDraft | null => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as ComposerDraft
      if (!parsed || typeof parsed !== 'object') return null
      if (!parsed.title && !parsed.content && !parsed.gif) return null
      return parsed
    } catch {
      return null
    }
  }

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => writeDraft(), DRAFT_SAVE_DEBOUNCE)
    return () => clearTimeout(timer)
  }, [open, writeDraft])

  useEffect(() => {
    if (!open) return
    const draft = readDraft()
    if (!draft) return
    // Hydrating form state from localStorage — an external system sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(draft.title || '')
    setPrivacy(draft.privacy ?? 'public')
    setCommentsDisabled(!!draft.commentsDisabled)
    if (draft.gif) setGif(draft.gif)
    if (draft.title) setTitleOpen(true)
    if (draft.content) {
      setContent(draft.content)
      if (contentRef.current) {
        contentRef.current.innerHTML = contentToHtml(draft.content, emojiByCode)
      }
    }
    setDraftRestored(true)
  }, [open, emojiByCode])

  useEffect(() => {
    if (!open || !initialPicker) return
    if (initialPicker === 'media') {
      fileInputRef.current?.click()
    } else if (initialPicker === 'emoji') {
      // Opening a picker in response to the initialPicker prop.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGifOpen(false)
      setEmojiOpen(true)
    } else if (initialPicker === 'gif') {
      setEmojiOpen(false)
      setGifOpen(true)
    }
  }, [open, initialPicker])

  const handleClose = useCallback(() => {
    if (submitting) return
    writeDraft()
    resetForm()
    onClose()
  }, [submitting, writeDraft, resetForm, onClose])

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

  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* localStorage unavailable */
    }
    resetForm()
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

  const removeGif = () => {
    setGif(null)
    setError(null)
  }

  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    setContent(serializeEmojiContent(e.currentTarget))
    setError(null)
  }

  const insertEmoji = (emoji: EmojiOption) => {
    const el = contentRef.current
    if (!el) {
      setContent((prev) => prev + emoji.url)
      return
    }
    const img = document.createElement('img')
    img.src = emoji.url
    img.alt = emoji.title || 'emoji'
    img.dataset.emoji = emoji.url
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

  const openTitle = () => {
    setTitleOpen(true)
    requestAnimationFrame(() => titleRef.current?.focus())
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
        commentsEnabled: !commentsDisabled,
      })
      toast({ type: 'success', title: t('composer.success') })
      try {
        localStorage.removeItem(DRAFT_KEY)
      } catch {
        /* localStorage unavailable */
      }
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
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label={t('common.close')}
          >
            <i className="bx bx-x" />
          </button>
        </div>

        <div className={styles.scrollContent}>
          {draftRestored && (
            <div className={styles.draftChip}>
              <i className="bx bx-history" />
              <span>{t('composer.draftRestored')}</span>
              <button type="button" onClick={discardDraft}>
                {t('composer.discardDraft')}
              </button>
            </div>
          )}

          <div className={styles.formArea}>
            {!titleOpen ? (
              <button type="button" className={styles.titleToggle} onClick={openTitle}>
                <i className="bx bx-plus" />
                <span>{t('composer.addTitle')}</span>
              </button>
            ) : (
              <input
                type="text"
                ref={titleRef}
                className={styles.titleInput}
                value={title}
                onChange={(e) => { setTitle(e.target.value); setError(null) }}
                maxLength={TITLE_MAX}
                placeholder={t('composer.titlePlaceholder')}
              />
            )}
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
            {contentLength >= CHAR_WARN_AT && (
              <span
                className={`${styles.charCount}${contentLength > CONTENT_MAX ? ` ${styles.charCountOver}` : ` ${styles.charCountWarn}`}`}
              >
                {t('composer.charCount', { count: contentLength, max: CONTENT_MAX })}
              </span>
            )}
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
        </div>

        <div className={styles.options}>
          <div className={styles.optionWrap} ref={privacyRef}>
            <button
              type="button"
              className={`${styles.optionRow} ${styles.optionRowBtn}`}
              onClick={() => setPrivacyOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={privacyOpen}
            >
              <i className={`bx ${currentPrivacy.icon} ${styles.optionIcon}`} />
              <span className={styles.optionLabel}>{t(currentPrivacy.key)}</span>
              <i className={`bx bx-chevron-down ${styles.optionChevron}`} />
            </button>
            {privacyOpen && (
              <div className={styles.privacyMenu} role="menu">
                {PRIVACY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="menuitem"
                    className={`${styles.privacyItem}${opt.value === privacy ? ` ${styles.privacyItemActive}` : ''}`}
                    onClick={() => {
                      setPrivacy(opt.value)
                      setPrivacyOpen(false)
                    }}
                  >
                    <i className={`bx ${opt.icon}`} />
                    <span>{t(opt.key)}</span>
                    {opt.value === privacy && <i className={`bx bx-check ${styles.bxCheck}`} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={styles.optionRow}>
            <i className={`bx bx-message-rounded-dots ${styles.optionIcon}`} />
            <span className={styles.optionLabel}>{t('composer.comments')}</span>
            <span className={styles.optionValue}>
              {commentsDisabled ? t('composer.commentsOff') : t('composer.commentsOn')}
            </span>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={!commentsDisabled}
                onChange={(e) => setCommentsDisabled(!e.target.checked)}
                aria-label={t('composer.comments')}
              />
              <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb} />
              </span>
            </label>
          </div>
        </div>

        <div className={styles.footerActions}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className={styles.fileInput}
            onChange={handleFiles}
          />
          <div className={styles.attachGroup}>
            <button
              type="button"
              className={styles.attachIconBtn}
              onClick={() => fileInputRef.current?.click()}
              aria-label={t('composer.media')}
              title={t('composer.media')}
            >
              <i className="bx bx-image-add" />
            </button>
            <div className={styles.pickerWrap} ref={gifRef}>
              <button
                type="button"
                className={`${styles.attachIconBtn}${gifOpen ? ` ${styles.attachIconBtnActive}` : ''}`}
                onClick={() => { setGifOpen((v) => !v); setEmojiOpen(false) }}
                aria-label={t('composer.gif')}
                title={t('composer.gif')}
              >
                <i className="bx bx-movie" />
              </button>
              {gifOpen && <GifPicker onSelect={selectGif} onClose={() => setGifOpen(false)} placement="top" />}
            </div>
            <div className={styles.pickerWrap} ref={emojiRef}>
              <button
                type="button"
                className={`${styles.attachIconBtn}${emojiOpen ? ` ${styles.attachIconBtnActive}` : ''}`}
                onClick={() => { setEmojiOpen((v) => !v); setGifOpen(false) }}
                aria-label={t('composer.emoji')}
                title={t('composer.emoji')}
              >
                <i className="bx bxs-smile" />
              </button>
              {emojiOpen && (
                <EmojiPicker
                  placement="top"
                  onSelect={insertEmoji}
                  onClose={() => setEmojiOpen(false)}
                  ignoreRef={emojiRef}
                />
              )}
            </div>
          </div>
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
