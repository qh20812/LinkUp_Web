'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import type { ChatMessage } from '../../types'
import { downloadMessageMedia } from '../../api/chats'

// Cache media trong session: tránh tải lại blob khi mở lại hội thoại, và lưu
// tỉ lệ ảnh để render lại reserve đúng chỗ, giảm layout shift.
export const mediaBlobCache = new Map<string, { url: string; isVideo: boolean }>()
export const mediaRatioCache = new Map<string, { width: number; height: number }>()

export interface UseMessageMediaOptions {
  eager?: boolean
}

export interface MessageMediaState {
  src: string | null
  isVideo: boolean
  failed: boolean
  loading: boolean
  boxRef: RefObject<HTMLSpanElement | null>
}

export function useMessageMedia(
  message: ChatMessage,
  opts: UseMessageMediaOptions = {},
): MessageMediaState {
  const cached = mediaBlobCache.get(message.id)
  const [src, setSrc] = useState<string | null>(message.media_uri ?? cached?.url ?? null)
  const [isVideo, setIsVideo] = useState(
    message.media_type?.startsWith('video/') ?? cached?.isVideo ?? false,
  )
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(() => !(message.media_uri ?? cached?.url))
  const objectUrlRef = useRef<string | null>(null)
  const boxRef = useRef<HTMLSpanElement>(null)

  const needsDownload = !message.media_uri && !src

  useEffect(() => {
    if (!needsDownload) return
    if (mediaBlobCache.has(message.id)) return
    let cancelled = false
    let started = false
    let observer: IntersectionObserver | null = null
    const runDownload = () => {
      if (started || cancelled) return
      started = true
      downloadMessageMedia(message.id)
        .then((blob) => {
          if (cancelled) return
          const url = URL.createObjectURL(blob)
          const isVideoBlob = blob.type.startsWith('video/')
          mediaBlobCache.set(message.id, { url, isVideo: isVideoBlob })
          objectUrlRef.current = url
          setSrc(url)
          setIsVideo(isVideoBlob)
          setLoading(false)
        })
        .catch(() => {
          if (cancelled) return
          setFailed(true)
          setLoading(false)
        })
    }
    if (opts.eager || typeof IntersectionObserver === 'undefined') {
      runDownload()
    } else {
      const el = boxRef.current
      if (!el) {
        runDownload()
      } else {
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              runDownload()
              observer?.disconnect()
            }
          },
          { rootMargin: '200px' },
        )
        observer.observe(el)
      }
    }
    return () => {
      cancelled = true
      observer?.disconnect()
      if (
        objectUrlRef.current &&
        mediaBlobCache.get(message.id)?.url !== objectUrlRef.current
      ) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
      objectUrlRef.current = null
    }
  }, [message.id, message.media_uri, needsDownload, opts.eager])

  return { src, isVideo, failed, loading, boxRef }
}
