'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type VoiceRecording = {
  id: string
  blob: Blob
  url: string
  duration: number
}

/** Live monitor bars while recording (fixed count, floor = silence). */
export const REC_BAR_COUNT = 56
const REC_FLOOR = 0.08
const REC_TICK_MS = 120

// Ghi âm tin nhắn thoại bằng MediaRecorder. Trả về các action: start, stop,
// cancel, trạng thái recording/elapsed/error và sóng levels live (AnalyserNode)
// để UI vẽ waveform theo âm lượng thật. MediaRecorder không hỗ trợ
// hoặc quyền mic bị từ chối → đặt supported=false / error để UI hiển thị.
export function useAudioRecorder() {
  const [supported] = useState(() => {
    return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined'
  })
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [levels, setLevels] = useState<number[]>(() => Array(REC_BAR_COUNT).fill(REC_FLOOR))
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef(0)
  const lastTickRef = useRef(0)

  const stopMonitor = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    analyserRef.current?.disconnect()
    analyserRef.current = null
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      stopMonitor()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      recorderRef.current = null
    }
  }, [stopMonitor])

  // Live RMS buckets from the mic stream — throttled to REC_TICK_MS so the
  // recording UI re-renders ~8fps instead of every animation frame. Skipped
  // entirely under prefers-reduced-motion (frozen floor bars).
  const startMonitor = useCallback((stream: MediaStream) => {
    if (typeof window === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    try {
      const Ctx: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      src.connect(analyser)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
      const buf = new Uint8Array(analyser.fftSize)
      lastTickRef.current = 0
      const loop = (now: number) => {
        rafRef.current = requestAnimationFrame(loop)
        if (now - lastTickRef.current < REC_TICK_MS) return
        lastTickRef.current = now
        analyser.getByteTimeDomainData(buf)
        const per = Math.floor(buf.length / REC_BAR_COUNT)
        const next: number[] = []
        for (let i = 0; i < REC_BAR_COUNT; i++) {
          let sum = 0
          const start = i * per
          for (let j = start; j < start + per; j++) {
            const v = (buf[j] - 128) / 128
            sum += v * v
          }
          next.push(Math.max(REC_FLOOR, Math.sqrt(sum / Math.max(1, per))))
        }
        setLevels(next)
      }
      rafRef.current = requestAnimationFrame(loop)
    } catch {
      /* monitor is decorative — recording works without it */
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
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
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
      setLevels(Array(REC_BAR_COUNT).fill(REC_FLOOR))
      recorder.start()
      setRecording(true)
      startMonitor(stream)
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 250)
    } catch {
      setError('voicePermissionDenied')
      setRecording(false)
    }
  }, [supported, startMonitor])

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    stopMonitor()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
    setRecording(false)
    setElapsed(0)
    setLevels(Array(REC_BAR_COUNT).fill(REC_FLOOR))
  }, [stopMonitor])

  const stop = useCallback((): Promise<VoiceRecording | null> => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return Promise.resolve(null)
    return new Promise<VoiceRecording | null>((resolve) => {
      recorder.onstop = () => {
        const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000))
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        const id = `${Date.now()}-${blob.size}`
        cleanup()
        resolve({ id, blob, url, duration })
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

  return { supported, recording, elapsed, levels, error, start, stop, cancel }
}
