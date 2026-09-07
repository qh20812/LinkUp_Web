'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type VoiceRecording = {
  blob: Blob
  url: string
  duration: number
}

// Ghi âm tin nhắn thoại bằng MediaRecorder. Trả về các action: start, stop,
// cancel, và trạng thái recording/elapsed/error. MediaRecorder không hỗ trợ
// hoặc quyền mic bị từ chối → đặt supported=false / error để UI hiển thị.
export function useAudioRecorder() {
  const [supported] = useState(() => {
    return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined'
  })
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      recorderRef.current = null
    }
  }, [])

  const start = useCallback(async () => {
    if (!supported) {
      setError('voiceUnsupported')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg')
          ? 'audio/ogg'
          : ''
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorderRef.current = recorder
      startTimeRef.current = Date.now()
      setElapsed(0)
      setError(null)
      recorder.start()
      setRecording(true)
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 250)
    } catch {
      setError('voicePermissionDenied')
      setRecording(false)
    }
  }, [supported])

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
    setRecording(false)
    setElapsed(0)
  }, [])

  const stop = useCallback((): Promise<VoiceRecording | null> => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return Promise.resolve(null)
    return new Promise<VoiceRecording | null>((resolve) => {
      recorder.onstop = () => {
        const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000))
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        cleanup()
        resolve({ blob, url, duration })
      }
      recorder.stop()
    })
  }, [cleanup])

  const cancel = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null
      try {
        recorder.stop()
      } catch {
        /* noop */
      }
    }
    cleanup()
  }, [cleanup])

  return { supported, recording, elapsed, error, start, stop, cancel }
}
