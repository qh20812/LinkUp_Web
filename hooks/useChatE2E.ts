'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  decryptChat,
  encryptMessage as e2eEncrypt,
  ensureChatKey,
  invalidateChatKeyCache,
  wasPartnerChanged,
} from '../utils/e2ee'

export type ChatE2EStatus = 'unavailable' | 'loading' | 'legacy' | 'partner_changed' | 'ready'

export interface ChatE2E {
  status: ChatE2EStatus
  ready: boolean
  encrypt: (plain: string) => Promise<string>
  decrypt: (cipher: string) => Promise<string>
  refreshKeys: () => Promise<ChatE2EStatus>
}

interface UseChatE2EOptions {
  chatId: string | null
  partnerUserId: string | null
  myUserId: string
}

export function useChatE2E({
  chatId,
  partnerUserId,
  myUserId,
}: UseChatE2EOptions): ChatE2E {
  const [status, setStatus] = useState<ChatE2EStatus>('unavailable')
  const chatKeyRef = useRef<string | null>(null)
  const prevChatRef = useRef<string | null>(null)

  useEffect(() => {
    if (prevChatRef.current === chatId) return
    prevChatRef.current = chatId
    chatKeyRef.current = null
    if (!chatId || !partnerUserId || !myUserId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('unavailable')
      return
    }

    let cancelled = false
    setStatus('loading')

    const run = async () => {
      try {
        const key = await ensureChatKey({ chatId, myUserId, partnerUserId })
        if (key) {
          chatKeyRef.current = key
          if (!cancelled) setStatus('ready')
        } else if (wasPartnerChanged(chatId)) {
          // Đối phương đổi identity/thiết bị, mình không giữ khóa chuẩn →
          // không thể tự re-key; cảnh báo thay vì âm thầm legacy.
          if (!cancelled) setStatus('partner_changed')
        } else {
          // Đối phương chưa đăng ký public key → chat fallback legacy.
          if (!cancelled) setStatus('legacy')
        }
      } catch {
        if (!cancelled) setStatus('legacy')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [chatId, partnerUserId, myUserId])

  const encrypt = useCallback(
    async (plain: string): Promise<string> => {
      const key = chatKeyRef.current
      if (!key) throw new Error('e2e not ready')
      return e2eEncrypt(key, plain)
    },
    [],
  )

  const decrypt = useCallback(
    async (cipher: string): Promise<string> => {
      if (!chatId) throw new Error('e2e not ready')
      // Thử khóa chuẩn (server) rồi các khóa fallback để tin cũ của mình (mã
      // hóa bằng khóa phân kỳ trước khi adopt) vẫn giải mã được.
      return decryptChat(chatId, cipher)
    },
    [chatId],
  )

  // Chạy lại ensureChatKey bất chấp prevChat guard — dùng khi live decrypt
  // thất bại (đối phương vừa setup key sau mình) hoặc khi nhận event
  // chat:e2e_key_updated. Xóa cache trước để đọc lại khóa mới từ server.
  const refreshKeys = useCallback(async (): Promise<ChatE2EStatus> => {
    if (!chatId || !partnerUserId || !myUserId) return 'unavailable'
    invalidateChatKeyCache(chatId)
    setStatus('loading')
    try {
      const key = await ensureChatKey({ chatId, myUserId, partnerUserId })
      if (key) {
        chatKeyRef.current = key
        setStatus('ready')
        return 'ready'
      }
      if (wasPartnerChanged(chatId)) {
        setStatus('partner_changed')
        return 'partner_changed'
      }
      setStatus('legacy')
      return 'legacy'
    } catch {
      setStatus('legacy')
      return 'legacy'
    }
  }, [chatId, partnerUserId, myUserId])

  return useMemo(
    () => ({ status, ready: status === 'ready', encrypt, decrypt, refreshKeys }),
    [status, encrypt, decrypt, refreshKeys],
  )
}