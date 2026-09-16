'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ExternalImage from '../ExternalImage'
import GifPicker from '../GifPicker'
import { useTranslation } from '../../hooks/useTranslation'
import { useToast } from '../../contexts/ToastContext'
import { uploadChatMedia } from '../../api/chats'
import { useAudioRecorder, type VoiceRecording } from '../../hooks/useAudioRecorder'
import { formatCallDuration } from '../../utils/chat'
import { EmojiImage } from './EmojiImage'
import VoicePlayer from './VoicePlayer'
import {
  EMOTION_GROUPS,
  getEmotionEmojis,
  type EmojiGroup,
  type EmotionEmojiItem,
} from '../../utils/emojis'
import type { ChatMessage, GifItem } from '../../types'
import type { ChatRoom } from '../../hooks/useChatRoom'
import styles from './ChatWindow.module.css'

function serializeContent(el: HTMLElement): string {
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

const SINGLE_URL_RE = /^https?:\/\/\S+$/i

function isSingleImageUrl(text: string): boolean {
  const trimmed = text.trim()
  if (!SINGLE_URL_RE.test(trimmed)) return false
  try {
    const u = new URL(trimmed)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function imageExtension(contentType: string): string {
  switch (contentType.split(';')[0].trim()) {
    case 'image/jpeg':
      return '.jpg'
    case 'image/gif':
      return '.gif'
    case 'image/webp':
      return '.webp'
    case 'image/png':
    default:
      return '.png'
  }
}

function normalizePastedFile(file: File): File {
  if (file.name && /\.[a-z0-9]+$/i.test(file.name)) return file
  return new File([file], `pasted-image${imageExtension(file.type)}`, { type: file.type })
}

async function fetchRemoteImage(url: string): Promise<File | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) return null
    const blob = await res.blob()
    return new File([blob], `image${imageExtension(contentType)}`, { type: contentType })
  } catch {
    return null
  }
}

interface ComposerProps {
  room: ChatRoom
  chatId: string | null
  replyingTo: ChatMessage | null
  forwarding: ChatMessage | null
  onClearReply: () => void
  onClearForward: () => void
  onScrollToMessage?: (messageId: string) => void
}

const MAX_ATTACHMENTS = 10

export default function Composer({ room, chatId, replyingTo, forwarding, onClearReply, onClearForward, onScrollToMessage }: ComposerProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [value, setValue] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [emojiGroup, setEmojiGroup] = useState<EmojiGroup>('positive')
  const [gifOpen, setGifOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([])
  const attachmentUrlsRef = useRef<string[]>([])
  const inputRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const toggleEmojiRef = useRef<HTMLButtonElement>(null)
  const toggleGifRef = useRef<HTMLButtonElement>(null)
  const gifPickerRef = useRef<HTMLDivElement>(null)
  const lastTypingRef = useRef(0)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const {
    supported: voiceSupported,
    recording: voiceRecording,
    elapsed: voiceElapsed,
    error: voiceError,
    start: startVoice,
    stop: stopVoice,
    cancel: cancelVoice,
  } = useAudioRecorder()
  const [pendingVoice, setPendingVoice] = useState<VoiceRecording | null>(null)
  const [voiceUploading, setVoiceUploading] = useState(false)

  const emotions = useMemo(() => getEmotionEmojis(), [])
  const emotionGroups = useMemo(() => {
    const map = new Map<EmojiGroup, EmotionEmojiItem[]>()
    for (const g of EMOTION_GROUPS) {
      map.set(g, emotions.filter((e) => e.group === g))
    }
    return map
  }, [emotions])

  const sendTyping = room.sendTyping

  const hasContent = Boolean(value.trim())

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
      attachmentUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      attachmentUrlsRef.current = []
      sendTyping(false)
    }
  }, [sendTyping])

  // Forward: khi có tin chuyển tiếp được chọn, điền sẵn nội dung vào khung soạn
  // để người dùng có thể sửa trước khi gửi. Gắn forwarded_from khi click gửi.
  useEffect(() => {
    if (!forwarding || !inputRef.current) return
    const el = inputRef.current
    el.innerHTML = ''
    if (forwarding.content) {
      el.appendChild(document.createTextNode(forwarding.content))
      el.focus()
      const sel = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    setValue(forwarding.content || '')
  }, [forwarding])

  const attachFile = (file: File) => {
    const url = URL.createObjectURL(file)
    attachmentUrlsRef.current = [...attachmentUrlsRef.current, url]
    setAttachments((prev) => [...prev, file])
    setAttachmentUrls((prev) => [...prev, url])
  }

  const removeAttachment = (index: number) => {
    const revoked = attachmentUrlsRef.current[index]
    if (revoked) URL.revokeObjectURL(revoked)
    attachmentUrlsRef.current = attachmentUrlsRef.current.filter((_, i) => i !== index)
    setAttachments((prev) => prev.filter((_, i) => i !== index))
    setAttachmentUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAttachments = () => {
    attachmentUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    attachmentUrlsRef.current = []
    setAttachments([])
    setAttachmentUrls([])
  }

  useEffect(() => {
    if (!emojiOpen && !gifOpen) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (pickerRef.current?.contains(target)) return
      if (toggleEmojiRef.current?.contains(target)) return
      if (gifPickerRef.current?.contains(target)) return
      if (toggleGifRef.current?.contains(target)) return
      setEmojiOpen(false)
      setGifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [emojiOpen, gifOpen])

  const insertNodeAtCaret = (node: Node) => {
    const el = inputRef.current
    if (!el) return
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
    setValue(serializeContent(el))
  }

  const insertEmoji = (emoji: EmotionEmojiItem) => {
    const img = document.createElement('img')
    img.src = emoji.image_uri
    img.alt = emoji.code
    img.dataset.code = emoji.code
    img.className = 'emojiInline'
    insertNodeAtCaret(img)
  }

  const insertText = (text: string) => {
    insertNodeAtCaret(document.createTextNode(text))
  }

  const handleInput = () => {
    const el = inputRef.current
    if (!el) return
    const v = serializeContent(el)
    setValue(v)
    const now = Date.now()
    if (v.trim() && now - lastTypingRef.current > 800) {
      lastTypingRef.current = now
      sendTyping(true)
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
      stopTimerRef.current = setTimeout(() => sendTyping(false), 1500)
    }
  }

  const resetComposer = () => {
    setValue('')
    if (inputRef.current) inputRef.current.innerHTML = ''
    setEmojiOpen(false)
    sendTyping(false)
  }

  const selectGif = (gif: GifItem) => {
    room.sendMessage('', {
      gifUrl: gif.preview,
      mediaUri: gif.preview,
      mediaType: 'image/gif',
      replyToMessageId: replyingTo?.id || undefined,
    })
    setGifOpen(false)
    onClearReply()
  }

  const sendFile = async (file: File, caption: string): Promise<boolean> => {
    if (uploading || !chatId) return false
    setUploading(true)
    try {
      const res = await uploadChatMedia(file, chatId)
      room.sendMessage(caption, {
        mediaId: res.data.id,
        mediaUri: res.data.file_uri,
        mediaType: res.data.file_type,
        replyToMessageId: replyingTo?.id || undefined,
      })
      return true
    } catch {
      toast({ type: 'error', title: t('chat.uploadFailed') })
      return false
    } finally {
      setUploading(false)
    }
  }

  const handleVoiceMic = async () => {
    if (voiceRecording) {
      const rec = await stopVoice()
      if (rec) setPendingVoice(rec)
      return
    }
    if (pendingVoice) {
      URL.revokeObjectURL(pendingVoice.url)
      setPendingVoice(null)
    }
    await startVoice()
    if (voiceError) {
      toast({ type: 'error', title: t(`chat.${voiceError}`) })
    }
  }

  const handleVoiceCancel = () => {
    cancelVoice()
    if (pendingVoice) {
      URL.revokeObjectURL(pendingVoice.url)
      setPendingVoice(null)
    }
  }

  const sendVoice = async () => {
    if (!pendingVoice || voiceUploading || !chatId) return
    setVoiceUploading(true)
    const { blob, url, duration } = pendingVoice
    try {
      const ext = blob.type.includes('mp4') || blob.type.includes('aac') ? 'm4a' : 'webm'
      const file = new File([blob], `voice.${ext}`, { type: blob.type })
      const res = await uploadChatMedia(file, chatId, duration)
      room.sendMessage('', {
        mediaId: res.data.id,
        mediaUri: res.data.file_uri,
        mediaType: res.data.file_type,
        durationSeconds: res.data.duration_seconds ?? duration,
        replyToMessageId: replyingTo?.id || undefined,
      })
      URL.revokeObjectURL(url)
      setPendingVoice(null)
      onClearReply()
    } catch {
      toast({ type: 'error', title: t('chat.uploadFailed') })
    } finally {
      setVoiceUploading(false)
    }
  }

  const sendAttachmentBatch = async (files: File[], caption: string) => {
    if (!chatId) return
    setUploading(true)
    try {
      const results = await Promise.allSettled(files.map((file) => uploadChatMedia(file, chatId)))
      const replyId = replyingTo?.id || undefined
      const mediaGroupId = crypto.randomUUID()
      let sentAny = false
      for (let i = 0; i < results.length; i++) {
        const res = results[i]
        if (res.status !== 'fulfilled') {
          toast({ type: 'error', title: t('chat.uploadFailed') })
          continue
        }
        const msgCaption = i === 0 ? caption : ''
        room.sendMessage(msgCaption, {
          mediaId: res.value.data.id,
          mediaUri: res.value.data.file_uri,
          mediaType: res.value.data.file_type,
          mediaGroupId,
          replyToMessageId: i === 0 ? replyId : undefined,
        })
        sentAny = true
      }
      if (sentAny) onClearReply()
    } finally {
      setUploading(false)
    }
  }

  const send = async (opts?: { emojiId?: string; mediaId?: string; mediaUri?: string; mediaType?: string }) => {
    const canAutoEmoji = Boolean(!value.trim() && forwarding?.emoji_id)
    if (!value.trim() && !canAutoEmoji && !opts?.emojiId && !opts?.mediaId && attachments.length === 0) return
    const text = value
    const replyId = replyingTo?.id || undefined
    const forwardedId = forwarding?.id

    if (attachments.length > 0) {
      await sendAttachmentBatch(attachments, text)
      clearAttachments()
      resetComposer()
      onClearForward()
      return
    }

    // Toàn bộ tin là một URL duy nhất → thử tải ảnh về rồi gửi dạng media.
    if (!opts && !replyId && !forwardedId && isSingleImageUrl(text)) {
      const file = await fetchRemoteImage(text)
      if (file) {
        resetComposer()
        const ok = await sendFile(file, '')
        if (ok) {
          onClearReply()
          return
        }
        // Upload ảnh thất bại → fallback gửi URL dạng text để không mất tin nhắn.
        room.sendMessage(text, { replyToMessageId: replyId })
        onClearReply()
        return
      }
    }

    room.sendMessage(text, {
      ...opts,
      replyToMessageId: replyId,
      forwardedFrom: forwardedId,
      emojiId: opts?.emojiId ?? (canAutoEmoji ? (forwarding?.emoji_id ?? undefined) : undefined),
    })
    resetComposer()
    onClearReply()
    onClearForward()
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0 || uploading) return
    const allowed = MAX_ATTACHMENTS - attachments.length
    const toAdd = files.slice(0, Math.max(allowed, 0))
    if (files.length > allowed) {
      toast({ type: 'warning', title: t('chat.tooManyFiles') })
    }
    toAdd.forEach(attachFile)
  }

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items
    let file: File | null = null
    if (items) {
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          file = item.getAsFile()
          break
        }
      }
    }
    if (file) {
      e.preventDefault()
      attachFile(normalizePastedFile(file))
      return
    }
    const text = e.clipboardData.getData('text/plain')
    if (text) {
      e.preventDefault()
      insertText(text)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className={styles.composer}>
      {attachments.length > 0 && (
        <div className={styles.attachmentBar}>
          <div className={styles.attachmentGrid}>
            {attachments.map((attachment, index) => {
              const attachmentUrl = attachmentUrls[index]
              return (
                <span key={index} className={styles.attachmentThumb}>
                  {attachment.type.startsWith('video/') ? (
                    <video src={attachmentUrl} muted preload="metadata" />
                  ) : (
                    <ExternalImage src={attachmentUrl} alt="" />
                  )}
                  <button
                    type="button"
                    className={styles.attachmentRemove}
                    onClick={() => removeAttachment(index)}
                    title={t('chat.removeAttachment')}
                    aria-label={t('chat.removeAttachment')}
                  >
                    <i className="bx bx-x" />
                  </button>
                </span>
              )
            })}
          </div>
          <button
            type="button"
            className={styles.attachmentClearAll}
            onClick={clearAttachments}
            title={t('chat.removeAll')}
            aria-label={t('chat.removeAll')}
          >
            {t('chat.removeAll')}
          </button>
        </div>
      )}
      {replyingTo && (
        <div className={styles.replyBar}>
          <div className={styles.replyBarContent}>
            <div className={styles.replyBarLabel}>
              <i className="bx bx-reply" />
              {replyingTo.sender_id === 'SYSTEM' ? 'System' : (replyingTo.sender_name || t('chat.unknown'))}
            </div>
            <span className={styles.replyBarSnippet}>
              {replyingTo.deleted ? t('chat.messageDeleted') : replyingTo.content || t('chat.attachment')}
            </span>
          </div>
          <button
            type="button"
            className={styles.replyBarCancel}
            onClick={onClearReply}
            title={t('chat.cancelReply')}
            aria-label={t('chat.cancelReply')}
          >
            <i className="bx bx-x" />
          </button>
        </div>
      )}
      {forwarding && (
        <div className={styles.forwardBar}>
          <div className={styles.forwardBarContent}>
            <div className={styles.forwardBarLabel}>
              <i className="bx bx-arrow-forward" />
              {t('chat.forwarding')}
            </div>
            <span className={styles.forwardBarSnippet}>
              {forwarding.content || t('chat.attachment')}
            </span>
          </div>
          <button
            type="button"
            className={styles.forwardBarCancel}
            onClick={onClearForward}
            title={t('chat.cancelForward')}
            aria-label={t('chat.cancelForward')}
          >
            <i className="bx bx-x" />
          </button>
        </div>
      )}
      <div className={styles.composerRow}>
        <div className={styles.composerActions}>
          <button
            ref={toggleEmojiRef}
            className={`${styles.iconBtn} ${emojiOpen ? styles.iconBtnActive : ''}`}
            onClick={() => {
              setGifOpen(false)
              setEmojiOpen((prev) => !prev)
            }}
            aria-label={t('chat.emojiPicker')}
            title={t('chat.emojiPicker')}
          >
            <i className="bx bxs-smile" />
          </button>
          <button
            ref={toggleGifRef}
            className={`${styles.iconBtn} ${gifOpen ? styles.iconBtnActive : ''}`}
            onClick={() => {
              setEmojiOpen(false)
              setGifOpen((prev) => !prev)
            }}
            aria-label={t('chat.gif')}
            title={t('chat.gif')}
          >
            <i className="bx bx-movie" />
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label={t('chat.attach')}
            title={t('chat.attach')}
          >
            <i className="bx bx-paperclip" />
          </button>
          <button
            className={`${styles.iconBtn} ${voiceRecording ? styles.iconBtnActive : ''}`}
            onClick={() => void handleVoiceMic()}
            disabled={voiceUploading || !voiceSupported || uploading}
            aria-label={t('chat.recordVoice')}
            title={t('chat.recordVoice')}
          >
            <i className="bx bx-microphone" />
          </button>
        </div>
        {voiceRecording ? (
          <div className={styles.voiceInput}>
            <span className={styles.recordingPulse} />
            <span className={styles.recordingTimer}>{formatCallDuration(voiceElapsed)}</span>
          </div>
        ) : pendingVoice ? (
          <div className={styles.voiceInput}>
            <VoicePlayer src={pendingVoice.url} duration={pendingVoice.duration} />
          </div>
        ) : (
          <div className={styles.composerWrap}>
            <div
              ref={inputRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label={t('chat.placeholder')}
              aria-multiline="true"
              className={styles.composerInput}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
            />
            {!hasContent && (
              <span className={styles.composerPlaceholder}>{t('chat.placeholder')}</span>
            )}
          </div>
        )}
        {voiceRecording ? (
          <button
            type="button"
            className={styles.voiceStopBtn}
            onClick={() => void handleVoiceMic()}
            aria-label={t('chat.recordingStopped')}
            title={t('chat.recordingStopped')}
          >
            <i className="bx bx-stop" />
          </button>
        ) : pendingVoice ? (
          <>
            <button
              type="button"
              className={styles.voiceCancelBtn}
              onClick={handleVoiceCancel}
              aria-label={t('chat.cancelVoice')}
              title={t('chat.cancelVoice')}
            >
              <i className="bx bx-x" />
            </button>
            <button
              type="button"
              className={styles.voiceSendBtn}
              onClick={() => void sendVoice()}
              disabled={voiceUploading}
              aria-label={t('chat.sendVoice')}
              title={t('chat.sendVoice')}
            >
              <i className={voiceUploading ? 'bx bx-loader-circle bx-spin' : 'bx bx-send'} />
            </button>
          </>
        ) : (
          <button
            className={styles.sendBtn}
            onClick={() => send()}
            disabled={(!value.trim() && !forwarding?.emoji_id && attachments.length === 0) || uploading}
            aria-label={t('chat.send')}
          >
            <i className={uploading ? 'bx bx-loader-circle bx-spin' : 'bx bx-send'} />
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={handleFile} />
      {emojiOpen && (
        <div ref={pickerRef} className={styles.emojiPicker}>
          <div className={styles.emojiTabs}>
            {EMOTION_GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                className={`${styles.emojiTab} ${emojiGroup === g ? styles.emojiTabActive : ''}`}
                onClick={() => setEmojiGroup(g)}
              >
                {t(`chat.emojiCat.${g}`)}
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
                <EmojiImage emoji={e} className={styles.emojiItemImg} />
              </button>
            ))}
          </div>
        </div>
      )}
      {gifOpen && (
        <div ref={gifPickerRef} className={styles.gifPickerWrap}>
          <GifPicker placement="top" onSelect={selectGif} onClose={() => setGifOpen(false)} />
        </div>
      )}
    </div>
  )
}
