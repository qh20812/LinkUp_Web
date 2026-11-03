'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { waitForToken } from '../utils/wsAuth'

export type CallSocketStatus = 'connecting' | 'open' | 'closed'

type EventHandler = (payload: unknown) => void

export interface CallSocket {
  status: CallSocketStatus
  send: (type: string, payload?: unknown) => boolean
  subscribe: (type: string, handler: EventHandler) => () => void
  connect: () => void
  close: () => void
}

export function useCallSocket(): CallSocket {
  const [status, setStatus] = useState<CallSocketStatus>('connecting')

  const wsRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map())
  const reconnectDelayRef = useRef(1000)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxReconnectDelay = 30000
  const closedByUserRef = useRef(false)

  const clearReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const subscribe = useCallback((type: string, handler: EventHandler) => {
    let set = handlersRef.current.get(type)
    if (!set) {
      set = new Set()
      handlersRef.current.set(type, set)
    }
    set.add(handler)
    return () => {
      set.delete(handler)
      if (set.size === 0) handlersRef.current.delete(type)
    }
  }, [])

  const connectRef = useRef<() => void>(() => {})

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('token')
    if (!token) return

    // Timer reconnect còn treo có thể hồi sinh socket đã đóng và tạo socket
    // thứ hai cho cùng user.
    clearReconnect()

    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return

    closedByUserRef.current = false
    setStatus('connecting')

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const ws = new WebSocket(
      `${protocol}//${host}/api/calls/ws?token=${encodeURIComponent(token)}`,
    )
    wsRef.current = ws

    ws.onopen = () => {
      if (closedByUserRef.current) return
      setStatus('open')
      reconnectDelayRef.current = 1000
    }

    ws.onmessage = (event) => {
      // Server batches multiple queued messages into one frame
      // separated by '\n'. Parse each chunk independently.
      const parts = String(event.data).split('\n')
      for (const part of parts) {
        const data = part.trim()
        if (!data) continue
        try {
          const message = JSON.parse(data)
          if (!message || typeof message.type !== 'string') continue
          const payload =
            message.payload !== undefined ? message.payload : message.data
          const set = handlersRef.current.get(message.type)
          if (set) {
            for (const handler of set) {
              try {
                handler(payload)
              } catch (err) {
                console.error('Call WS handler error:', err)
              }
            }
          }
        } catch (err) {
          console.error('Error parsing call WS message:', err)
        }
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      if (closedByUserRef.current) {
        setStatus('closed')
        return
      }
      setStatus('closed')
      const delay = reconnectDelayRef.current
      reconnectDelayRef.current = Math.min(delay * 2, maxReconnectDelay)
      clearReconnect()
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null
        connectRef.current()
      }, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [clearReconnect])

  const close = useCallback(() => {
    closedByUserRef.current = true
    clearReconnect()
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setStatus('closed')
  }, [clearReconnect])

  useEffect(() => {
    connectRef.current = connect
  })

  const send = useCallback((type: string, payload?: unknown) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    ws.send(JSON.stringify({ type, payload }))
    return true
  }, [])

  useEffect(() => {
    // Chờ token thay vì chỉ thử một lần: login là điều hướng SPA nên provider
    // (root layout) không remount, thiếu bước này thì sau khi đăng nhập sẽ
    // không có socket cuộc gọi nào — người nhận không bao giờ thấy reo.
    const cancelWait = waitForToken(connect)

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (closedByUserRef.current) return
      connect()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelWait()
      document.removeEventListener('visibilitychange', handleVisibility)
      closedByUserRef.current = true
      clearReconnect()
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect, clearReconnect])

  return { status, send, subscribe, connect, close }
}