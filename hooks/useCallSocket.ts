'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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
  const maxReconnectDelay = 30000
  const closedByUserRef = useRef(false)

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
      setTimeout(() => connectRef.current(), delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [])

  const close = useCallback(() => {
    closedByUserRef.current = true
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setStatus('closed')
  }, [])

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
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      connect()
    }
    return () => {
      closedByUserRef.current = true
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  return { status, send, subscribe, connect, close }
}