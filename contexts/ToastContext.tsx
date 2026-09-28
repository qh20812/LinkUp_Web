'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import ToastContainer, { type ToastMessage } from '../components/Toast'

export type { ToastAction } from '../components/Toast'

export type ToastInput = Omit<ToastMessage, 'id' | 'exiting'>

interface ToastContextType {
  toast: (options: ToastInput) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const MAX_VISIBLE = 3
const EXIT_DURATION = 200

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const toastsRef = useRef<ToastMessage[]>([])
  const removalTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const commit = useCallback((next: ToastMessage[]) => {
    toastsRef.current = next
    setToasts(next)
  }, [])

  const schedulePurge = useCallback(
    (id: string) => {
      if (removalTimers.current.has(id)) return
      const timer = setTimeout(() => {
        removalTimers.current.delete(id)
        commit(toastsRef.current.filter((t) => t.id !== id))
      }, EXIT_DURATION)
      removalTimers.current.set(id, timer)
    },
    [commit]
  )

  const dismiss = useCallback(
    (id: string) => {
      const target = toastsRef.current.find((t) => t.id === id)
      if (!target || target.exiting) return
      commit(
        toastsRef.current.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      )
      schedulePurge(id)
    },
    [commit, schedulePurge]
  )

  const toast = useCallback(
    (options: ToastInput) => {
      const id = generateId()
      let next = toastsRef.current

      const duplicate = next.find(
        (t) => !t.exiting && t.type === options.type && t.title === options.title
      )
      if (duplicate) {
        const timer = removalTimers.current.get(duplicate.id)
        if (timer) {
          clearTimeout(timer)
          removalTimers.current.delete(duplicate.id)
        }
        next = next.filter((t) => t.id !== duplicate.id)
      }

      next = [...next, { ...options, id, exiting: false }]

      const active = next.filter((t) => !t.exiting)
      if (active.length > MAX_VISIBLE) {
        const oldest = active[0]
        next = next.map((t) =>
          t.id === oldest.id ? { ...t, exiting: true } : t
        )
        schedulePurge(oldest.id)
      }

      commit(next)
    },
    [commit, schedulePurge]
  )

  useEffect(() => {
    const timers = removalTimers.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
