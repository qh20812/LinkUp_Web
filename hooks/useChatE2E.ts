'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  decryptMessage as e2eDecrypt,
  deriveChatKey,
  encryptMessage as e2eEncrypt,
  generateChatKeyBase64,
  getOrCreateIdentity,
  unwrapChatKey,
  wrapChatKey,
} from '../utils/e2ee'
import { getChatKey as getStoredChatKey, setChatKey as persistChatKey } from '../utils/idb'
import {
  getChatKey as getRemoteChatKey,
  getUserKey,
  registerUserKey,
  storeChatKeys,
} from '../api/e2e'

export type ChatE2EStatus = 'unavailable' | 'loading' | 'legacy' | 'ready'

export interface ChatE2E {
  status: ChatE2EStatus
  ready: boolean
  encrypt: (plain: string) => Promise<string>
  decrypt: (cipher: string) => Promise<string>
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
        const identity = await getOrCreateIdentity(myUserId)
        await registerUserKey(identity.publicKey)

        // 1. Khóa đã lưu trên máy thì dùng luôn.
        const localKey = await getStoredChatKey(chatId)
        if (localKey) {
          chatKeyRef.current = localKey
          if (!cancelled) setStatus('ready')
          return
        }

        // 2. Lấy public key của partner. Không có → fallback legacy (server mã hóa).
        let partnerPub: string
        try {
          const res = await getUserKey(partnerUserId)
          partnerPub = res.public_key
        } catch {
          if (!cancelled) setStatus('legacy')
          return
        }

        const shared = await deriveChatKey(identity.privateKey, partnerPub)

        // 3. Đã có khóa chat trên server thì lấy về giải mã.
        const remote = await getRemoteChatKey(chatId)
        if (remote?.wrapped_key) {
          const key = await unwrapChatKey(shared, remote.wrapped_key, remote.nonce)
          await persistChatKey(chatId, key)
          chatKeyRef.current = key
          if (!cancelled) setStatus('ready')
          return
        }

        // 4. Chat mới chưa có khóa → sinh khóa, bọc cho cả hai rồi đăng ký.
        const chatKey = generateChatKeyBase64()
        const mine = await wrapChatKey(shared, chatKey)
        const theirs = await wrapChatKey(shared, chatKey)
        await storeChatKeys([
          { chat_id: chatId, user_id: myUserId, wrapped_key: mine.wrapped, nonce: mine.nonce },
          { chat_id: chatId, user_id: partnerUserId, wrapped_key: theirs.wrapped, nonce: theirs.nonce },
        ])

        // Reconciliation: nếu đối phương cũng vừa tạo khóa (đăng ký sau mình),
        // server đã giữ khóa của họ → ưu tiên khóa trên server để hai bên khớp.
        const afterPost = await getRemoteChatKey(chatId)
        const finalKey =
          (afterPost?.wrapped_key &&
            (await unwrapChatKey(shared, afterPost.wrapped_key, afterPost.nonce))) ||
          chatKey
        await persistChatKey(chatId, finalKey)
        chatKeyRef.current = finalKey
        if (!cancelled) setStatus('ready')
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
      const key = chatKeyRef.current
      if (!key) throw new Error('e2e not ready')
      return e2eDecrypt(key, cipher)
    },
    [],
  )

  return useMemo(
    () => ({ status, ready: status === 'ready', encrypt, decrypt }),
    [status, encrypt, decrypt],
  )
}