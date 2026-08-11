'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type ChatSocketStatus = 'connecting' | 'open' | 'closed'

type EventHandler = (payload: unknown) => void

export interface ChatSocket {
  status: ChatSocketStatus
  send: (type: string, payload?: unknown) => void
  subscribe: (type: string, handler: EventHandler) => () => void
  connect: () => void
  close: () => void
}

export function useChatSocket(): ChatSocket {
  const [status, setStatus] = useState<ChatSocketStatus>('connecting')

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
      `${protocol}//${host}/api/chats/ws?token=${encodeURIComponent(token)}`,
    )
    wsRef.current = ws

    ws.onopen = () => {
      if (closedByUserRef.current) return
      setStatus('open')
      reconnectDelayRef.current = 1000
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (!message || typeof message.type !== 'string') return
        const set = handlersRef.current.get(message.type)
        if (set) {
          for (const handler of set) {
            try {
              handler(message.payload)
            } catch (err) {
              console.error('Chat WS handler error:', err)
            }
          }
        }
      } catch (err) {
        console.error('Error parsing chat WS message:', err)
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
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type, payload }))
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
